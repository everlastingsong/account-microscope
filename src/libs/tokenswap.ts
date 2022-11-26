import { PublicKey, AccountInfo } from "@solana/web3.js";
import { AccountFetcher } from "@orca-so/whirlpools-sdk";
import { Address, BN } from "@project-serum/anchor";
import { AddressUtil, DecimalUtil, Percentage } from "@orca-so/common-sdk";
import { computeOutputAmount } from "@orca-so/stablecurve";
import { u64 } from "@solana/spl-token";
import { AccountMetaInfo, bn2u64, toFixedDecimal, toMeta } from "./account";
import { getConnection } from "./client";
import Decimal from "decimal.js";


type CurveType = "ConstantProduct" | "StableCurve";

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
    curveType: curveType === 0 ? "ConstantProduct" : "StableCurve",
    amp: curveType === 0 ? undefined : stableAmp,
  };
}


type TokenSwapDerivedInfo = {
  decimalsA: number,
  decimalsB: number,
  decimalsLP: number,
  supplyLP: Decimal,
  tokenVaultAAmount: Decimal,
  tokenVaultBAmount: Decimal,
  poolFeeAccountAmount: Decimal,
  feeRate: Decimal,
  price: Decimal,
}

type TokenSwapInfo = {
  meta: AccountMetaInfo,
  parsed: TokenSwapAccountInfo,
  derived: TokenSwapDerivedInfo,
}

export async function getTokenSwapInfo(addr: Address): Promise<TokenSwapInfo> {
  const pubkey = AddressUtil.toPubKey(addr);
  const connection = getConnection();
  const fetcher = new AccountFetcher(connection);

  const accountInfo = await connection.getAccountInfo(pubkey);
  const tokenSwapAccountInfo = parseTokenSwapAccount(accountInfo.data);

  // get mints
  const mints = await fetcher.listMintInfos([
    tokenSwapAccountInfo.mintA,
    tokenSwapAccountInfo.mintB,
    tokenSwapAccountInfo.poolMint,
  ], true);

  // get accounts
  const accounts = await fetcher.listTokenInfos([
    tokenSwapAccountInfo.vaultA,
    tokenSwapAccountInfo.vaultB,
    tokenSwapAccountInfo.poolFeeAccount,
  ], true);

  // get price
  const amountA = DecimalUtil.fromU64(accounts[0].amount, mints[0].decimals);
  const amountB = DecimalUtil.fromU64(accounts[1].amount, mints[1].decimals);
  const decimalsA = mints[0].decimals;
  const decimalsB = mints[1].decimals;
  let price = new Decimal(0);
  if (tokenSwapAccountInfo.curveType === "ConstantProduct" && !amountA.isZero()) {
    price = toFixedDecimal(amountB.div(amountA), decimalsB);
  }
  if (tokenSwapAccountInfo.curveType === "StableCurve") {
    price = DecimalUtil.fromU64(computeOutputAmount(
      new u64(1 * 10**decimalsA),
      accounts[0].amount,
      accounts[1].amount,
      new u64(tokenSwapAccountInfo.amp),
    ), decimalsB);
  }

  return {
    meta: toMeta(pubkey, accountInfo),
    parsed: tokenSwapAccountInfo,
    derived: {
      decimalsA: mints[0].decimals,
      decimalsB: mints[1].decimals,
      decimalsLP: mints[2].decimals,
      supplyLP: DecimalUtil.fromU64(mints[2].supply, mints[2].decimals),
      tokenVaultAAmount: DecimalUtil.fromU64(accounts[0].amount, mints[0].decimals),
      tokenVaultBAmount: DecimalUtil.fromU64(accounts[1].amount, mints[1].decimals),
      poolFeeAccountAmount: DecimalUtil.fromU64(accounts[2].amount, mints[2].decimals),
      feeRate: tokenSwapAccountInfo.ownerFee.add(tokenSwapAccountInfo.traderFee).toDecimal().mul(100),
      price,
    }
  };
}