import { AccountFetcher, ORCA_WHIRLPOOL_PROGRAM_ID, ParsableMintInfo, ParsableTokenInfo, PDAUtil } from "@orca-so/whirlpools-sdk";
import { Address } from "@project-serum/anchor";
import { AddressUtil, DecimalUtil } from "@orca-so/common-sdk";
import { PublicKey } from "@solana/web3.js";
import { MintInfo as SplMintInfo, AccountInfo as SplAccountInfo } from "@solana/spl-token";
import { AccountMetaInfo, toFixedDecimal, toMeta } from "./account";
import { getConnection } from "./client";
import Decimal from "decimal.js";

export const ACCOUNT_DEFINITION = {
  Mint: "https://github.com/solana-labs/solana-program-library/blob/master/token/program/src/state.rs#L16",
  Account: "https://github.com/solana-labs/solana-program-library/blob/master/token/program/src/state.rs#L86",
}

type TokenAccountDerivedInfo = {
  decimals: number,
  amount: Decimal,
}

type TokenAccountInfo = {
  meta: AccountMetaInfo,
  parsed: SplAccountInfo,
  derived: TokenAccountDerivedInfo,
}

type MintDerivedInfo = {
  supply: Decimal,
  whirlpoolPosition?: PublicKey,
}

type MintInfo = {
  meta: AccountMetaInfo,
  parsed: SplMintInfo,
  derived: MintDerivedInfo,
}

export async function getTokenAccountInfo(addr: Address): Promise<TokenAccountInfo> {
  const pubkey = AddressUtil.toPubKey(addr);
  const connection = getConnection();
  const fetcher = new AccountFetcher(connection);

  const accountInfo = await connection.getAccountInfo(pubkey);
  const splTokenAccountInfo = ParsableTokenInfo.parse(accountInfo.data);

  // get mint
  const mint = await fetcher.getMintInfo(splTokenAccountInfo.mint, true);

  return {
    meta: toMeta(pubkey, accountInfo),
    parsed: splTokenAccountInfo,
    derived: {
      decimals: mint.decimals,
      amount: DecimalUtil.fromU64(splTokenAccountInfo.amount, mint.decimals),
    }
  };
}

export async function getMintInfo(addr: Address): Promise<MintInfo> {
  const pubkey = AddressUtil.toPubKey(addr);
  const connection = getConnection();
  const fetcher = new AccountFetcher(connection);

  const accountInfo = await connection.getAccountInfo(pubkey);
  const splMintInfo = ParsableMintInfo.parse(accountInfo.data);

  // check if whirlpool position mint
  const positionPubkey = PDAUtil.getPosition(ORCA_WHIRLPOOL_PROGRAM_ID /* cannot consider other deployment */, pubkey).publicKey;
  const position = await fetcher.getPosition(positionPubkey, true);

  return {
    meta: toMeta(pubkey, accountInfo),
    parsed: splMintInfo,
    derived: {
      supply: DecimalUtil.fromU64(splMintInfo.supply, splMintInfo.decimals),
      whirlpoolPosition: position === null ? undefined : positionPubkey,
    }
  };
}
