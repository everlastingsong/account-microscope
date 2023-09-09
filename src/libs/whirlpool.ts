import { PublicKey, AccountInfo } from "@solana/web3.js";
import { ParsableWhirlpool, PriceMath, WhirlpoolData, AccountFetcher, TickArrayData, PoolUtil, TICK_ARRAY_SIZE, TickUtil, MIN_TICK_INDEX, MAX_TICK_INDEX, PDAUtil, PositionData, ParsablePosition, collectFeesQuote, TickArrayUtil, collectRewardsQuote, TokenAmounts, CollectFeesQuote, CollectRewardsQuote, WhirlpoolsConfigData, FeeTierData, ParsableWhirlpoolsConfig, ParsableFeeTier, ParsableTickArray, TickData, PositionBundleData, ParsablePositionBundle, PositionBundleUtil, POSITION_BUNDLE_SIZE } from "@orca-so/whirlpools-sdk";
import { PositionUtil, PositionStatus } from "@orca-so/whirlpools-sdk/dist/utils/position-util";
import { Address, BN } from "@coral-xyz/anchor";
import { getAmountDeltaA, getAmountDeltaB } from "@orca-so/whirlpools-sdk/dist/utils/math/token-math";
import { AddressUtil, DecimalUtil } from "@orca-so/common-sdk";
import { u64 } from "@solana/spl-token";
import { AccountMetaInfo, bn2u64, getAccountInfo, toFixedDecimal, toMeta } from "./account";
import { getConnection } from "./client";
import { getTokenList, TokenInfo } from "./orcaapi";
import Decimal from "decimal.js";
import moment from "moment";

const NEIGHBORING_TICK_ARRAY_NUM = 7
const ISOTOPE_TICK_SPACINGS = [1, 2, 4, 8, 16, 32, 64, 128, 256];

export const ACCOUNT_DEFINITION = {
  Whirlpool: "https://github.com/orca-so/whirlpools/blob/main/programs/whirlpool/src/state/whirlpool.rs#L14",
  Position: "https://github.com/orca-so/whirlpools/blob/main/programs/whirlpool/src/state/position.rs#L20",
  WhirlpoolsConfig: "https://github.com/orca-so/whirlpools/blob/main/programs/whirlpool/src/state/config.rs#L6",
  FeeTier: "https://github.com/orca-so/whirlpools/blob/main/programs/whirlpool/src/state/fee_tier.rs#L12",
  TickArray: "https://github.com/orca-so/whirlpools/blob/main/programs/whirlpool/src/state/tick.rs#L143",
  PositionBundle: "https://github.com/orca-so/whirlpools/blob/main/programs/whirlpool/src/state/position_bundle.rs#L9",
}

type NeighboringTickArray = {
  pubkey: PublicKey,
  startTickIndex: number,
  startPrice: Decimal,
  isInitialized: boolean,
  hasTickCurrentIndex: boolean,
}

type IsotopeWhirlpool = {
  pubkey: PublicKey,
  tickSpacing: number,
  feeRate: Decimal,
  tickCurrentIndex: number,
  price: Decimal,
  liquidity: BN,
}

type WhirlpoolDerivedInfo = {
  price: Decimal,
  invertedPrice: Decimal,
  feeRate: Decimal,
  protocolFeeRate: Decimal,
  decimalsA: number,
  decimalsB: number,
  decimalsR0?: number,
  decimalsR1?: number,
  decimalsR2?: number,
  tokenInfoA?: TokenInfo,
  tokenInfoB?: TokenInfo,
  tokenInfoR0?: TokenInfo,
  tokenInfoR1?: TokenInfo,
  tokenInfoR2?: TokenInfo,
  tokenVaultAAmount: Decimal,
  tokenVaultBAmount: Decimal,
  tokenVaultR0Amount?: Decimal,
  tokenVaultR1Amount?: Decimal,
  tokenVaultR2Amount?: Decimal,
  reward0WeeklyEmission?: Decimal,
  reward1WeeklyEmission?: Decimal,
  reward2WeeklyEmission?: Decimal,
  rewardLastUpdatedTimestamp: moment.Moment,
  neighboringTickArrays: NeighboringTickArray[],
  isotopeWhirlpools: IsotopeWhirlpool[],
  oracle: PublicKey,
  tradableAmounts: TradableAmounts,
  tickArrayTradableAmounts: TickArrayTradableAmounts,
}

export type WhirlpoolInfo = {
  meta: AccountMetaInfo,
  parsed: WhirlpoolData,
  derived: WhirlpoolDerivedInfo,
}

