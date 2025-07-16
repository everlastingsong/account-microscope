import { PublicKey, AccountInfo, GetProgramAccountsFilter, Connection } from "@solana/web3.js";
import { ParsableWhirlpool, PriceMath, WhirlpoolData, buildDefaultAccountFetcher, TickArrayData, PoolUtil, TICK_ARRAY_SIZE, TickUtil, MIN_TICK_INDEX, MAX_TICK_INDEX, PDAUtil, PositionData, ParsablePosition, collectFeesQuote, TickArrayUtil, collectRewardsQuote, TokenAmounts, CollectFeesQuote, CollectRewardsQuote, WhirlpoolsConfigData, FeeTierData, ParsableWhirlpoolsConfig, ParsableFeeTier, ParsableTickArray, TickData, PositionBundleData, ParsablePositionBundle, PositionBundleUtil, POSITION_BUNDLE_SIZE, getAccountSize, AccountName, IGNORE_CACHE, WhirlpoolsConfigExtensionData, ParsableWhirlpoolsConfigExtension, TokenBadgeData, ParsableTokenBadge, LockConfigData, ParsableLockConfig, AdaptiveFeeTierData, ParsableAdaptiveFeeTier, ParsableOracle, OracleData } from "@orca-so/whirlpools-sdk";
import { PositionUtil, PositionStatus } from "@orca-so/whirlpools-sdk/dist/utils/position-util";
import { Address, BN } from "@coral-xyz/anchor";
import { getAmountDeltaA, getAmountDeltaB } from "@orca-so/whirlpools-sdk/dist/utils/math/token-math";
import { AddressUtil, DecimalUtil } from "@orca-so/common-sdk";
import { AccountMetaInfo, bn2u64, getAccountInfo, toFixedDecimal, toMeta } from "./account";
import { getConnection } from "./client";
import { getTokenList, TokenInfo } from "./orcaapi";
import Decimal from "decimal.js";
import moment from "moment";
import { TokenExtensionUtil } from "@orca-so/whirlpools-sdk/dist/utils/public/token-extension-util";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token-2022";

const NEIGHBORING_TICK_ARRAY_NUM = 9
const ISOTOPE_TICK_SPACINGS = [1, 2, 4, 8, 16, 32, 64, 96, 128, 256, 512, 32896];
const PERMISSIONLESS_ADAPTIVE_FEE_TIER_INDEXES = [
  1025, 1026, 1027, 1028, 1029, 1030, 1031, 1032, 1033, 1034,
  1035, 1036, 1037, 1038, 1039, 1040, 1041, 1042, 1043, 1044,
  1045, 1046, 1047, 1048, 1049, 1050, 1051, 1052, 1053, 1054,
];
const PERMISSIONED_ADAPTIVE_FEE_TIER_INDEXES = [
  2049, 2050, 2051, 2052, 2053, 2054, 2055, 2056, 2057, 2058,
  2059, 2060, 2061, 2062, 2063, 2064, 2065, 2066, 2067, 2068,
  2069, 2070, 2071, 2072, 2073, 2074, 2075, 2076, 2077, 2078,
];

const DYNAMIC_TICK_ARRAY_DISCRIMINATOR = [17, 216, 246, 142, 225, 199, 218, 56];

export const ACCOUNT_DEFINITION = {
  Whirlpool: "https://github.com/orca-so/whirlpools/blob/main/programs/whirlpool/src/state/whirlpool.rs#L14",
  Position: "https://github.com/orca-so/whirlpools/blob/main/programs/whirlpool/src/state/position.rs#L20",
  WhirlpoolsConfig: "https://github.com/orca-so/whirlpools/blob/main/programs/whirlpool/src/state/config.rs#L6",
  FeeTier: "https://github.com/orca-so/whirlpools/blob/main/programs/whirlpool/src/state/fee_tier.rs#L12",
  TickArray: "https://github.com/orca-so/whirlpools/blob/main/programs/whirlpool/src/state/tick.rs#L143",
  PositionBundle: "https://github.com/orca-so/whirlpools/blob/main/programs/whirlpool/src/state/position_bundle.rs#L9",
  WhirlpoolsConfigExtension: "https://github.com/orca-so/whirlpools/blob/main/programs/whirlpool/src/state/config_extension.rs#L11",
  TokenBadge: "https://github.com/orca-so/whirlpools/blob/main/programs/whirlpool/src/state/token_badge.rs#L5",
  LockConfig: "https://github.com/orca-so/whirlpools/blob/main/programs/whirlpool/src/state/lock_config.rs#L4",
  AdaptiveFeeTier: "https://github.com/orca-so/whirlpools/blob/main/programs/whirlpool/src/state/adaptive_fee_tier.rs#L9",
  Oracle: "https://github.com/orca-so/whirlpools/blob/main/programs/whirlpool/src/state/oracle.rs#L256",
}

export type TokenProgram = "token" | "token-2022";

function toTokenProgram(tokenProgram: PublicKey | undefined): TokenProgram {
  if (!tokenProgram) return undefined;
  if (tokenProgram.equals(TOKEN_PROGRAM_ID)) return "token";
  if (tokenProgram.equals(TOKEN_2022_PROGRAM_ID)) return "token-2022";
  throw new Error(`Unknown token program: ${tokenProgram.toBase58()}`);
}

type NeighboringTickArray = {
  pubkey: PublicKey,
  startTickIndex: number,
  startPrice: Decimal,
  isInitialized: boolean,
  isDynamic: undefined | boolean,
  hasTickCurrentIndex: boolean,
}

