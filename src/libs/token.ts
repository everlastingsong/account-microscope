import { AccountFetcher, ORCA_WHIRLPOOL_PROGRAM_ID, ParsableMintInfo, ParsableTokenInfo, PDAUtil } from "@orca-so/whirlpools-sdk";
import { Address, utils } from "@project-serum/anchor";
import { AddressUtil, DecimalUtil } from "@orca-so/common-sdk";
import { PublicKey, ParsedAccountData } from "@solana/web3.js";
import { u64, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { MintInfo as SplMintInfo, AccountInfo as SplAccountInfo } from "@solana/spl-token";
import { AccountMetaInfo, toFixedDecimal, toMeta } from "./account";
import { getConnection } from "./client";
import { getTokenHolders, TokenHolderEntry } from "./solscanapi";
import Decimal from "decimal.js";

export const ACCOUNT_DEFINITION = {
  Mint: "https://github.com/solana-labs/solana-program-library/blob/master/token/program/src/state.rs#L16",
  Account: "https://github.com/solana-labs/solana-program-library/blob/master/token/program/src/state.rs#L86",
}

type TokenAccountDerivedInfo = {
  decimals: number,
  amount: Decimal,
  isATA: boolean,
}

type TokenAccountInfo = {
  meta: AccountMetaInfo,
  parsed: SplAccountInfo,
  derived: TokenAccountDerivedInfo,
}

type MintDerivedInfo = {
  supply: Decimal,
  largestHolders: TokenHolderEntry[],
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

  // isATA ?
  const ataAddress = await utils.token.associatedAddress({ mint: splTokenAccountInfo.mint, owner: splTokenAccountInfo.owner });
  const isATA = ataAddress.equals(pubkey);

  return {
    meta: toMeta(pubkey, accountInfo),
    parsed: splTokenAccountInfo,
    derived: {
      decimals: mint.decimals,
      amount: DecimalUtil.fromU64(splTokenAccountInfo.amount, mint.decimals),
      isATA,
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

  // top 10 holders
  const largestHolders = await getTokenHolders(pubkey);
  
  return {
    meta: toMeta(pubkey, accountInfo),
    parsed: splMintInfo,
    derived: {
      supply: DecimalUtil.fromU64(splMintInfo.supply, splMintInfo.decimals),
      largestHolders,
      whirlpoolPosition: position === null ? undefined : positionPubkey,
    }
  };
}

export type TokenAccountListEntry = {
  address: PublicKey,
  mint: PublicKey,
  decimals: number,
  amount: u64,
  uiAmount: Decimal,
  isATA: boolean,
  extension: {
    whirlpool?: {
      position?: PublicKey,
      positionBundle?: PublicKey, // future
    },
  }
};

export type TokenAccountList = TokenAccountListEntry[];

export async function listTokenAccounts(wallet: Address): Promise<TokenAccountList> {
  const pubkey = AddressUtil.toPubKey(wallet);
  const connection = getConnection();

  const parsedAccounts = (await connection.getParsedTokenAccountsByOwner(
    pubkey,
    { programId: TOKEN_PROGRAM_ID },
    "confirmed"
  )).value;

  const result: TokenAccountList = [];
  for (const account of parsedAccounts) {
    try {
      const address = account.pubkey;
      const accountData = account.account.data as ParsedAccountData;
      const accountInfo = accountData.parsed["info"];
      const mint = new PublicKey(accountInfo.mint);
      const decimals = accountInfo.tokenAmount.decimals;

      const amount = new u64(accountInfo.tokenAmount.amount);
      const uiAmount = DecimalUtil.fromU64(amount, decimals);

      const isATA = (await utils.token.associatedAddress({
        mint: mint,
        owner: pubkey,
      })).equals(
        account.pubkey
      );

      result.push({
        address,
        amount,
        decimals,
        isATA,
        mint,
        uiAmount,
        extension: {}
      });  
    } catch (e) {}
  }

  // fill extention
  await dispatchWhirlpoolExtension(result);

  return result;
}

async function dispatchWhirlpoolExtension(tokenAccountList: TokenAccountList) {
  const connection = getConnection();
  const fetcher = new AccountFetcher(connection);

  const candidates: { index: number; address: PublicKey }[] = [];
  tokenAccountList.forEach((ta, i) => {
    if (ta.decimals > 0) return;
    if (!ta.amount.eqn(1)) return;

    candidates.push({
      index: i,
      address: PDAUtil.getPosition(
        ORCA_WHIRLPOOL_PROGRAM_ID /* cannot consider other deployment */,
        ta.mint
      ).publicKey
    });
  });

  if (candidates.length === 0) return;

  const whirlpoolPositions = await fetcher.listPositions(
    candidates.map((c) => c.address),
    true
  );

  candidates.forEach((c, i) => {
    if (whirlpoolPositions[i] === null) return;

    const current = tokenAccountList[c.index].extension;
    tokenAccountList[c.index].extension = {
      ...current,
      whirlpool: {
        position: c.address,
      }
    };
  });
}