export async function getWhirlpoolInfo(addr: Address): Promise<WhirlpoolInfo> {
  const pubkey = AddressUtil.toPubKey(addr);
  const connection = getConnection();
  const fetcher = new AccountFetcher(connection);

  const { accountInfo, slotContext } = await getAccountInfo(connection, pubkey);
  const whirlpoolData = ParsableWhirlpool.parse(accountInfo.data);

  // get mints
  const mintPubkeys = [];
  mintPubkeys.push(whirlpoolData.tokenMintA);
  mintPubkeys.push(whirlpoolData.tokenMintB);
  mintPubkeys.push(whirlpoolData.rewardInfos[0].mint);
  mintPubkeys.push(whirlpoolData.rewardInfos[1].mint);
  mintPubkeys.push(whirlpoolData.rewardInfos[2].mint);
  const mints = await fetcher.listMintInfos(mintPubkeys, true);
  const decimalsA = mints[0].decimals;
  const decimalsB = mints[1].decimals;
  const decimalsR0 = mints[2]?.decimals;
  const decimalsR1 = mints[3]?.decimals;
  const decimalsR2 = mints[4]?.decimals;

  // get vaults
  const vaultPubkeys = [];
  vaultPubkeys.push(whirlpoolData.tokenVaultA);
  vaultPubkeys.push(whirlpoolData.tokenVaultB);
  vaultPubkeys.push(whirlpoolData.rewardInfos[0].vault);
  vaultPubkeys.push(whirlpoolData.rewardInfos[1].vault);
  vaultPubkeys.push(whirlpoolData.rewardInfos[2].vault);
  const vaults = await fetcher.listTokenInfos(vaultPubkeys, true);

  // get token name
  const tokenList = await getTokenList();
  const tokenInfoA = tokenList.getTokenInfoByMint(mintPubkeys[0]);
  const tokenInfoB = tokenList.getTokenInfoByMint(mintPubkeys[1]);
  const tokenInfoR0 = tokenList.getTokenInfoByMint(mintPubkeys[2]);
  const tokenInfoR1 = tokenList.getTokenInfoByMint(mintPubkeys[3]);
  const tokenInfoR2 = tokenList.getTokenInfoByMint(mintPubkeys[4]);

  // get neighboring tickarrays
  const ticksInArray = whirlpoolData.tickSpacing * TICK_ARRAY_SIZE;
  const currentStartTickIndex = TickUtil.getStartTickIndex(whirlpoolData.tickCurrentIndex, whirlpoolData.tickSpacing);
  const tickArrayStartIndexes = [];
  const tickArrayPubkeys = [];
  for (let offset=-NEIGHBORING_TICK_ARRAY_NUM; offset <= NEIGHBORING_TICK_ARRAY_NUM; offset++) {
    const startTickIndex = TickUtil.getStartTickIndex(whirlpoolData.tickCurrentIndex, whirlpoolData.tickSpacing, offset);
    if ( startTickIndex+ticksInArray <= MIN_TICK_INDEX ) continue;
    if ( startTickIndex > MAX_TICK_INDEX ) continue;
    tickArrayStartIndexes.push(startTickIndex);
    tickArrayPubkeys.push(PDAUtil.getTickArray(accountInfo.owner, pubkey, startTickIndex).publicKey);
  }
  const tickArrays = await fetcher.listTickArrays(tickArrayPubkeys, true);
  const neighboringTickArrays: NeighboringTickArray[] = [];
  tickArrayStartIndexes.forEach((startTickIndex, i) => {
    neighboringTickArrays.push({
      pubkey: tickArrayPubkeys[i],
      startTickIndex,
      startPrice: toFixedDecimal(PriceMath.tickIndexToPrice(startTickIndex, decimalsA, decimalsB), decimalsB),
      isInitialized: !!tickArrays[i],
      hasTickCurrentIndex: startTickIndex === currentStartTickIndex,
    });
  })

  // get isotope whirlpools
  const whirlpoolPubkeys = [];
  ISOTOPE_TICK_SPACINGS.forEach((tickSpacing) => {
    whirlpoolPubkeys.push(
      PDAUtil.getWhirlpool(
        accountInfo.owner,
        whirlpoolData.whirlpoolsConfig,
        whirlpoolData.tokenMintA,
        whirlpoolData.tokenMintB,
        tickSpacing,
      ).publicKey
    );
  });
  const whirlpools = await fetcher.listPools(whirlpoolPubkeys, true);
  const isotopeWhirlpools: IsotopeWhirlpool[] = [];
  ISOTOPE_TICK_SPACINGS.forEach((tickSpacing, i) => {
    if (whirlpools[i]) {
      isotopeWhirlpools.push({
        tickSpacing,
        feeRate: PoolUtil.getFeeRate(whirlpools[i].feeRate).toDecimal().mul(100),
        pubkey: whirlpoolPubkeys[i],
        tickCurrentIndex: whirlpools[i].tickCurrentIndex,
        price: toFixedDecimal(PriceMath.sqrtPriceX64ToPrice(whirlpools[i].sqrtPrice, decimalsA, decimalsB), decimalsB),
        liquidity: whirlpools[i].liquidity,
      });
    }
  });

  // get oracle
  const oracle = PDAUtil.getOracle(accountInfo.owner, pubkey).publicKey;

  let tradableAmounts: TradableAmounts = { downward: [], upward: [], error: true };
  try {
    const calculated = listTradableAmounts(
      whirlpoolData,
      tickArrays,
      decimalsA,
      decimalsB,
    );
    tradableAmounts = calculated;
  }
  catch ( e ) {console.log(e);}

  let tickArrayTradableAmounts: TickArrayTradableAmounts = { downward: [], upward: [], error: true };
  try {
    const calculated = listTickArrayTradableAmounts(
      whirlpoolData,
      tickArrayStartIndexes,
      tickArrayPubkeys,
      tickArrays,
      decimalsA,
      decimalsB,
    );
    tickArrayTradableAmounts = calculated;
  }
  catch ( e ) {console.log(e);}

  return {
    meta: toMeta(pubkey, accountInfo, slotContext),
    parsed: whirlpoolData,
    derived: {
      price: toFixedDecimal(PriceMath.sqrtPriceX64ToPrice(whirlpoolData.sqrtPrice, decimalsA, decimalsB), decimalsB),
      invertedPrice: toFixedDecimal(new Decimal(1).div(PriceMath.sqrtPriceX64ToPrice(whirlpoolData.sqrtPrice, decimalsA, decimalsB)), decimalsA),
      feeRate: PoolUtil.getFeeRate(whirlpoolData.feeRate).toDecimal().mul(100),
      protocolFeeRate: PoolUtil.getProtocolFeeRate(whirlpoolData.protocolFeeRate).toDecimal().mul(100),
      decimalsA,
      decimalsB,
      decimalsR0,
      decimalsR1,
      decimalsR2,
      tokenInfoA,
      tokenInfoB,
      tokenInfoR0,
      tokenInfoR1,
      tokenInfoR2,
      tokenVaultAAmount: DecimalUtil.fromU64(vaults[0].amount, decimalsA),
      tokenVaultBAmount: DecimalUtil.fromU64(vaults[1].amount, decimalsB),
      tokenVaultR0Amount: decimalsR0 === undefined ? undefined : DecimalUtil.fromU64(vaults[2].amount, decimalsR0),
      tokenVaultR1Amount: decimalsR1 === undefined ? undefined : DecimalUtil.fromU64(vaults[3].amount, decimalsR1),
      tokenVaultR2Amount: decimalsR2 === undefined ? undefined : DecimalUtil.fromU64(vaults[4].amount, decimalsR2),
      reward0WeeklyEmission: decimalsR0 === undefined ? undefined : DecimalUtil.fromU64(bn2u64(whirlpoolData.rewardInfos[0].emissionsPerSecondX64.muln(60*60*24*7).shrn(64)), decimalsR0),
      reward1WeeklyEmission: decimalsR1 === undefined ? undefined : DecimalUtil.fromU64(bn2u64(whirlpoolData.rewardInfos[1].emissionsPerSecondX64.muln(60*60*24*7).shrn(64)), decimalsR1),
      reward2WeeklyEmission: decimalsR2 === undefined ? undefined : DecimalUtil.fromU64(bn2u64(whirlpoolData.rewardInfos[2].emissionsPerSecondX64.muln(60*60*24*7).shrn(64)), decimalsR2),
      rewardLastUpdatedTimestamp: moment.unix(whirlpoolData.rewardLastUpdatedTimestamp.toNumber()),
      neighboringTickArrays,
      isotopeWhirlpools,
      oracle,
      tradableAmounts,
      tickArrayTradableAmounts,
    }
  };
}

