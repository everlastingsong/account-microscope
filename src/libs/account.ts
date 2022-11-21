import { PublicKey, AccountInfo } from "@solana/web3.js";
import { Address, BN } from "@project-serum/anchor";
import { DecimalUtil } from "@orca-so/common-sdk";
import { u64 } from "@solana/spl-token";
import Decimal from "decimal.js";


export type AccountMetaInfo = {
  pubkey: PublicKey,
  executable: boolean,
  lamports: number,
  owner: PublicKey,
  rentEpoch?: number,
  data: Buffer,
}

export function toMeta(pubkey: PublicKey, accountInfo: AccountInfo<Buffer>): AccountMetaInfo {
  return {
    pubkey: pubkey,
    ...accountInfo
  }    
}

export function toFixedDecimal(n: Decimal, fixed: number): Decimal {
  return new Decimal(n.toFixed(fixed));
}

export function bn2u64(n: BN): u64 {
  return DecimalUtil.toU64(new Decimal(n.toString()), 0);
}
