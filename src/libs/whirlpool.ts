import { PublicKey, AccountInfo } from "@solana/web3.js";
import { ParsableWhirlpool, PriceMath, WhirlpoolData, AccountFetcher, TickArrayData, PoolUtil, TICK_ARRAY_SIZE, TickUtil, MIN_TICK_INDEX, MAX_TICK_INDEX, PDAUtil, PositionData, ParsablePosition, collectFeesQuote, TickArrayUtil, collectRewardsQuote, TokenAmounts, CollectFeesQuote, CollectRewardsQuote, WhirlpoolsConfigData, FeeTierData, ParsableWhirlpoolsConfig, ParsableFeeTier, ParsableTickArray } from "@orca-so/whirlpools-sdk";
import { Address, BN } from "@project-serum/anchor";
import { AddressUtil, DecimalUtil } from "@orca-so/common-sdk";
import { u64 } from "@solana/spl-token";
import { AccountMetaInfo, bn2u64, toFixedDecimal, toMeta } from "./account";
import { getConnection } from "./client";
import Decimal from "decimal.js";
import moment from "moment";
import fetch from "node-fetch";

const NEIGHBORING_TICK_ARRAY_NUM = 6
const ISOTOPE_TICK_SPACINGS = [1, 2, 4, 8, 16, 32, 64, 128, 256];
const V1_WHIRLPOOL_LIST = "https://api.mainnet.orca.so/v1/whirlpool/list";

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
}

type WhirlpoolInfo = {
  meta: AccountMetaInfo,
  parsed: WhirlpoolData,
  derived: WhirlpoolDerivedInfo,
}

export async function getWhirlpoolInfo(addr: Address): Promise<WhirlpoolInfo> {
  const pubkey = AddressUtil.toPubKey(addr);
  const connection = getConnection();
  const fetcher = new AccountFetcher(connection);

  const accountInfo = await connection.getAccountInfo(pubkey);
  const whirlpoolData = ParsableWhirlpool.parse(accountInfo.data);

  const ut = moment.unix(whirlpoolData.rewardLastUpdatedTimestamp.toNumber());//.utc();
  console.log(ut.format("YYYY/MM/DD HH:mm:ss UTCZZ"));

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
      });
    }
  });

  // get oracle
  const oracle = PDAUtil.getOracle(accountInfo.owner, pubkey).publicKey;

  return {
    meta: toMeta(pubkey, accountInfo),
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
  feeQuote: CollectFeesQuote,
  feeAmountA: Decimal,
  feeAmountB: Decimal,
  rewardsQuote: CollectRewardsQuote,
  rewardAmount0?: Decimal,
  rewardAmount1?: Decimal,
  rewardAmount2?: Decimal,
}

type PositionInfo = {
  meta: AccountMetaInfo,
  parsed: PositionData,
  derived: PositionDerivedInfo,
}

export async function getPositionInfo(addr: Address): Promise<PositionInfo> {
  const pubkey = AddressUtil.toPubKey(addr);
  const connection = getConnection();
  const fetcher = new AccountFetcher(connection);

  const accountInfo = await connection.getAccountInfo(pubkey);
  const positionData = ParsablePosition.parse(accountInfo.data);

  // get whirlpool
  const whirlpoolData = await fetcher.getPool(positionData.whirlpool, true);

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

  return {
    meta: toMeta(pubkey, accountInfo),
    parsed: positionData,
    derived: {
      priceLower,
      priceUpper,
      invertedPriceLower,
      invertedPriceUpper,
      amounts,
      amountA: DecimalUtil.fromU64(amounts.tokenA, decimalsA),
      amountB: DecimalUtil.fromU64(amounts.tokenB, decimalsB),
      feeQuote,
      feeAmountA: DecimalUtil.fromU64(feeQuote.feeOwedA, decimalsA),
      feeAmountB: DecimalUtil.fromU64(feeQuote.feeOwedB, decimalsB),
      rewardsQuote,
      rewardAmount0: rewardsQuote[0] === undefined ? undefined : DecimalUtil.fromU64(rewardsQuote[0], decimalsR0),
      rewardAmount1: rewardsQuote[1] === undefined ? undefined : DecimalUtil.fromU64(rewardsQuote[1], decimalsR1),
      rewardAmount2: rewardsQuote[2] === undefined ? undefined : DecimalUtil.fromU64(rewardsQuote[2], decimalsR2),
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

  const accountInfo = await connection.getAccountInfo(pubkey);
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
    meta: toMeta(pubkey, accountInfo),
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

  const accountInfo = await connection.getAccountInfo(pubkey);
  const feeTierData = ParsableFeeTier.parse(accountInfo.data);

  return {
    meta: toMeta(pubkey, accountInfo),
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

  const accountInfo = await connection.getAccountInfo(pubkey);
  const tickArrayData = ParsableTickArray.parse(accountInfo.data);

  // get whirlpool
  const whirlpoolData = await fetcher.getPool(tickArrayData.whirlpool, true);

  const ticksInArray = whirlpoolData.tickSpacing * TICK_ARRAY_SIZE;
  const prevTickArrayPubkey = PDAUtil.getTickArray(accountInfo.owner, tickArrayData.whirlpool, tickArrayData.startTickIndex - ticksInArray).publicKey;
  const nextTickArrayPubkey = PDAUtil.getTickArray(accountInfo.owner, tickArrayData.whirlpool, tickArrayData.startTickIndex + ticksInArray).publicKey;

  return {
    meta: toMeta(pubkey, accountInfo),
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

type WhirlpoolListEntry = {
  address: PublicKey,
  name: string,
  symbolA: string,
  symbolB: string,
  mintA: PublicKey,
  mintB: PublicKey,
  tickSpacing: number,
  price: Decimal,
  usdTVL: Decimal,
  usdVolumeDay: Decimal,
}

function whirlpoolListEntryCmp(a: WhirlpoolListEntry, b: WhirlpoolListEntry): number {
  if ( a.symbolA < b.symbolA ) return -1;
  if ( a.symbolA > b.symbolA ) return +1;
  if ( a.symbolB < b.symbolB ) return -1;
  if ( a.symbolB > b.symbolB ) return +1;
  if ( a.tickSpacing < b.tickSpacing ) return -1;
  if ( a.tickSpacing > b.tickSpacing ) return +1;
  return 0;
}

export async function getWhirlpoolList(): Promise<WhirlpoolListEntry[]> {
  const response = await (await fetch(V1_WHIRLPOOL_LIST)).json();

  const list: WhirlpoolListEntry[] = [];
  response.whirlpools.forEach((p) => {
    list.push({
      address: new PublicKey(p.address),
      name: `${p.tokenA.symbol}/${p.tokenB.symbol}(${p.tickSpacing})`,
      symbolA: p.tokenA.symbol,
      symbolB: p.tokenB.symbol,
      mintA: new PublicKey(p.tokenA.mint),
      mintB: new PublicKey(p.tokenB.mint),
      tickSpacing: p.tickSpacing,
      price: new Decimal(p.price),
      usdTVL: new Decimal(p.tvl),
      usdVolumeDay: new Decimal(p.volume.day),
    });
  });

  list.sort(whirlpoolListEntryCmp);
  return list;
}