type PositionDerivedInfo = {
  priceLower: Decimal,
  priceUpper: Decimal,
  invertedPriceLower: Decimal,
  invertedPriceUpper: Decimal,
  amounts: TokenAmounts,
  amountA: Decimal,
  amountB: Decimal,
  decimalsA: number,
  decimalsB: number,
  decimalsR0?: number,
  decimalsR1?: number,
  decimalsR2?: number,
  tokenMintA: PublicKey,
  tokenMintB: PublicKey,
  tokenMintR0: PublicKey,
  tokenMintR1: PublicKey,
  tokenMintR2: PublicKey,
  tokenInfoA?: TokenInfo,
  tokenInfoB?: TokenInfo,
  tokenInfoR0?: TokenInfo,
  tokenInfoR1?: TokenInfo,
  tokenInfoR2?: TokenInfo,
  feeQuote: CollectFeesQuote,
  feeAmountA: Decimal,
  feeAmountB: Decimal,
  rewardsQuote: CollectRewardsQuote,
  rewardAmount0?: Decimal,
  rewardAmount1?: Decimal,
  rewardAmount2?: Decimal,
  status: string,
  sharePercentOfLiquidity: Decimal,
  tickCurrentIndex: number,
  currentSqrtPrice: BN,
  currentPrice: Decimal,
  poolLiquidity: BN,
  poolTickSpacing: number;
  lowerTickArray: PublicKey,
  upperTickArray: PublicKey,
  isBundledPosition: boolean,
  isFullRange: boolean,
  positionBundle?: PublicKey,
}

export type PositionInfo = {
  meta: AccountMetaInfo,
  parsed: PositionData,
  derived: PositionDerivedInfo,
}