type FullRangeTickArray = {
  pubkey: PublicKey,
  startTickIndex: number,
  isInitialized: boolean,
  isDynamic: undefined | boolean,
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
  feeTierIndex: number,
  adaptiveFeeEnabled: boolean,
  price: Decimal,
  invertedPrice: Decimal,
  feeRate: Decimal,
  protocolFeeRate: Decimal,
  decimalsA: number,
  decimalsB: number,
  decimalsR0?: number,
  decimalsR1?: number,
  decimalsR2?: number,
  tokenProgramA: TokenProgram,
  tokenProgramB: TokenProgram,
  tokenProgramR0?: TokenProgram,
  tokenProgramR1?: TokenProgram,
  tokenProgramR2?: TokenProgram,
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
  fullRangeTickArrays: FullRangeTickArray[],
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
  const fetcher = buildDefaultAccountFetcher(connection);

  const { accountInfo, slotContext } = await getAccountInfo(connection, pubkey);
  const whirlpoolData = ParsableWhirlpool.parse(pubkey, accountInfo);

  // get mints
  const mintPubkeys: PublicKey[] = [];
  mintPubkeys.push(whirlpoolData.tokenMintA);
  mintPubkeys.push(whirlpoolData.tokenMintB);
  mintPubkeys.push(whirlpoolData.rewardInfos[0].mint);
  mintPubkeys.push(whirlpoolData.rewardInfos[1].mint);
  mintPubkeys.push(whirlpoolData.rewardInfos[2].mint);
  const mints = await fetcher.getMintInfos(mintPubkeys, IGNORE_CACHE);
  const decimalsA = mints.get(mintPubkeys[0].toBase58()).decimals;
  const decimalsB = mints.get(mintPubkeys[1].toBase58()).decimals;
  const decimalsR0 = mints.get(mintPubkeys[2].toBase58())?.decimals;
  const decimalsR1 = mints.get(mintPubkeys[3].toBase58())?.decimals;
  const decimalsR2 = mints.get(mintPubkeys[4].toBase58())?.decimals;
  const tokenProgramA = toTokenProgram(mints.get(mintPubkeys[0].toBase58()).tokenProgram);
  const tokenProgramB = toTokenProgram(mints.get(mintPubkeys[1].toBase58()).tokenProgram);
  const tokenProgramR0 = toTokenProgram(mints.get(mintPubkeys[2].toBase58())?.tokenProgram);
  const tokenProgramR1 = toTokenProgram(mints.get(mintPubkeys[3].toBase58())?.tokenProgram);
  const tokenProgramR2 = toTokenProgram(mints.get(mintPubkeys[4].toBase58())?.tokenProgram);

  // get vaults
  const vaultPubkeys: PublicKey[] = [];
  vaultPubkeys.push(whirlpoolData.tokenVaultA);
  vaultPubkeys.push(whirlpoolData.tokenVaultB);
  vaultPubkeys.push(whirlpoolData.rewardInfos[0].vault);
  vaultPubkeys.push(whirlpoolData.rewardInfos[1].vault);
  vaultPubkeys.push(whirlpoolData.rewardInfos[2].vault);
  const vaultsMap = await fetcher.getTokenInfos(vaultPubkeys, IGNORE_CACHE);
  const vaults = [
    vaultsMap.get(vaultPubkeys[0].toBase58()),
    vaultsMap.get(vaultPubkeys[1].toBase58()),
    vaultsMap.get(vaultPubkeys[2].toBase58()),
    vaultsMap.get(vaultPubkeys[3].toBase58()),
    vaultsMap.get(vaultPubkeys[4].toBase58()),
  ];

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
    try {
      const startTickIndex = TickUtil.getStartTickIndex(whirlpoolData.tickCurrentIndex, whirlpoolData.tickSpacing, offset);
      if ( startTickIndex+ticksInArray <= MIN_TICK_INDEX ) continue;
      if ( startTickIndex > MAX_TICK_INDEX ) continue;
      tickArrayStartIndexes.push(startTickIndex);
      tickArrayPubkeys.push(PDAUtil.getTickArray(accountInfo.owner, pubkey, startTickIndex).publicKey);
    } catch (e) {
      // ignore
    }
  }
  const tickArrays = await getTickArrays(connection, tickArrayPubkeys);
  const neighboringTickArrays: NeighboringTickArray[] = [];
  tickArrayStartIndexes.forEach((startTickIndex, i) => {
    neighboringTickArrays.push({
      pubkey: tickArrayPubkeys[i],
      startTickIndex,
      startPrice: toFixedDecimal(PriceMath.tickIndexToPrice(startTickIndex, decimalsA, decimalsB), decimalsB),
      isInitialized: !!tickArrays[i],
      isDynamic: tickArrays[i]?.isDynamic,
      hasTickCurrentIndex: startTickIndex === currentStartTickIndex,
    });
  });

  // get full range tickarrays
  const minTickIndex = Math.ceil(MIN_TICK_INDEX / whirlpoolData.tickSpacing) * whirlpoolData.tickSpacing;
  const maxTickIndex = Math.floor(MAX_TICK_INDEX / whirlpoolData.tickSpacing) * whirlpoolData.tickSpacing;
  const minStartTickIndex = TickUtil.getStartTickIndex(minTickIndex, whirlpoolData.tickSpacing);
  const maxStartTickIndex = TickUtil.getStartTickIndex(maxTickIndex, whirlpoolData.tickSpacing);
  const minTickArrayPubkey = PDAUtil.getTickArray(accountInfo.owner, pubkey, minStartTickIndex).publicKey;
  const maxTickArrayPubkey = PDAUtil.getTickArray(accountInfo.owner, pubkey, maxStartTickIndex).publicKey;
  const tickArraysForFullRange = await getTickArrays(connection, [
    minTickArrayPubkey,
    maxTickArrayPubkey,
  ]);
  const fullRangeTickArrays: FullRangeTickArray[] = [
    {pubkey: minTickArrayPubkey, startTickIndex: minStartTickIndex, isInitialized: !!tickArraysForFullRange[0], isDynamic: tickArraysForFullRange[0]?.isDynamic },
    {pubkey: maxTickArrayPubkey, startTickIndex: maxStartTickIndex, isInitialized: !!tickArraysForFullRange[1], isDynamic: tickArraysForFullRange[1]?.isDynamic },
  ];

  // get isotope whirlpools
  const whirlpoolPubkeys: PublicKey[] = [];
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
  const whirlpools = await fetcher.getPools(whirlpoolPubkeys, IGNORE_CACHE);
  const isotopeWhirlpools: IsotopeWhirlpool[] = [];
  ISOTOPE_TICK_SPACINGS.forEach((tickSpacing, i) => {
    const whirlpool = whirlpools.get(whirlpoolPubkeys[i].toBase58());
    if (whirlpool) {
      isotopeWhirlpools.push({
        tickSpacing,
        feeRate: PoolUtil.getFeeRate(whirlpool.feeRate).toDecimal().mul(100),
        pubkey: whirlpoolPubkeys[i],
        tickCurrentIndex: whirlpool.tickCurrentIndex,
        price: toFixedDecimal(PriceMath.sqrtPriceX64ToPrice(whirlpool.sqrtPrice, decimalsA, decimalsB), decimalsB),
        liquidity: whirlpool.liquidity,
      });
    }
  });

  // get oracle
  const oracle = PDAUtil.getOracle(accountInfo.owner, pubkey).publicKey;

  // get fee tier index
  const feeTierIndex = PoolUtil.getFeeTierIndex(whirlpoolData);
  const adaptiveFeeEnabled = PoolUtil.isInitializedWithAdaptiveFee(whirlpoolData);

  let tradableAmounts: TradableAmounts = { downward: [], upward: [], error: true };
  try {
    const calculated = listTradableAmounts(
      whirlpoolData,
      tickArrays.slice(),
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
      tickArrays.slice(),
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
      feeTierIndex,
      adaptiveFeeEnabled,
      price: toFixedDecimal(PriceMath.sqrtPriceX64ToPrice(whirlpoolData.sqrtPrice, decimalsA, decimalsB), decimalsB),
      invertedPrice: toFixedDecimal(new Decimal(1).div(PriceMath.sqrtPriceX64ToPrice(whirlpoolData.sqrtPrice, decimalsA, decimalsB)), decimalsA),
      feeRate: PoolUtil.getFeeRate(whirlpoolData.feeRate).toDecimal().mul(100),
      protocolFeeRate: PoolUtil.getProtocolFeeRate(whirlpoolData.protocolFeeRate).toDecimal().mul(100),
      decimalsA,
      decimalsB,
      decimalsR0,
      decimalsR1,
      decimalsR2,
      tokenProgramA,
      tokenProgramB,
      tokenProgramR0,
      tokenProgramR1,
      tokenProgramR2,
      tokenInfoA,
      tokenInfoB,
      tokenInfoR0,
      tokenInfoR1,
      tokenInfoR2,
      tokenVaultAAmount: DecimalUtil.fromBN(vaults[0].amount, decimalsA),
      tokenVaultBAmount: DecimalUtil.fromBN(vaults[1].amount, decimalsB),
      tokenVaultR0Amount: decimalsR0 === undefined ? undefined : DecimalUtil.fromBN(vaults[2].amount, decimalsR0),
      tokenVaultR1Amount: decimalsR1 === undefined ? undefined : DecimalUtil.fromBN(vaults[3].amount, decimalsR1),
      tokenVaultR2Amount: decimalsR2 === undefined ? undefined : DecimalUtil.fromBN(vaults[4].amount, decimalsR2),
      reward0WeeklyEmission: decimalsR0 === undefined ? undefined : DecimalUtil.fromBN(bn2u64(whirlpoolData.rewardInfos[0].emissionsPerSecondX64.muln(60*60*24*7).shrn(64)), decimalsR0),
      reward1WeeklyEmission: decimalsR1 === undefined ? undefined : DecimalUtil.fromBN(bn2u64(whirlpoolData.rewardInfos[1].emissionsPerSecondX64.muln(60*60*24*7).shrn(64)), decimalsR1),
      reward2WeeklyEmission: decimalsR2 === undefined ? undefined : DecimalUtil.fromBN(bn2u64(whirlpoolData.rewardInfos[2].emissionsPerSecondX64.muln(60*60*24*7).shrn(64)), decimalsR2),
      rewardLastUpdatedTimestamp: moment.unix(whirlpoolData.rewardLastUpdatedTimestamp.toNumber()),
      fullRangeTickArrays,
      neighboringTickArrays,
      isotopeWhirlpools,
      oracle,
      tradableAmounts,
      tickArrayTradableAmounts,
    }
  };
}

