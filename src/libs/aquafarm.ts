import { PublicKey, AccountInfo } from "@solana/web3.js";
import { AccountFetcher } from "@orca-so/whirlpools-sdk";
import { Aquafarm, GlobalFarm, UserFarm } from "@orca-so/aquafarm";
import { getAuthorityAndNonce } from "@orca-so/aquafarm/dist/models/GlobalFarm";
import { decodeGlobalFarmBuffer, decodeUserFarmBuffer } from "@orca-so/aquafarm/dist/utils/layout";
import { Address, BN } from "@project-serum/anchor";
import { AddressUtil, DecimalUtil, Percentage } from "@orca-so/common-sdk";
import { u64 } from "@solana/spl-token";
import { AccountMetaInfo, bn2u64, toFixedDecimal, toMeta } from "./account";
import { getConnection } from "./client";
import { getPoolConfigs } from "./orcaapi";
import Decimal from "decimal.js";
import moment from "moment";


type UserFarmDerivedInfo = {
  baseTokensConverted: Decimal,
  rewardMint: PublicKey,
  decimalsBase: number,
  decimalsFarm: number,
  decimalsReward: number,
  sharePercentOfFarm: Decimal,
  rewardWeeklyAmount: Decimal,
  currentHarvestableAmount: Decimal,
  harvestableAmount: Decimal,
  rewardWeeklyEmission: Decimal,
}

type UserFarmParsedInfo = {
  isInitialized: boolean,
  accountType: number,
  globalFarm: PublicKey,
  owner: PublicKey,
  baseTokensConverted: u64,
  cumulativeEmissionsCheckpoint: Decimal,
}

type UserFarmInfo = {
  meta: AccountMetaInfo,
  parsed: UserFarmParsedInfo,
  derived: UserFarmDerivedInfo,
}

type GlobalFarmDerivedInfo = {
  authority: PublicKey,
  rewardMint: PublicKey,
  decimalsBase: number,
  decimalsFarm: number,
  decimalsReward: number,
  supplyBase: Decimal,
  supplyFarm: Decimal,
  rewardVaultAmount: Decimal,
  lastUpdatedTimestamp: moment.Moment,
  rewardWeeklyEmission: Decimal,
  isAquaFarm: boolean,
  isDoubleDip: boolean,
  pool: PublicKey,
  aquaFarm?: PublicKey,
  doubleDip?: PublicKey,
  poolName: string,
}

type GlobalFarmParsedInfo = {
  isInitialized: boolean,
  accountType: number,
  nonce: number,
  tokenProgramId: PublicKey,
  emissionsAuthority: PublicKey,
  removeRewardsAuthority: PublicKey,
  baseTokenMint: PublicKey,
  baseTokenVault: PublicKey,
  rewardTokenVault: PublicKey,
  farmTokenMint: PublicKey,
  emissionsPerSecondNumerator: u64,
  emissionsPerSecondDenominator: u64,
  lastUpdatedTimestamp: u64,
  cumulativeEmissionsPerFarmToken: Decimal,
}

type GlobalFarmInfo = {
  meta: AccountMetaInfo,
  parsed: GlobalFarmParsedInfo,
  derived: GlobalFarmDerivedInfo,
}