export async function getPositionInfo(addr: Address): Promise<PositionInfo> {
  const pubkey = AddressUtil.toPubKey(addr);
  const connection = getConnection();
  const fetcher = new AccountFetcher(connection);

  const { accountInfo, slotContext } = await getAccountInfo(connection, pubkey);
  const positionData = ParsablePosition.parse(accountInfo.data);

  // get whirlpool
  const whirlpoolData = await fetcher.getPool(positionData.whirlpool, true);

  // get status & share
  const status = PositionUtil.getPositionStatus(whirlpoolData.tickCurrentIndex, positionData.tickLowerIndex, positionData.tickUpperIndex);
  let sharePercentOfLiquidity = new Decimal(0);
  if (status === PositionStatus.InRange && !positionData.liquidity.isZero()) {
    sharePercentOfLiquidity = toFixedDecimal(new Decimal(positionData.liquidity.toString()).div(whirlpoolData.liquidity.toString()).mul(100), 9);
  }

  // get mints
  const mintPubkeys = [];
  mintPubkeys.push(whirlpoolData.tokenMintA);
  mintPubkeys.push(whirlpoolData.tokenMintB);
  mintPubkeys.push(whirlpoolData.rewardInfos[0].mint);
  mintPubkeys.push(whirlpoolData.rewardInfos[1].mint);
  mintPubkeys.push(whirlpoolData.rewardInfos[2].mint);
  const mints = await fetcher.listMintInfos(mintPubkeys, true);
  const decimalsA = mints[0].decimals;
  const decimalsB = mints[1].decimals;
  const decimalsR0 = mints[2]?.decimals;
  const decimalsR1 = mints[3]?.decimals;
  const decimalsR2 = mints[4]?.decimals;

  const priceLower = toFixedDecimal(PriceMath.tickIndexToPrice(positionData.tickLowerIndex, decimalsA, decimalsB), decimalsB);
  const priceUpper = toFixedDecimal(PriceMath.tickIndexToPrice(positionData.tickUpperIndex, decimalsA, decimalsB), decimalsB);
  const invertedPriceLower = toFixedDecimal(new Decimal(1).div(PriceMath.tickIndexToPrice(positionData.tickUpperIndex, decimalsA, decimalsB)), decimalsA);
  const invertedPriceUpper = toFixedDecimal(new Decimal(1).div(PriceMath.tickIndexToPrice(positionData.tickLowerIndex, decimalsA, decimalsB)), decimalsA);

  const amounts = PoolUtil.getTokenAmountsFromLiquidity(
    positionData.liquidity,
    whirlpoolData.sqrtPrice,
    PriceMath.tickIndexToSqrtPriceX64(positionData.tickLowerIndex),
    PriceMath.tickIndexToSqrtPriceX64(positionData.tickUpperIndex),
    false,
  );

  // get tickarray
  const tickArrayPubkeys = [];
  tickArrayPubkeys.push(PDAUtil.getTickArray(accountInfo.owner, positionData.whirlpool, TickUtil.getStartTickIndex(positionData.tickLowerIndex, whirlpoolData.tickSpacing)).publicKey);
  tickArrayPubkeys.push(PDAUtil.getTickArray(accountInfo.owner, positionData.whirlpool, TickUtil.getStartTickIndex(positionData.tickUpperIndex, whirlpoolData.tickSpacing)).publicKey);
  const tickArrays = await fetcher.listTickArrays(tickArrayPubkeys, true);
  const tickLower = TickArrayUtil.getTickFromArray(tickArrays[0], positionData.tickLowerIndex, whirlpoolData.tickSpacing);
  const tickUpper = TickArrayUtil.getTickFromArray(tickArrays[1], positionData.tickUpperIndex, whirlpoolData.tickSpacing);

  const feeQuote = collectFeesQuote({
    position: positionData,
    tickLower,
    tickUpper,
    whirlpool: whirlpoolData,
  });

  const rewardsQuote = collectRewardsQuote({
    position: positionData,
    tickLower,
    tickUpper,
    whirlpool: whirlpoolData,
  });

  // get token name
  const tokenList = await getTokenList();
  const tokenInfoA = tokenList.getTokenInfoByMint(mintPubkeys[0]);
  const tokenInfoB = tokenList.getTokenInfoByMint(mintPubkeys[1]);
  const tokenInfoR0 = tokenList.getTokenInfoByMint(mintPubkeys[2]);
  const tokenInfoR1 = tokenList.getTokenInfoByMint(mintPubkeys[3]);
  const tokenInfoR2 = tokenList.getTokenInfoByMint(mintPubkeys[4]);

  // check if bundled position
  const derivedPositionAddress = PDAUtil.getPosition(accountInfo.owner, positionData.positionMint).publicKey;
  const derivedPositionBundleAddress = PDAUtil.getPositionBundle(accountInfo.owner, positionData.positionMint).publicKey;
  const isBundledPosition = !derivedPositionAddress.equals(pubkey);

  // check if full range
  const minTickIndex = Math.ceil(MIN_TICK_INDEX / whirlpoolData.tickSpacing) * whirlpoolData.tickSpacing;
  const maxTickIndex = Math.floor(MAX_TICK_INDEX / whirlpoolData.tickSpacing) * whirlpoolData.tickSpacing;
  const isFullRange = positionData.tickLowerIndex === minTickIndex && positionData.tickUpperIndex === maxTickIndex;

  return {
    meta: toMeta(pubkey, accountInfo, slotContext),
    parsed: positionData,
    derived: {
      priceLower,
      priceUpper,
      invertedPriceLower,
      invertedPriceUpper,
      amounts,
      amountA: DecimalUtil.fromU64(amounts.tokenA, decimalsA),
      amountB: DecimalUtil.fromU64(amounts.tokenB, decimalsB),
      decimalsA,
      decimalsB,
      decimalsR0,
      decimalsR1,
      decimalsR2,
      tokenMintA: whirlpoolData.tokenMintA,
      tokenMintB: whirlpoolData.tokenMintB,
      tokenMintR0: whirlpoolData.rewardInfos[0].mint,
      tokenMintR1: whirlpoolData.rewardInfos[1].mint,
      tokenMintR2: whirlpoolData.rewardInfos[2].mint,
      tokenInfoA,
      tokenInfoB,
      tokenInfoR0,
      tokenInfoR1,
      tokenInfoR2,
      feeQuote,
      feeAmountA: DecimalUtil.fromU64(feeQuote.feeOwedA, decimalsA),
      feeAmountB: DecimalUtil.fromU64(feeQuote.feeOwedB, decimalsB),
      rewardsQuote,
      rewardAmount0: rewardsQuote[0] === undefined ? undefined : DecimalUtil.fromU64(rewardsQuote[0], decimalsR0),
      rewardAmount1: rewardsQuote[1] === undefined ? undefined : DecimalUtil.fromU64(rewardsQuote[1], decimalsR1),
      rewardAmount2: rewardsQuote[2] === undefined ? undefined : DecimalUtil.fromU64(rewardsQuote[2], decimalsR2),
      status: status === PositionStatus.InRange ? "Price is In Range" : (status === PositionStatus.AboveRange ? "Price is Above Range" : "Price is Below Range"),
      sharePercentOfLiquidity,
      tickCurrentIndex: whirlpoolData.tickCurrentIndex,
      currentSqrtPrice: whirlpoolData.sqrtPrice,
      currentPrice: toFixedDecimal(PriceMath.sqrtPriceX64ToPrice(whirlpoolData.sqrtPrice, decimalsA, decimalsB), decimalsB),
      poolLiquidity: whirlpoolData.liquidity,
      poolTickSpacing: whirlpoolData.tickSpacing,
      lowerTickArray: tickArrayPubkeys[0],
      upperTickArray: tickArrayPubkeys[1],
      isBundledPosition,
      isFullRange,
      positionBundle: isBundledPosition ? derivedPositionBundleAddress : undefined,
    }
  };
}

