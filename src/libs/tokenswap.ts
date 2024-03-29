import { PublicKey, AccountInfo } from "@solana/web3.js";
import { IGNORE_CACHE, buildDefaultAccountFetcher } from "@orca-so/whirlpools-sdk";
import { Address, BN } from "@coral-xyz/anchor";
import { AddressUtil, DecimalUtil, Percentage } from "@orca-so/common-sdk";
import { computeOutputAmount } from "@orca-so/stablecurve";
import { AccountMetaInfo, bn2u64, getAccountInfo, toFixedDecimal, toMeta } from "./account";
import { getPoolConfigs } from "./orcaapi";
import { getConnection } from "./client";
import { getTokenList, TokenInfo } from "./orcaapi";
import Decimal from "decimal.js";

export const ACCOUNT_DEFINITION = {
  TokenSwap: "https://github.com/solana-labs/solana-program-library/blob/master/token-swap/program/src/state.rs#L104",
}

type CurveType = "ConstantProduct" | "Stable";

type TokenSwapAccountInfo = {
  bumpSeed: number,
  tokenProgramId: PublicKey,
  vaultA: PublicKey,
  vaultB: PublicKey,
  poolMint: PublicKey,
  mintA: PublicKey,
  mintB: PublicKey,
  poolFeeAccount: PublicKey,
  traderFee: Percentage,
  ownerFee: Percentage,
  curveType: CurveType,
  amp?: number,
}

function parseTokenSwapAccount(data: Buffer): TokenSwapAccountInfo  {
  if (data.length !== 324) return null; // data length must be 324

  const dataView = new DataView(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));

  // skip first 2 byte
  let offset = 2;
  const bumpSeed = dataView.getUint8(offset);
  offset += 1;
  const tokenProgramId = new PublicKey(data.slice(offset, offset+32));
  offset += 32;
  const vaultA = new PublicKey(data.slice(offset, offset+32));
  offset += 32;
  const vaultB = new PublicKey(data.slice(offset, offset+32));
  offset += 32;
  const poolMint = new PublicKey(data.slice(offset, offset+32));
  offset += 32;
  const mintA = new PublicKey(data.slice(offset, offset+32));
  offset += 32;
  const mintB = new PublicKey(data.slice(offset, offset+32));
  offset += 32;
  const poolFeeAccount = new PublicKey(data.slice(offset, offset+32));
  offset += 32;
  const traderFeeNum = Number(dataView.getBigUint64(offset, true /* little endian */));
  offset += 8;
  const traderFeeDenom = Number(dataView.getBigUint64(offset, true /* little endian */));
  offset += 8;
  const ownerFeeNum = Number(dataView.getBigUint64(offset, true /* little endian */));
  offset += 8;
  const ownerFeeDenom = Number(dataView.getBigUint64(offset, true /* little endian */));
  offset += 8;
  // skip owner_withdraw_fee and host_fee (Orca doesn't use these fees)
  offset += 8*4
  const curveType = dataView.getUint8(offset);
  offset += 1;
  const stableAmp = Number(dataView.getBigUint64(offset, true /* little endian */));
  offset += 8;

//  const authority_pda = PublicKey.findProgramAddressSync([address.toBuffer()], swap_program);
//  assert(authority_pda[1] === nonce, "nonce unmatch");

  return {
    bumpSeed,
    tokenProgramId,
    vaultA,
    vaultB,
    poolMint,
    mintA,
    mintB,
    poolFeeAccount,
    traderFee: Percentage.fromFraction(traderFeeNum, traderFeeDenom),
    ownerFee: Percentage.fromFraction(ownerFeeNum, ownerFeeDenom),
    curveType: curveType === 0 ? "ConstantProduct" : "Stable",
    amp: curveType === 0 ? undefined : stableAmp,
  };
}


type TokenSwapDerivedInfo = {
  decimalsA: number,
  decimalsB: number,
  decimalsLP: number,
  tokenInfoA?: TokenInfo,
  tokenInfoB?: TokenInfo,
  supplyLP: Decimal,
  tokenVaultAAmount: Decimal,
  tokenVaultBAmount: Decimal,
  poolFeeAccountAmount: Decimal,
  feeRate: Decimal,
  price: Decimal,
  aquaFarm?: PublicKey,
  doubleDip?: PublicKey
}