export async function getGlobalFarmInfo(addr: Address): Promise<GlobalFarmInfo> {
  const pubkey = AddressUtil.toPubKey(addr);
  const connection = getConnection();
  const fetcher = new AccountFetcher(connection);

  const accountInfo = await connection.getAccountInfo(pubkey);
  const globalFarmInfo = decodeGlobalFarmBuffer(accountInfo);

  // get accounts
  const accounts = await fetcher.listTokenInfos([globalFarmInfo.baseTokenVault, globalFarmInfo.rewardTokenVault], true);
  const rewardMint = accounts[1].mint;

  // get mints
  const mints = await fetcher.listMintInfos([globalFarmInfo.baseTokenMint, globalFarmInfo.farmTokenMint, rewardMint], true);
  const decimalsBase = mints[0].decimals;
  const decimalsFarm = mints[1].decimals;
  const decimalsReward = mints[2].decimals;
  const supplyBase = DecimalUtil.fromU64(mints[0].supply, decimalsBase);
  const supplyFarm = DecimalUtil.fromU64(mints[1].supply, decimalsFarm);
  const rewardVaultAmount = DecimalUtil.fromU64(accounts[1].amount, decimalsReward);

  // get authority
  const authority = (await getAuthorityAndNonce(pubkey, accountInfo.owner))[0];

  // get weekly emission
  let rewardWeeklyEmission = new Decimal(0);
  if (!globalFarmInfo.emissionsPerSecondDenominator.isZero()) {
    const seconds_in_week = 60*60*24*7;
    const num = new Decimal(globalFarmInfo.emissionsPerSecondNumerator.toString());
    const denom = new Decimal(globalFarmInfo.emissionsPerSecondDenominator.toString());
    rewardWeeklyEmission = toFixedDecimal(DecimalUtil.adjustDecimals(num.mul(seconds_in_week).div(denom), decimalsReward), decimalsReward);
  }

  // offchain data
  const configs = await getPoolConfigs();
  let pool: PublicKey = undefined;
  let poolName: string = undefined;
  let aquaFarm: PublicKey = undefined;
  let doubleDip: PublicKey = undefined;
  const isAquaFarm = configs.getAquaFarmByAddress(pubkey) !== undefined;
  if (isAquaFarm) {
    const farm = configs.getAquaFarmByAddress(pubkey);
    pool = configs.getPoolByAddress(farm.baseTokenMint).account;
    aquaFarm = farm.account;
    doubleDip = configs.getDoubleDipByAddress(farm.farmTokenMint)?.account;
    poolName = configs.getPoolByAddress(farm.baseTokenMint).name;
  }
  const isDoubleDip = configs.getDoubleDipByAddress(pubkey) !== undefined;
  if (isDoubleDip) {
    const dd = configs.getDoubleDipByAddress(pubkey);
    const farm = configs.getAquaFarmByAddress(dd.baseTokenMint);
    doubleDip = dd.account;
    aquaFarm = farm.account;
    pool = configs.getPoolByAddress(farm.baseTokenMint).account;
    poolName = configs.getPoolByAddress(farm.baseTokenMint).name;
  }

  return {
    meta: toMeta(pubkey, accountInfo),
    parsed: globalFarmInfo,
    derived: {
      authority,
      rewardMint,
      decimalsBase,
      decimalsFarm,
      decimalsReward,
      supplyBase,
      supplyFarm,
      rewardVaultAmount,
      lastUpdatedTimestamp: moment.unix(globalFarmInfo.lastUpdatedTimestamp.toNumber()),
      rewardWeeklyEmission,
      isAquaFarm,
      isDoubleDip,
      pool,
      aquaFarm,
      doubleDip,
      poolName,
    }
  };
}

export async function getUserFarmInfo(addr: Address): Promise<UserFarmInfo> {
  const pubkey = AddressUtil.toPubKey(addr);
  const connection = getConnection();

  const accountInfo = await connection.getAccountInfo(pubkey);
  const userFarmInfo = decodeUserFarmBuffer(accountInfo);

  // get global farm
  const globalFarmInfo = await getGlobalFarmInfo(userFarmInfo.globalFarm);
  const decimalsReward = globalFarmInfo.derived.decimalsReward;

  // get amount
  const baseTokensConverted = DecimalUtil.fromU64(userFarmInfo.baseTokensConverted, globalFarmInfo.derived.decimalsBase);

  // get harvestable amount
  const [currentHarvestableAmountU64, harvestableAmountU64] = getHarvestableAmount(
    pubkey,
    globalFarmInfo,
    userFarmInfo,
  );

  let currentHarvestableAmount = undefined;
  if (currentHarvestableAmountU64 !== undefined) {
    currentHarvestableAmount = DecimalUtil.fromU64(currentHarvestableAmountU64, decimalsReward);
  }
  let harvestableAmount = undefined;
  if (harvestableAmountU64 !== undefined) {
    harvestableAmount = DecimalUtil.fromU64(harvestableAmountU64, decimalsReward);
  }

  // get share & weely reward
  let sharePercentOfFarm = new Decimal(0);
  if (!globalFarmInfo.derived.supplyFarm.isZero()) {
    sharePercentOfFarm = toFixedDecimal(baseTokensConverted.mul(100).div(globalFarmInfo.derived.supplyFarm), 9);
  }
  const rewardWeeklyAmount = toFixedDecimal(globalFarmInfo.derived.rewardWeeklyEmission.mul(sharePercentOfFarm.div(100)), decimalsReward);

  return {
    meta: toMeta(pubkey, accountInfo),
    parsed: userFarmInfo,
    derived: {
      rewardMint: globalFarmInfo.derived.rewardMint,
      decimalsBase: globalFarmInfo.derived.decimalsBase,
      decimalsFarm: globalFarmInfo.derived.decimalsFarm,
      decimalsReward: globalFarmInfo.derived.decimalsReward,
      baseTokensConverted,
      sharePercentOfFarm,
      rewardWeeklyAmount,
      currentHarvestableAmount,
      harvestableAmount,
      rewardWeeklyEmission: globalFarmInfo.derived.rewardWeeklyEmission,
    }
  };
}

function getHarvestableAmount(userPubkey: PublicKey, global: GlobalFarmInfo, user: UserFarmParsedInfo): [u64|undefined, u64|undefined] {
  const aquafarm = new Aquafarm(
    new GlobalFarm({...global.parsed, publicKey: global.meta.pubkey, authority: global.derived.authority}),
    global.meta.owner,
    new UserFarm({...user, publicKey: userPubkey})
  );
  const farmSupplyU64 = DecimalUtil.toU64(global.derived.supplyFarm, global.derived.decimalsFarm);
  return [
    aquafarm.getCurrentHarvestableAmount(farmSupplyU64),
    aquafarm.getHarvestableAmount(),
  ];
}