type InitializedFeeTier = {
  isInitialized: boolean,
  tickSpacing: number,
  defaultFeeRate: Decimal,
  pubkey: PublicKey,
}

type WhirlpoolsConfigDerivedInfo = {
  defaultProtocolFeeRate: Decimal,
  feeTiers: InitializedFeeTier[],
}

type WhirlpoolsConfigInfo = {
  meta: AccountMetaInfo,
  parsed: WhirlpoolsConfigData,
  derived: WhirlpoolsConfigDerivedInfo,
}

export async function getWhirlpoolsConfigInfo(addr: Address): Promise<WhirlpoolsConfigInfo> {
  const pubkey = AddressUtil.toPubKey(addr);
  const connection = getConnection();

  const { accountInfo, slotContext } = await getAccountInfo(connection, pubkey);
  const whirlpoolsConfigData = ParsableWhirlpoolsConfig.parse(accountInfo.data);

  const feeTierPubkeys = [];
  for (let tickSpacing=1; tickSpacing < 2**16; tickSpacing *= 2) {
    feeTierPubkeys.push(PDAUtil.getFeeTier(accountInfo.owner, pubkey, tickSpacing).publicKey);
  }
  const accountInfos = await connection.getMultipleAccountsInfo(feeTierPubkeys);
  const feeTiers: InitializedFeeTier[] = [];
  accountInfos.forEach((a, i) => {
    const feeTier = ParsableFeeTier.parse(a?.data);
    feeTiers.push({
      pubkey: feeTierPubkeys[i],
      tickSpacing: 2**i,
      isInitialized: feeTier !== null,
      defaultFeeRate: feeTier === null ? undefined : PoolUtil.getFeeRate(feeTier.defaultFeeRate).toDecimal().mul(100),
    });
  });

  return {
    meta: toMeta(pubkey, accountInfo, slotContext),
    parsed: whirlpoolsConfigData,
    derived: {
      defaultProtocolFeeRate: PoolUtil.getProtocolFeeRate(whirlpoolsConfigData.defaultProtocolFeeRate).toDecimal().mul(100),
      feeTiers,
    }
  };
}

type FeeTierDerivedInfo = {
  defaultFeeRate: Decimal,
}

type FeeTierInfo = {
  meta: AccountMetaInfo,
  parsed: FeeTierData,
  derived: FeeTierDerivedInfo,
}

export async function getFeeTierInfo(addr: Address): Promise<FeeTierInfo> {
  const pubkey = AddressUtil.toPubKey(addr);
  const connection = getConnection();

  const { accountInfo, slotContext } = await getAccountInfo(connection, pubkey);
  const feeTierData = ParsableFeeTier.parse(accountInfo.data);

  return {
    meta: toMeta(pubkey, accountInfo, slotContext),
    parsed: feeTierData,
    derived: {
      defaultFeeRate: PoolUtil.getFeeRate(feeTierData.defaultFeeRate).toDecimal().mul(100),
    }
  };
}

type TickArrayDerivedInfo = {
  prevTickArray: PublicKey,
  nextTickArray: PublicKey,
  tickCurrentIndex: number,
  tickSpacing: number,
  ticksInArray: number,
}

type TickArrayInfo = {
  meta: AccountMetaInfo,
  parsed: TickArrayData,
  derived: TickArrayDerivedInfo,
}

