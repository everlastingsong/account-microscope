import { Connection, PublicKey, AccountInfo } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { DecimalUtil } from "@orca-so/common-sdk";
import { u64 } from "@solana/spl-token";
import Decimal from "decimal.js";


export type AccountMetaInfo = {
  slotContext: number,
  pubkey: PublicKey,
  executable: boolean,
  lamports: number,
  owner: PublicKey,
  rentEpoch?: number,
  data: Buffer,
}

export async function getAccountInfo(connection: Connection, pubkey: PublicKey): Promise<{ accountInfo: AccountInfo<Buffer>, slotContext: number }> {
  const fetched = await connection.getAccountInfoAndContext(pubkey);
  return {
    accountInfo: fetched.value,
    slotContext: fetched.context.slot,
  };
}

export function toMeta(pubkey: PublicKey, accountInfo: AccountInfo<Buffer>, slotContext: number): AccountMetaInfo {
  return {
    slotContext,
    pubkey,
    ...accountInfo
  }    
}

export function toFixedDecimal(n: Decimal, fixed: number): Decimal {
  return new Decimal(n.toFixed(fixed));
}

export function bn2u64(n: BN): u64 {
  return DecimalUtil.toU64(new Decimal(n.toString()), 0);
}

export function toBase64(buf: Buffer): string {
  return buf.toString('base64');
}

export type AccountJSON = {
  pubkey: string,
  account: {
    executable: boolean,
    lamports: number,
    owner: string,
    rentEpoch: number,
    data: [string, string],
  },
};

export function toAccountJSON(meta: AccountMetaInfo): AccountJSON {
  return {
    pubkey: meta.pubkey.toBase58(),
    account: {
      executable: meta.executable,
      lamports: meta.lamports,
      owner: meta.owner.toBase58(),
      rentEpoch: meta.rentEpoch ?? 0,
      data: [meta.data.toString("base64"), "base64"],
    },
  };
}