type TokenSwapInfo = {
  meta: AccountMetaInfo,
  parsed: TokenSwapAccountInfo,
  derived: TokenSwapDerivedInfo,
}

export async function getTokenSwapInfo(addr: Address): Promise<TokenSwapInfo> {
  const pubkey = AddressUtil.toPubKey(addr);
  const connection = getConnection();
  const fetcher = buildDefaultAccountFetcher(connection);

  const { accountInfo, slotContext } = await getAccountInfo(connection, pubkey);
  const tokenSwapAccountInfo = parseTokenSwapAccount(accountInfo.data);

  // get mints
  const mints = Array.from((await fetcher.getMintInfos([
    tokenSwapAccountInfo.mintA,
    tokenSwapAccountInfo.mintB,
    tokenSwapAccountInfo.poolMint,
  ], IGNORE_CACHE)).values());

  // get token name
  const tokenList = await getTokenList();
  const tokenInfoA = tokenList.getTokenInfoByMint(tokenSwapAccountInfo.mintA);
  const tokenInfoB = tokenList.getTokenInfoByMint(tokenSwapAccountInfo.mintB);

  // get accounts
  const accounts = Array.from((await fetcher.getTokenInfos([
    tokenSwapAccountInfo.vaultA,
    tokenSwapAccountInfo.vaultB,
    tokenSwapAccountInfo.poolFeeAccount,
  ], IGNORE_CACHE)).values());

  // get price
  const amountA = DecimalUtil.fromBN(accounts[0].amount, mints[0].decimals);
  const amountB = DecimalUtil.fromBN(accounts[1].amount, mints[1].decimals);
  const decimalsA = mints[0].decimals;
  const decimalsB = mints[1].decimals;
  let price = new Decimal(0);
  if (tokenSwapAccountInfo.curveType === "ConstantProduct" && !amountA.isZero()) {
    price = toFixedDecimal(amountB.div(amountA), decimalsB);
  }
  if (tokenSwapAccountInfo.curveType === "Stable") {
    price = DecimalUtil.fromBN(computeOutputAmount(
      new BN(1 * 10**decimalsA),
      accounts[0].amount,
      accounts[1].amount,
      new BN(tokenSwapAccountInfo.amp),
    ), decimalsB);
  }

  // get fee rate
  let feeRate = tokenSwapAccountInfo.traderFee;
  if (!tokenSwapAccountInfo.ownerFee.denominator.isZero()) { // V1 account's ownerFee is 0
    feeRate = feeRate.add(tokenSwapAccountInfo.ownerFee);
  }

  // offchain data
  const configs = await getPoolConfigs();
  const farm = configs.getAquaFarmByAddress(tokenSwapAccountInfo.poolMint);
  const dd = configs.getDoubleDipByAddress(farm?.farmTokenMint);
  const aquaFarm = farm?.account;
  const doubleDip = dd?.account;

  return {
    meta: toMeta(pubkey, accountInfo, slotContext),
    parsed: tokenSwapAccountInfo,
    derived: {
      decimalsA: mints[0].decimals,
      decimalsB: mints[1].decimals,
      decimalsLP: mints[2].decimals,
      tokenInfoA,
      tokenInfoB,
      supplyLP: DecimalUtil.fromBN(mints[2].supply, mints[2].decimals),
      tokenVaultAAmount: DecimalUtil.fromBN(accounts[0].amount, mints[0].decimals),
      tokenVaultBAmount: DecimalUtil.fromBN(accounts[1].amount, mints[1].decimals),
      poolFeeAccountAmount: DecimalUtil.fromBN(accounts[2]?.amount ?? new BN(0), mints[2].decimals), // feeAccount not found
      feeRate: feeRate.toDecimal().mul(100),
      price,
      aquaFarm,
      doubleDip,
    }
  };
}