export async function getTickArrayInfo(addr: Address): Promise<TickArrayInfo> {
  const pubkey = AddressUtil.toPubKey(addr);
  const connection = getConnection();
  const fetcher = new AccountFetcher(connection);

  const { accountInfo, slotContext } = await getAccountInfo(connection, pubkey);
  const tickArrayData = ParsableTickArray.parse(accountInfo.data);

  // get whirlpool
  const whirlpoolData = await fetcher.getPool(tickArrayData.whirlpool, true);

  const ticksInArray = whirlpoolData.tickSpacing * TICK_ARRAY_SIZE;
  const prevTickArrayPubkey = PDAUtil.getTickArray(accountInfo.owner, tickArrayData.whirlpool, tickArrayData.startTickIndex - ticksInArray).publicKey;
  const nextTickArrayPubkey = PDAUtil.getTickArray(accountInfo.owner, tickArrayData.whirlpool, tickArrayData.startTickIndex + ticksInArray).publicKey;

  return {
    meta: toMeta(pubkey, accountInfo, slotContext),
    parsed: tickArrayData,
    derived: {
      prevTickArray: prevTickArrayPubkey,
      nextTickArray: nextTickArrayPubkey,
      tickCurrentIndex: whirlpoolData.tickCurrentIndex,
      tickSpacing: whirlpoolData.tickSpacing,
      ticksInArray,
    }
  };
}

type TradableAmount = {
  tickIndex: number,
  price: Decimal,
  amountA: Decimal,
  amountB: Decimal,
}

type TradableAmounts = {
  upward: TradableAmount[],
  downward: TradableAmount[],
  error: boolean,
}

type TickArrayTradableAmount = {
  tickArrayPubkey: PublicKey,
  tickArrayStartIndex: number,
  tickArrayStartPrice: Decimal,
  tickArrayData: TickArrayData,
  amountA: Decimal,
  amountB: Decimal,
}

type TickArrayTradableAmounts = {
  upward: TickArrayTradableAmount[],
  downward: TickArrayTradableAmount[],
  error: boolean,
}

function getTick(tickIndex: number, tickSpacing: number, tickarrays: TickArrayData[]): TickData|undefined {
  const startTickIndex = TickUtil.getStartTickIndex(tickIndex, tickSpacing);
  for (const tickarray of tickarrays) {
    if (tickarray?.startTickIndex === startTickIndex)
      return TickArrayUtil.getTickFromArray(tickarray, tickIndex, tickSpacing);
  }
  return undefined;
}

function listTradableAmounts(whirlpool: WhirlpoolData, tickArrays: TickArrayData[], decimalsA: number, decimalsB: number): TradableAmounts {
  let tickIndex: number, nextTickIndex: number;
  let sqrtPrice: BN, nextSqrtPrice: BN;
  let liquidity: BN;
  let nextPrice: Decimal;
  let nextTick: TickData;

  const tickCurrentIndex = whirlpool.tickCurrentIndex;
  const tickSpacing = whirlpool.tickSpacing;
  const lowerInitializableTickIndex = Math.floor(tickCurrentIndex/tickSpacing)*tickSpacing;
  const upperInitializableTickIndex = lowerInitializableTickIndex + tickSpacing;

  // upward
  tickIndex = whirlpool.tickCurrentIndex;
  sqrtPrice = whirlpool.sqrtPrice;
  liquidity = whirlpool.liquidity;
  const upwardTradableAmount: TradableAmount[] = [];
  for (let i=0; i<10; i++) {
    nextTickIndex = upperInitializableTickIndex + i*tickSpacing;
    nextTick = getTick(nextTickIndex, tickSpacing, tickArrays);
    if ( nextTick === undefined ) nextTickIndex--;
    if ( nextTickIndex <= tickIndex ) break;

    nextSqrtPrice = PriceMath.tickIndexToSqrtPriceX64(nextTickIndex);
    nextPrice = toFixedDecimal(PriceMath.tickIndexToPrice(nextTickIndex, decimalsA, decimalsB), decimalsB);
    const deltaA = getAmountDeltaA(sqrtPrice, nextSqrtPrice, liquidity, false);
    const deltaB = getAmountDeltaB(sqrtPrice, nextSqrtPrice, liquidity, true);

    upwardTradableAmount.push({
      tickIndex: nextTickIndex,
      price: nextPrice,
      amountA: DecimalUtil.fromU64(new u64(deltaA), decimalsA),
      amountB: DecimalUtil.fromU64(new u64(deltaB), decimalsB),
    });

    if ( nextTick === undefined ) break;
    tickIndex = nextTickIndex;
    sqrtPrice = nextSqrtPrice;
    liquidity = liquidity.add(nextTick.liquidityNet); // left to right, add liquidityNet
  }

  // downward
  tickIndex = whirlpool.tickCurrentIndex;
  sqrtPrice = whirlpool.sqrtPrice;
  liquidity = whirlpool.liquidity;
  const downwardTradableAmount: TradableAmount[] = [];
  for (let i=0; i<10; i++) {
    nextTickIndex = lowerInitializableTickIndex - i*tickSpacing;
    nextTick = getTick(nextTickIndex, tickSpacing, tickArrays);
    if ( nextTick === undefined ) break;

    nextSqrtPrice = PriceMath.tickIndexToSqrtPriceX64(nextTickIndex);
    nextPrice = toFixedDecimal(PriceMath.tickIndexToPrice(nextTickIndex, decimalsA, decimalsB), decimalsB);
    const deltaA = getAmountDeltaA(sqrtPrice, nextSqrtPrice, liquidity, true);
    const deltaB = getAmountDeltaB(sqrtPrice, nextSqrtPrice, liquidity, false);

    downwardTradableAmount.push({
      tickIndex: nextTickIndex,
      price: nextPrice,
      amountA: DecimalUtil.fromU64(new u64(deltaA), decimalsA),
      amountB: DecimalUtil.fromU64(new u64(deltaB), decimalsB),
    });

    tickIndex = nextTickIndex;
    sqrtPrice = nextSqrtPrice;
    liquidity = liquidity.sub(nextTick.liquidityNet); // right to left, sub liquidityNet
  }

  return {
    upward: upwardTradableAmount,
    downward: downwardTradableAmount,
    error: false,
  }
}