export enum PositionStatusString {
  PriceIsInRange = "Price is In Range",
  PriceIsAboveRange = "Price is Above Range",
  PriceIsBelowRange = "Price is Below Range",
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
  tokenProgramA: TokenProgram,
  tokenProgramB: TokenProgram,
  tokenProgramR0?: TokenProgram,
  tokenProgramR1?: TokenProgram,
  tokenProgramR2?: TokenProgram,
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
  status: PositionStatusString,
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
  positionMintSupply: number,
  isTokenExtensionsBased: boolean,
  isLocked: boolean,
  lockConfig?: PublicKey,
  lockConfigData?: LockConfigData,
}

export type PositionInfo = {
  meta: AccountMetaInfo,
  parsed: PositionData,
  derived: PositionDerivedInfo,
}

export async function getPositionInfo(addr: Address): Promise<PositionInfo> {
  const pubkey = AddressUtil.toPubKey(addr);
  const connection = getConnection();
  const fetcher = buildDefaultAccountFetcher(connection);

  const { accountInfo, slotContext } = await getAccountInfo(connection, pubkey);
  const positionData = ParsablePosition.parse(pubkey, accountInfo);

  // get whirlpool
  const whirlpoolData = await fetcher.getPool(positionData.whirlpool, IGNORE_CACHE);

  // get status & share
  const status = PositionUtil.getPositionStatus(whirlpoolData.tickCurrentIndex, positionData.tickLowerIndex, positionData.tickUpperIndex);
  let sharePercentOfLiquidity = new Decimal(0);
  if (status === PositionStatus.InRange && !positionData.liquidity.isZero()) {
    sharePercentOfLiquidity = toFixedDecimal(new Decimal(positionData.liquidity.toString()).div(whirlpoolData.liquidity.toString()).mul(100), 9);
  }

  // get mints
  const mintPubkeys: PublicKey[] = [];
  mintPubkeys.push(whirlpoolData.tokenMintA);
  mintPubkeys.push(whirlpoolData.tokenMintB);
  mintPubkeys.push(whirlpoolData.rewardInfos[0].mint);
  mintPubkeys.push(whirlpoolData.rewardInfos[1].mint);
  mintPubkeys.push(whirlpoolData.rewardInfos[2].mint);
  mintPubkeys.push(positionData.positionMint);
  const mints = await fetcher.getMintInfos(mintPubkeys, IGNORE_CACHE);
  const decimalsA = mints.get(mintPubkeys[0].toBase58()).decimals;
  const decimalsB = mints.get(mintPubkeys[1].toBase58()).decimals;
  const decimalsR0 = mints.get(mintPubkeys[2].toBase58())?.decimals;
  const decimalsR1 = mints.get(mintPubkeys[3].toBase58())?.decimals;
  const decimalsR2 = mints.get(mintPubkeys[4].toBase58())?.decimals;
  const tokenProgramA = toTokenProgram(mints.get(mintPubkeys[0].toBase58()).tokenProgram);
  const tokenProgramB = toTokenProgram(mints.get(mintPubkeys[1].toBase58()).tokenProgram);
  const tokenProgramR0 = toTokenProgram(mints.get(mintPubkeys[2].toBase58())?.tokenProgram);
  const tokenProgramR1 = toTokenProgram(mints.get(mintPubkeys[3].toBase58())?.tokenProgram);
  const tokenProgramR2 = toTokenProgram(mints.get(mintPubkeys[4].toBase58())?.tokenProgram);
  const positionMintSupply = Number((mints.get(mintPubkeys[5].toBase58()).supply as bigint).toString());

  const positionMintTokenProgram = toTokenProgram(mints.get(mintPubkeys[5].toBase58()).tokenProgram);

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
  const tickArrays = await getTickArrays(connection, tickArrayPubkeys);
  const tickLower = TickArrayUtil.getTickFromArray(tickArrays[0], positionData.tickLowerIndex, whirlpoolData.tickSpacing);
  const tickUpper = TickArrayUtil.getTickFromArray(tickArrays[1], positionData.tickUpperIndex, whirlpoolData.tickSpacing);

  const tokenExtensionCtx = await TokenExtensionUtil.buildTokenExtensionContext(
    fetcher,
    whirlpoolData,
    IGNORE_CACHE,
  );

  const feeQuote = collectFeesQuote({
    position: positionData,
    tickLower,
    tickUpper,
    whirlpool: whirlpoolData,
    tokenExtensionCtx,
  });

  const rewardsQuote = collectRewardsQuote({
    position: positionData,
    tickLower,
    tickUpper,
    whirlpool: whirlpoolData,
    tokenExtensionCtx,
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

  const isTokenExtensionsBased = positionMintTokenProgram === "token-2022";
  const lockConfig = isTokenExtensionsBased ? PDAUtil.getLockConfig(accountInfo.owner, pubkey).publicKey : undefined;
  const lockConfigData = isTokenExtensionsBased ? await fetcher.getLockConfig(lockConfig, IGNORE_CACHE) : undefined;
  const isLocked = !!lockConfigData;

  return {
    meta: toMeta(pubkey, accountInfo, slotContext),
    parsed: positionData,
    derived: {
      priceLower,
      priceUpper,
      invertedPriceLower,
      invertedPriceUpper,
      amounts,
      amountA: DecimalUtil.fromBN(amounts.tokenA, decimalsA),
      amountB: DecimalUtil.fromBN(amounts.tokenB, decimalsB),
      decimalsA,
      decimalsB,
      decimalsR0,
      decimalsR1,
      decimalsR2,
      tokenProgramA,
      tokenProgramB,
      tokenProgramR0,
      tokenProgramR1,
      tokenProgramR2,
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
      feeAmountA: DecimalUtil.fromBN(feeQuote.feeOwedA, decimalsA),
      feeAmountB: DecimalUtil.fromBN(feeQuote.feeOwedB, decimalsB),
      rewardsQuote,
      rewardAmount0: rewardsQuote.rewardOwed[0] === undefined ? undefined : DecimalUtil.fromBN(rewardsQuote.rewardOwed[0], decimalsR0),
      rewardAmount1: rewardsQuote.rewardOwed[1] === undefined ? undefined : DecimalUtil.fromBN(rewardsQuote.rewardOwed[1], decimalsR1),
      rewardAmount2: rewardsQuote.rewardOwed[2] === undefined ? undefined : DecimalUtil.fromBN(rewardsQuote.rewardOwed[2], decimalsR2),
      status: status === PositionStatus.InRange ? PositionStatusString.PriceIsInRange : (status === PositionStatus.AboveRange ? PositionStatusString.PriceIsAboveRange : PositionStatusString.PriceIsBelowRange),
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
      positionMintSupply,
      isTokenExtensionsBased,
      lockConfig,
      isLocked,
      lockConfigData: isLocked ? lockConfigData : undefined,
    }
  };
}

type InitializedFeeTier = {
  tickSpacing: number,
  pubkey: PublicKey,
  isInitialized: boolean,
  defaultFeeRate?: Decimal,
}

type InitializedAdaptiveFeeTier = {
  feeTierIndex: number,
  pubkey: PublicKey,
  isInitialized: boolean,
  tickSpacing?: number,
  defaultBaseFeeRate?: Decimal,
}

type WhirlpoolsConfigDerivedInfo = {
  defaultProtocolFeeRate: Decimal,
  configExtension: PublicKey,
  feeTiers: InitializedFeeTier[],
  adaptiveFeeTiersPermissionless: InitializedAdaptiveFeeTier[],
  adaptiveFeeTiersPermissioned: InitializedAdaptiveFeeTier[],
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
  const whirlpoolsConfigData = ParsableWhirlpoolsConfig.parse(pubkey, accountInfo);

  const tickSpacingSet: Set<number> = new Set(ISOTOPE_TICK_SPACINGS);
  for (let tickSpacing=1; tickSpacing < 2**16; tickSpacing *= 2) {
    tickSpacingSet.add(tickSpacing);
  }

  const tickSpacings = Array.from(tickSpacingSet).sort((a, b) => a - b);
  const feeTierPubkeys: PublicKey[] = tickSpacings.map((tickSpacing) => {
    return PDAUtil.getFeeTier(accountInfo.owner, pubkey, tickSpacing).publicKey;
  });

  const accountInfos = await connection.getMultipleAccountsInfo(feeTierPubkeys);
  const feeTiers: InitializedFeeTier[] = [];
  accountInfos.forEach((a, i) => {
    const feeTier = ParsableFeeTier.parse(feeTierPubkeys[i], a);
    feeTiers.push({
      pubkey: feeTierPubkeys[i],
      tickSpacing: tickSpacings[i],
      isInitialized: feeTier !== null,
      defaultFeeRate: feeTier === null ? undefined : PoolUtil.getFeeRate(feeTier.defaultFeeRate).toDecimal().mul(100),
    });
  });

  const adaptiveFeeTierPubkeys: PublicKey[] = [
    ...PERMISSIONLESS_ADAPTIVE_FEE_TIER_INDEXES,
    ...PERMISSIONED_ADAPTIVE_FEE_TIER_INDEXES,
  ].map((feeTierIndex) => {
    return PDAUtil.getFeeTier(accountInfo.owner, pubkey, feeTierIndex).publicKey;
  });

  const adaptiveFeeTierAccountInfos = await connection.getMultipleAccountsInfo(adaptiveFeeTierPubkeys);
  const adaptiveFeeTiersPermissionless: InitializedAdaptiveFeeTier[] = [];
  const adaptiveFeeTiersPermissioned: InitializedAdaptiveFeeTier[] = [];
  adaptiveFeeTierAccountInfos.forEach((a, i) => {
    const adaptiveFeeTier = ParsableAdaptiveFeeTier.parse(adaptiveFeeTierPubkeys[i], a);

    const pubkey = adaptiveFeeTierPubkeys[i];
    const isInitialized = adaptiveFeeTier !== null;
    const tickSpacing = adaptiveFeeTier === null ? undefined : adaptiveFeeTier.tickSpacing;
    const defaultBaseFeeRate = adaptiveFeeTier === null ? undefined : PoolUtil.getFeeRate(adaptiveFeeTier.defaultBaseFeeRate).toDecimal().mul(100);

    if (i < PERMISSIONLESS_ADAPTIVE_FEE_TIER_INDEXES.length) {
      adaptiveFeeTiersPermissionless.push({
        feeTierIndex: PERMISSIONLESS_ADAPTIVE_FEE_TIER_INDEXES[i],
        pubkey,
        isInitialized,
        tickSpacing,
        defaultBaseFeeRate,
      });
    }
    else {
      adaptiveFeeTiersPermissioned.push({
        feeTierIndex: PERMISSIONED_ADAPTIVE_FEE_TIER_INDEXES[i - PERMISSIONLESS_ADAPTIVE_FEE_TIER_INDEXES.length],
        pubkey,
        isInitialized,
        tickSpacing,
        defaultBaseFeeRate,
      });
    }
  });
  const configExtension = PDAUtil.getConfigExtension(accountInfo.owner, pubkey).publicKey;

  return {
    meta: toMeta(pubkey, accountInfo, slotContext),
    parsed: whirlpoolsConfigData,
    derived: {
      defaultProtocolFeeRate: PoolUtil.getProtocolFeeRate(whirlpoolsConfigData.defaultProtocolFeeRate).toDecimal().mul(100),
      configExtension,
      feeTiers,
      adaptiveFeeTiersPermissionless,
      adaptiveFeeTiersPermissioned,
    }
  };
}

type WhirlpoolsConfigExtensionDerivedInfo = {
}

type WhirlpoolsConfigExtensionInfo = {
  meta: AccountMetaInfo,
  parsed: WhirlpoolsConfigExtensionData,
  derived: WhirlpoolsConfigExtensionDerivedInfo,
}

export async function getWhirlpoolsConfigExtensionInfo(addr: Address): Promise<WhirlpoolsConfigExtensionInfo> {
  const pubkey = AddressUtil.toPubKey(addr);
  const connection = getConnection();

  const { accountInfo, slotContext } = await getAccountInfo(connection, pubkey);
  const whirlpoolsConfigExtensionData = ParsableWhirlpoolsConfigExtension.parse(pubkey, accountInfo);

  return {
    meta: toMeta(pubkey, accountInfo, slotContext),
    parsed: whirlpoolsConfigExtensionData,
    derived: {}
  };
}

type TokenBadgeDerivedInfo = {
  tokenProgram: TokenProgram,
}

type TokenBadgeInfo = {
  meta: AccountMetaInfo,
  parsed: TokenBadgeData,
  derived: TokenBadgeDerivedInfo,
}

export async function getTokenBadgeInfo(addr: Address): Promise<TokenBadgeInfo> {
  const pubkey = AddressUtil.toPubKey(addr);
  const connection = getConnection();
  const fetcher = buildDefaultAccountFetcher(connection);

  const { accountInfo, slotContext } = await getAccountInfo(connection, pubkey);
  const tokenBadgeData = ParsableTokenBadge.parse(pubkey, accountInfo);

  const mint = await fetcher.getMintInfo(tokenBadgeData.tokenMint, IGNORE_CACHE);

  return {
    meta: toMeta(pubkey, accountInfo, slotContext),
    parsed: tokenBadgeData,
    derived: {
      tokenProgram: toTokenProgram(mint.tokenProgram),
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
  const feeTierData = ParsableFeeTier.parse(pubkey, accountInfo);

  return {
    meta: toMeta(pubkey, accountInfo, slotContext),
    parsed: feeTierData,
    derived: {
      defaultFeeRate: PoolUtil.getFeeRate(feeTierData.defaultFeeRate).toDecimal().mul(100),
    }
  };
}

type LockConfigDerivedInfo = {
  lockedTimestamp: moment.Moment,
}

type LockConfigInfo = {
  meta: AccountMetaInfo,
  parsed: LockConfigData,
  derived: LockConfigDerivedInfo,
}

export async function getLockConfigInfo(addr: Address): Promise<LockConfigInfo> {
  const pubkey = AddressUtil.toPubKey(addr);
  const connection = getConnection();

  const { accountInfo, slotContext } = await getAccountInfo(connection, pubkey);
  const lockConfigData = ParsableLockConfig.parse(pubkey, accountInfo);

  return {
    meta: toMeta(pubkey, accountInfo, slotContext),
    parsed: lockConfigData,
    derived: {
      lockedTimestamp: moment.unix(lockConfigData.lockedTimestamp.toNumber()),
    },
  };
}

type AdaptiveFeeTierDerivedInfo = {
  defaultBaseFeeRate: Decimal,
}

type AdaptiveFeeTierInfo = {
  meta: AccountMetaInfo,
  parsed: AdaptiveFeeTierData,
  derived: AdaptiveFeeTierDerivedInfo,
}

export async function getAdaptiveFeeTierInfo(addr: Address): Promise<AdaptiveFeeTierInfo> {
  const pubkey = AddressUtil.toPubKey(addr);
  const connection = getConnection();

  const { accountInfo, slotContext } = await getAccountInfo(connection, pubkey);
  const adaptiveFeeTierData = ParsableAdaptiveFeeTier.parse(pubkey, accountInfo);

  return {
    meta: toMeta(pubkey, accountInfo, slotContext),
    parsed: adaptiveFeeTierData,
    derived: {
      defaultBaseFeeRate: PoolUtil.getFeeRate(adaptiveFeeTierData.defaultBaseFeeRate).toDecimal().mul(100),
    },
  };
}

type OracleDerivedInfo = {
  tradeEnableTimestamp: moment.Moment,
  lastReferenceUpdateTimestamp: moment.Moment,
  lastMajorSwapTimestamp: moment.Moment,
}

type OracleInfo = {
  meta: AccountMetaInfo,
  parsed: OracleData,
  derived: OracleDerivedInfo,
}

export async function getOracleInfo(addr: Address): Promise<OracleInfo> {
  const pubkey = AddressUtil.toPubKey(addr);
  const connection = getConnection();

  const { accountInfo, slotContext } = await getAccountInfo(connection, pubkey);
  const oracleData = ParsableOracle.parse(pubkey, accountInfo);

  return {
    meta: toMeta(pubkey, accountInfo, slotContext),
    parsed: oracleData,
    derived: {
      tradeEnableTimestamp: moment.unix(oracleData.tradeEnableTimestamp.toNumber()),
      lastReferenceUpdateTimestamp: moment.unix(oracleData.adaptiveFeeVariables.lastReferenceUpdateTimestamp.toNumber()),
      lastMajorSwapTimestamp: moment.unix(oracleData.adaptiveFeeVariables.lastMajorSwapTimestamp.toNumber()),
    },
  };
}

type TickArrayType = "dynamic" | "fixed";

type TickArrayDerivedInfo = {
  tickArrayType: TickArrayType,
  numInitializedTicks: number,
  prevTickArray: PublicKey,
  nextTickArray: PublicKey,
  tickCurrentIndex: number,
  tickSpacing: number,
  ticksInArray: number,
}

type DynamicTickArrayTickBitmap = {
  tickBitmap?: BN,
  tickBitmapArray?: number[],
}

type TickArrayInfo = {
  meta: AccountMetaInfo,
  parsed: TickArrayData & DynamicTickArrayTickBitmap,
  derived: TickArrayDerivedInfo,
}

export async function getTickArrayInfo(addr: Address): Promise<TickArrayInfo> {
  const pubkey = AddressUtil.toPubKey(addr);
  const connection = getConnection();
  const fetcher = buildDefaultAccountFetcher(connection);

  const { accountInfo, slotContext } = await getAccountInfo(connection, pubkey);
  const tickArrayData = ParsableTickArray.parse(pubkey, accountInfo);

  const isDynamic = isDynamicTickArray(accountInfo);

  let tickBitmap: BN | undefined;
  let tickBitmapArray: number[] | undefined;
  if (isDynamic) {
    tickBitmap = getTickBitmap(accountInfo);
    tickBitmapArray = tickBitmap.toArray("le", 16);
  }

  // get whirlpool
  const whirlpoolData = await fetcher.getPool(tickArrayData.whirlpool, IGNORE_CACHE);

  const ticksInArray = whirlpoolData.tickSpacing * TICK_ARRAY_SIZE;
  const prevTickArrayPubkey = PDAUtil.getTickArray(accountInfo.owner, tickArrayData.whirlpool, tickArrayData.startTickIndex - ticksInArray).publicKey;
  const nextTickArrayPubkey = PDAUtil.getTickArray(accountInfo.owner, tickArrayData.whirlpool, tickArrayData.startTickIndex + ticksInArray).publicKey;

  const numInitializedTicks = tickArrayData.ticks.reduce((acc, tick) => {
    return acc + (tick.initialized ? 1 : 0);
  }, 0);

  return {
    meta: toMeta(pubkey, accountInfo, slotContext),
    parsed: { ...tickArrayData, tickBitmap, tickBitmapArray },
    derived: {
      tickArrayType: isDynamic ? "dynamic" : "fixed",
      numInitializedTicks,
      prevTickArray: prevTickArrayPubkey,
      nextTickArray: nextTickArrayPubkey,
      tickCurrentIndex: whirlpoolData.tickCurrentIndex,
      tickSpacing: whirlpoolData.tickSpacing,
      ticksInArray,
    }
  };
}

export function isDynamicTickArray(accountInfo: AccountInfo<Buffer>): boolean {
  return accountInfo.data.subarray(0, 8).equals(Buffer.from(DYNAMIC_TICK_ARRAY_DISCRIMINATOR));
}

function getTickBitmap(accountInfo: AccountInfo<Buffer>): BN {
  const bitmapOffset = 8 + 4 + 32;
  const bitmapLength = 16; // u128
  const bitmapBuffer = accountInfo.data.subarray(bitmapOffset, bitmapOffset + bitmapLength);
  return new BN(bitmapBuffer, "le");
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
      amountA: DecimalUtil.fromBN(new BN(deltaA), decimalsA),
      amountB: DecimalUtil.fromBN(new BN(deltaB), decimalsB),
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
      amountA: DecimalUtil.fromBN(new BN(deltaA), decimalsA),
      amountB: DecimalUtil.fromBN(new BN(deltaB), decimalsB),
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
    const deltaADecimal = DecimalUtil.fromBN(new BN(deltaA), decimalsA);
    const deltaBDecimal = DecimalUtil.fromBN(new BN(deltaB), decimalsB);

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
    const deltaADecimal = DecimalUtil.fromBN(new BN(deltaA), decimalsA);
    const deltaBDecimal = DecimalUtil.fromBN(new BN(deltaB), decimalsB);

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
  positionBundleMintSupply: number;
}

type PositionBundleInfo = {
  meta: AccountMetaInfo,
  parsed: PositionBundleData,
  derived: PositionBundleDerivedInfo,
}

export async function getPositionBundleInfo(addr: Address): Promise<PositionBundleInfo> {
  const pubkey = AddressUtil.toPubKey(addr);
  const connection = getConnection();
  const fetcher = buildDefaultAccountFetcher(connection);

  const { accountInfo, slotContext } = await getAccountInfo(connection, pubkey);
  const positionBundleData = ParsablePositionBundle.parse(pubkey, accountInfo);

  const positionBundleMint = await fetcher.getMintInfo(positionBundleData.positionBundleMint, IGNORE_CACHE);
  const positionBundleMintSupply = Number((positionBundleMint.supply as bigint).toString());

  const occupiedIndexes = PositionBundleUtil.getOccupiedBundleIndexes(positionBundleData);
  const bundledPositionAddresses = occupiedIndexes.map((index) => {
    return PDAUtil.getBundledPosition(accountInfo.owner, positionBundleData.positionBundleMint, index).publicKey
  });

  const bundledPositionDatasMap = await fetcher.getPositions(bundledPositionAddresses, IGNORE_CACHE);
  const bundledPositionDatas = bundledPositionAddresses.map((addr) => bundledPositionDatasMap.get(addr.toBase58()));

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
      positionBundleMintSupply,
    },
  };
}

type PositionDerivedInfoForList = {
  priceLower: Decimal,
  priceUpper: Decimal,
  invertedPriceLower: Decimal,
  invertedPriceUpper: Decimal,
  amounts: TokenAmounts,
  amountA: Decimal,
  amountB: Decimal,
  status: PositionStatusString,
  isBundledPosition: boolean,
  isFullRange: boolean,
}

export type PositionInfoForList = {
  meta: AccountMetaInfo,
  parsed: PositionData,
  derived: PositionDerivedInfoForList,
}

type WhirlpoolDerivedInfoForList = {
  decimalsA: number,
  decimalsB: number,
  decimalsR0?: number,
  decimalsR1?: number,
  decimalsR2?: number,
  tokenProgramA: TokenProgram,
  tokenProgramB: TokenProgram,
  tokenProgramR0?: TokenProgram,
  tokenProgramR1?: TokenProgram,
  tokenProgramR2?: TokenProgram,
  tokenInfoA?: TokenInfo,
  tokenInfoB?: TokenInfo,
  tokenInfoR0?: TokenInfo,
  tokenInfoR1?: TokenInfo,
  tokenInfoR2?: TokenInfo,
}

type WhirlpoolInfoForList = {
  meta: AccountMetaInfo,
  parsed: WhirlpoolData,
  derived: WhirlpoolDerivedInfoForList,
}

export type PoolPositions = {
  whirlpool: WhirlpoolInfoForList,
  positions: PositionInfoForList[],
  positionSummary: {
    numPositions: number,
    numZeroLiquidityPositions: number,
    numFullRangePositions: number,
    numStatusPriceIsInRangePositions: number,
    numStatusPriceIsAboveRangePositions: number,
    numStatusPriceIsBelowRangePositions: number,
  },
}

export const ORDER_BY_TICK_LOWER_INDEX_ASC = (a: PositionInfoForList, b: PositionInfoForList) => {
  const cmpLower = a.parsed.tickLowerIndex - b.parsed.tickLowerIndex;
  if (cmpLower) return cmpLower;
  const cmpUpper = a.parsed.tickUpperIndex - b.parsed.tickUpperIndex;
  return cmpUpper;
}

export const ORDER_BY_TICK_UPPER_INDEX_DESC = (a: PositionInfoForList, b: PositionInfoForList) => {
  const cmpUpper = b.parsed.tickUpperIndex - a.parsed.tickUpperIndex;
  if (cmpUpper) return cmpUpper;
  const cmpLower = b.parsed.tickLowerIndex - a.parsed.tickLowerIndex;
  return cmpLower;
}

export const ORDER_BY_TOKEN_A_DESC = (a: PositionInfoForList, b: PositionInfoForList) => {
  const cmpA = b.derived.amountA.cmp(a.derived.amountA);
  if (cmpA) return cmpA;
  const cmpB = b.derived.amountB.cmp(a.derived.amountB);
  return cmpB;
}

export const ORDER_BY_TOKEN_B_DESC = (a: PositionInfoForList, b: PositionInfoForList) => {
  const cmpB = b.derived.amountB.cmp(a.derived.amountB);
  if (cmpB) return cmpB;
  const cmpA = b.derived.amountA.cmp(a.derived.amountA);
  return cmpA;
}

export async function listPoolPositions(poolAddr: Address): Promise<PoolPositions> {
  const poolPubkey = AddressUtil.toPubKey(poolAddr);
  const connection = getConnection();
  const fetcher = buildDefaultAccountFetcher(connection);

  // get whirlpool
  const { accountInfo, slotContext } = await getAccountInfo(connection, poolPubkey);
  const whirlpoolData = ParsableWhirlpool.parse(poolPubkey, accountInfo);
  const programId = accountInfo.owner;

  // get mints
  const mintPubkeys: PublicKey[] = [];
  mintPubkeys.push(whirlpoolData.tokenMintA);
  mintPubkeys.push(whirlpoolData.tokenMintB);
  mintPubkeys.push(whirlpoolData.rewardInfos[0].mint);
  mintPubkeys.push(whirlpoolData.rewardInfos[1].mint);
  mintPubkeys.push(whirlpoolData.rewardInfos[2].mint);
  const mints = await fetcher.getMintInfos(mintPubkeys, IGNORE_CACHE);
  const decimalsA = mints.get(mintPubkeys[0].toBase58()).decimals;
  const decimalsB = mints.get(mintPubkeys[1].toBase58()).decimals;
  const decimalsR0 = mints.get(mintPubkeys[2].toBase58())?.decimals;
  const decimalsR1 = mints.get(mintPubkeys[3].toBase58())?.decimals;
  const decimalsR2 = mints.get(mintPubkeys[4].toBase58())?.decimals;
  const tokenProgramA = toTokenProgram(mints.get(mintPubkeys[0].toBase58()).tokenProgram);
  const tokenProgramB = toTokenProgram(mints.get(mintPubkeys[1].toBase58()).tokenProgram);
  const tokenProgramR0 = toTokenProgram(mints.get(mintPubkeys[2].toBase58())?.tokenProgram);
  const tokenProgramR1 = toTokenProgram(mints.get(mintPubkeys[3].toBase58())?.tokenProgram);
  const tokenProgramR2 = toTokenProgram(mints.get(mintPubkeys[4].toBase58())?.tokenProgram);

  // get token name
  const tokenList = await getTokenList();
  const tokenInfoA = tokenList.getTokenInfoByMint(mintPubkeys[0]);
  const tokenInfoB = tokenList.getTokenInfoByMint(mintPubkeys[1]);
  const tokenInfoR0 = tokenList.getTokenInfoByMint(mintPubkeys[2]);
  const tokenInfoR1 = tokenList.getTokenInfoByMint(mintPubkeys[3]);
  const tokenInfoR2 = tokenList.getTokenInfoByMint(mintPubkeys[4]);

  const whirlpoolInfoForList: WhirlpoolInfoForList = {
    meta: toMeta(poolPubkey, accountInfo, slotContext),
    parsed: whirlpoolData,
    derived: {
      decimalsA,
      decimalsB,
      decimalsR0,
      decimalsR1,
      decimalsR2,
      tokenProgramA,
      tokenProgramB,
      tokenProgramR0,
      tokenProgramR1,
      tokenProgramR2,
      tokenInfoA,
      tokenInfoB,
      tokenInfoR0,
      tokenInfoR1,
      tokenInfoR2,
    },
  };

  // get positions
  const positionFilters: GetProgramAccountsFilter[] = [
    {dataSize: getAccountSize(AccountName.Position)},
    {memcmp: {offset: 8, bytes: poolPubkey.toBase58()}},
  ];
  const accounts = await connection.getProgramAccounts(programId, {
    commitment: "confirmed",
    encoding: "base64",
    withContext: true,
    filters: positionFilters,
  });

  const positionSlotContext = accounts.context.slot;
  const positions: PositionInfoForList[] = accounts.value.map((a) => {
    const positionData = ParsablePosition.parse(a.pubkey, a.account);

    // get status & share
    const status = PositionUtil.getPositionStatus(whirlpoolData.tickCurrentIndex, positionData.tickLowerIndex, positionData.tickUpperIndex);
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

    // check if bundled position
    const derivedPositionAddress = PDAUtil.getPosition(accountInfo.owner, positionData.positionMint).publicKey;
    const isBundledPosition = !derivedPositionAddress.equals(poolPubkey);

    // check if full range
    const minTickIndex = Math.ceil(MIN_TICK_INDEX / whirlpoolData.tickSpacing) * whirlpoolData.tickSpacing;
    const maxTickIndex = Math.floor(MAX_TICK_INDEX / whirlpoolData.tickSpacing) * whirlpoolData.tickSpacing;
    const isFullRange = positionData.tickLowerIndex === minTickIndex && positionData.tickUpperIndex === maxTickIndex;

    return {
      meta: toMeta(a.pubkey, a.account, positionSlotContext),
      parsed: positionData,
      derived: {
        priceLower,
        priceUpper,
        invertedPriceLower,
        invertedPriceUpper,
        amounts,
        amountA: DecimalUtil.fromBN(amounts.tokenA, decimalsA),
        amountB: DecimalUtil.fromBN(amounts.tokenB, decimalsB),
        status: status === PositionStatus.InRange ? PositionStatusString.PriceIsInRange : (status === PositionStatus.AboveRange ? PositionStatusString.PriceIsAboveRange : PositionStatusString.PriceIsBelowRange),
        isBundledPosition,
        isFullRange,
      }
    };
  });

  positions.sort(ORDER_BY_TICK_LOWER_INDEX_ASC);

  const numPositions = positions.length;
  const numZeroLiquidityPositions = positions.filter((p) => p.parsed.liquidity.isZero()).length;
  const numFullRangePositions = positions.filter((p) => p.derived.isFullRange).length;
  const numStatusPriceIsInRangePositions = positions.filter((p) => p.derived.status === PositionStatusString.PriceIsInRange).length;
  const numStatusPriceIsAboveRangePositions = positions.filter((p) => p.derived.status === PositionStatusString.PriceIsAboveRange).length;
  const numStatusPriceIsBelowRangePositions = positions.filter((p) => p.derived.status === PositionStatusString.PriceIsBelowRange).length;

  return {
    whirlpool: whirlpoolInfoForList,
    positions,
    positionSummary: {
      numPositions,
      numZeroLiquidityPositions,
      numFullRangePositions,
      numStatusPriceIsInRangePositions,
      numStatusPriceIsAboveRangePositions,
      numStatusPriceIsBelowRangePositions,
    },
  };
}

type GetTickArrayResult = (TickArrayData & { isDynamic: boolean }) | null;

async function getTickArrays(connection: Connection, pubkeys: PublicKey[]): Promise<GetTickArrayResult[]> {
  const accountInfos = await connection.getMultipleAccountsInfo(pubkeys);
  const tickArrays: GetTickArrayResult[] = [];
  for (let i=0; i<accountInfos.length; i++) {
    const accountInfo = accountInfos[i];
    if (!accountInfo) {
      tickArrays.push(null);
      continue;
    }
    const isDynamic = isDynamicTickArray(accountInfo);
    const tickArrayData = ParsableTickArray.parse(pubkeys[i], accountInfo);
    tickArrays.push({ ...tickArrayData, isDynamic });
  }
  return tickArrays;
}