function listTickArrayTradableAmounts(whirlpool: WhirlpoolData, tickArrayStartIndexes: number[], tickArrayPubkeys: PublicKey[], tickArrays: TickArrayData[], decimalsA: number, decimalsB: number): TickArrayTradableAmounts {
  let tickIndex: number, nextTickIndex: number;
  let sqrtPrice: BN, nextSqrtPrice: BN;
  let liquidity: BN;
  let nextPrice: Decimal;
  let nextTick: TickData;

  const tickCurrentIndex = whirlpool.tickCurrentIndex;
  const tickSpacing = whirlpool.tickSpacing;
  const ticksInArray = tickSpacing * TICK_ARRAY_SIZE;
  const lowerInitializableTickIndex = Math.floor(tickCurrentIndex/tickSpacing)*tickSpacing;
  const upperInitializableTickIndex = lowerInitializableTickIndex + tickSpacing;

  const currentTickArrayStartIndex = Math.floor(tickCurrentIndex / ticksInArray) * ticksInArray;
  const currentTickArrayIndex = (currentTickArrayStartIndex - tickArrayStartIndexes[0]) / ticksInArray;

  // upward
  const upwardTickArrayPubkeys: PublicKey[] = [];
  const upwardTickArrayStartIndexes: number[] = [];
  const upwardTickArrays: TickArrayData[] = [];
  const upwardAmountA: Decimal[] = [];
  const upwardAmountB: Decimal[] = [];
  for (let i=0; /*i<=3 && */currentTickArrayIndex+i < tickArrayPubkeys.length; i++) {
    upwardTickArrayPubkeys.push(tickArrayPubkeys[currentTickArrayIndex+i]);
    upwardTickArrayStartIndexes.push(tickArrayStartIndexes[currentTickArrayIndex+i]);
    upwardTickArrays.push(tickArrays[currentTickArrayIndex+i]);
    upwardAmountA.push(new Decimal(0));
    upwardAmountB.push(new Decimal(0));
  }

  const upwardLastTickIndex = Math.min(MAX_TICK_INDEX, currentTickArrayStartIndex + upwardTickArrays.length*ticksInArray);
  let upwardIndex = 0;
  tickIndex = whirlpool.tickCurrentIndex;
  sqrtPrice = whirlpool.sqrtPrice;
  liquidity = whirlpool.liquidity;
  for (let i=0; true; i++) {
    nextTickIndex = upperInitializableTickIndex + i*tickSpacing;
    if ( nextTickIndex > upwardLastTickIndex ) break;

    nextSqrtPrice = PriceMath.tickIndexToSqrtPriceX64(nextTickIndex);
    nextPrice = toFixedDecimal(PriceMath.tickIndexToPrice(nextTickIndex, decimalsA, decimalsB), decimalsB);
    const deltaA = getAmountDeltaA(sqrtPrice, nextSqrtPrice, liquidity, false);
    const deltaB = getAmountDeltaB(sqrtPrice, nextSqrtPrice, liquidity, true);
    const deltaADecimal = DecimalUtil.fromU64(new u64(deltaA), decimalsA);
    const deltaBDecimal = DecimalUtil.fromU64(new u64(deltaB), decimalsB);

    upwardAmountA[upwardIndex] = upwardAmountA[upwardIndex].add(deltaADecimal);
    upwardAmountB[upwardIndex] = upwardAmountB[upwardIndex].add(deltaBDecimal);

    nextTick = getTick(nextTickIndex, tickSpacing, tickArrays);
    if ( nextTick !== undefined ) liquidity = liquidity.add(nextTick.liquidityNet); // left to right, add liquidityNet
    tickIndex = nextTickIndex;
    sqrtPrice = nextSqrtPrice;
    if ( nextTickIndex % ticksInArray === 0 ) upwardIndex++;
  }

  // downward
  const downwardTickArrayPubkeys: PublicKey[] = [];
  const downwardTickArrayStartIndexes: number[] = [];
  const downwardTickArrays: TickArrayData[] = [];
  const downwardAmountA: Decimal[] = [];
  const downwardAmountB: Decimal[] = [];
  for (let i=0; /*i<=3 && */currentTickArrayIndex-i >= 0; i++) {
    downwardTickArrayPubkeys.push(tickArrayPubkeys[currentTickArrayIndex-i]);
    downwardTickArrayStartIndexes.push(tickArrayStartIndexes[currentTickArrayIndex-i]);
    downwardTickArrays.push(tickArrays[currentTickArrayIndex-i]);
    downwardAmountA.push(new Decimal(0));
    downwardAmountB.push(new Decimal(0));
  }

  const downwardLastTickIndex = Math.max(MIN_TICK_INDEX, currentTickArrayStartIndex - (downwardTickArrays.length - 1)*ticksInArray);
  let downwardIndex = 0;
  tickIndex = whirlpool.tickCurrentIndex;
  sqrtPrice = whirlpool.sqrtPrice;
  liquidity = whirlpool.liquidity;
  for (let i=0; true; i++) {
    nextTickIndex = lowerInitializableTickIndex - i*tickSpacing;
    if ( nextTickIndex < downwardLastTickIndex ) break;

    nextSqrtPrice = PriceMath.tickIndexToSqrtPriceX64(nextTickIndex);
    nextPrice = toFixedDecimal(PriceMath.tickIndexToPrice(nextTickIndex, decimalsA, decimalsB), decimalsB);
    const deltaA = getAmountDeltaA(sqrtPrice, nextSqrtPrice, liquidity, true);
    const deltaB = getAmountDeltaB(sqrtPrice, nextSqrtPrice, liquidity, false);
    const deltaADecimal = DecimalUtil.fromU64(new u64(deltaA), decimalsA);
    const deltaBDecimal = DecimalUtil.fromU64(new u64(deltaB), decimalsB);

    downwardAmountA[downwardIndex] = downwardAmountA[downwardIndex].add(deltaADecimal);
    downwardAmountB[downwardIndex] = downwardAmountB[downwardIndex].add(deltaBDecimal);

    nextTick = getTick(nextTickIndex, tickSpacing, tickArrays);
    if ( nextTick !== undefined ) liquidity = liquidity.sub(nextTick.liquidityNet); // right to left, sub liquidityNet
    tickIndex = nextTickIndex;
    sqrtPrice = nextSqrtPrice;
    if ( nextTickIndex % ticksInArray === 0 ) downwardIndex++;
  }

  const upwardTickArrayTradableAmount: TickArrayTradableAmount[] = [];
  for (let i=0; i<upwardTickArrayPubkeys.length; i++) {
    upwardTickArrayTradableAmount.push({
      tickArrayPubkey: upwardTickArrayPubkeys[i],
      tickArrayStartIndex: upwardTickArrayStartIndexes[i],
      tickArrayStartPrice: toFixedDecimal(PriceMath.tickIndexToPrice(upwardTickArrayStartIndexes[i], decimalsA, decimalsB), decimalsB),
      tickArrayData: upwardTickArrays[i],
      amountA: upwardAmountA[i],
      amountB: upwardAmountB[i],
    })
  }

  const downwardTickArrayTradableAmount: TickArrayTradableAmount[] = [];
  for (let i=0; i<downwardTickArrayPubkeys.length; i++) {
    downwardTickArrayTradableAmount.push({
      tickArrayPubkey: downwardTickArrayPubkeys[i],
      tickArrayStartIndex: downwardTickArrayStartIndexes[i],
      tickArrayStartPrice: toFixedDecimal(PriceMath.tickIndexToPrice(downwardTickArrayStartIndexes[i], decimalsA, decimalsB), decimalsB),
      tickArrayData: downwardTickArrays[i],
      amountA: downwardAmountA[i],
      amountB: downwardAmountB[i],
    })
  }

  return {
    upward: upwardTickArrayTradableAmount,
    downward: downwardTickArrayTradableAmount,
    error: false,
  }
}

type BundledPositionInfo = {
  bundleIndex: number,
  address: PublicKey,
  whirlpool: PublicKey,
  tickLowerIndex: number,
  tickUpperIndex: number,
  liquidity: BN,
}

type PositionBundleDerivedInfo = {
  occupied: number;
  unoccupied: number;
  bundledPositions: BundledPositionInfo[],
}

type PositionBundleInfo = {
  meta: AccountMetaInfo,
  parsed: PositionBundleData,
  derived: PositionBundleDerivedInfo,
}

export async function getPositionBundleInfo(addr: Address): Promise<PositionBundleInfo> {
  const pubkey = AddressUtil.toPubKey(addr);
  const connection = getConnection();
  const fetcher = new AccountFetcher(connection);

  const { accountInfo, slotContext } = await getAccountInfo(connection, pubkey);
  const positionBundleData = ParsablePositionBundle.parse(accountInfo.data);

  const occupiedIndexes = PositionBundleUtil.getOccupiedBundleIndexes(positionBundleData);
  const bundledPositionAddresses = occupiedIndexes.map((index) => {
    return PDAUtil.getBundledPosition(accountInfo.owner, positionBundleData.positionBundleMint, index).publicKey
  });

  const bundledPositionDatas = await fetcher.listPositions(bundledPositionAddresses, true);

  const bundledPositions: BundledPositionInfo[] = [];
  for (let i=0; i<bundledPositionDatas.length; i++) {
    if (!bundledPositionDatas[i]) continue;

    const bundledPositionData = bundledPositionDatas[i];
    const bundledPositionInfo = {
      bundleIndex: occupiedIndexes[i],
      address: bundledPositionAddresses[i],
      whirlpool: bundledPositionData.whirlpool,
      tickLowerIndex: bundledPositionData.tickLowerIndex,
      tickUpperIndex: bundledPositionData.tickUpperIndex,
      liquidity: bundledPositionData.liquidity,
    };
    bundledPositions.push(bundledPositionInfo);
  }

  const occupied = bundledPositions.length;
  const unoccupied = POSITION_BUNDLE_SIZE - occupied;

  return {
    meta: toMeta(pubkey, accountInfo, slotContext),
    parsed: positionBundleData,
    derived: {
      occupied,
      unoccupied,
      bundledPositions,
    },
  };
}
