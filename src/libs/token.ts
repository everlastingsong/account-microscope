import { buildDefaultAccountFetcher, IGNORE_CACHE, ORCA_WHIRLPOOL_PROGRAM_ID, PDAUtil } from "@orca-so/whirlpools-sdk";
import { Address, utils } from "@coral-xyz/anchor";
import { AccountWithTokenProgram, AddressUtil, DecimalUtil, MintWithTokenProgram, ParsableMintInfo, ParsableTokenAccountInfo } from "@orca-so/common-sdk";
import { PublicKey, ParsedAccountData } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { AccountMetaInfo, getAccountInfo, toFixedDecimal, toMeta } from "./account";
import { getConnection } from "./client";
import { getTokenHolders, TokenHolderEntry } from "./solscanapi";
import Decimal from "decimal.js";
import BN from "bn.js";

export const ACCOUNT_DEFINITION = {
  Mint: "https://github.com/solana-labs/solana-program-library/blob/master/token/program/src/state.rs#L16",
  Account: "https://github.com/solana-labs/solana-program-library/blob/master/token/program/src/state.rs#L86",
}

type TokenAccountDerivedInfo = {
  decimals: number,
  amount: Decimal,
  isATA: boolean,
}

export type TokenAccountInfo = {
  meta: AccountMetaInfo,
  parsed: AccountWithTokenProgram,
  derived: TokenAccountDerivedInfo,
}

type MintDerivedInfo = {
  supply: Decimal,
  metadata: PublicKey,
  largestHolders: TokenHolderEntry[],
  whirlpoolPosition?: PublicKey,
  whirlpoolPositionBundle?: PublicKey,
}

export type MintInfo = {
  meta: AccountMetaInfo,
  parsed: MintWithTokenProgram,
  derived: MintDerivedInfo,
}

export async function getTokenAccountInfo(addr: Address): Promise<TokenAccountInfo> {
  const pubkey = AddressUtil.toPubKey(addr);
  const connection = getConnection();
  const fetcher = buildDefaultAccountFetcher(connection);

  const { accountInfo, slotContext } = await getAccountInfo(connection, pubkey);
  const splTokenAccountInfo = ParsableTokenAccountInfo.parse(pubkey, accountInfo);

  // get mint
  const mint = await fetcher.getMintInfo(splTokenAccountInfo.mint, IGNORE_CACHE);

  // isATA ?
  const ataAddress = await utils.token.associatedAddress({ mint: splTokenAccountInfo.mint, owner: splTokenAccountInfo.owner });
  const isATA = ataAddress.equals(pubkey);

  return {
    meta: toMeta(pubkey, accountInfo, slotContext),
    parsed: splTokenAccountInfo,
    derived: {
      decimals: mint.decimals,
      amount: DecimalUtil.fromBN(new BN(splTokenAccountInfo.amount.toString()), mint.decimals),
      isATA,
    }
  };
}

export async function getMintInfo(addr: Address): Promise<MintInfo> {
  const pubkey = AddressUtil.toPubKey(addr);
  const connection = getConnection();
  const fetcher = buildDefaultAccountFetcher(connection);

  const { accountInfo, slotContext } = await getAccountInfo(connection, pubkey);
  const splMintInfo = ParsableMintInfo.parse(pubkey, accountInfo);

  // metaplex metadata
  const metadata = PDAUtil.getPositionMetadata(pubkey).publicKey;

  // check if whirlpool position mint
  const positionPubkey = PDAUtil.getPosition(ORCA_WHIRLPOOL_PROGRAM_ID /* cannot consider other deployment */, pubkey).publicKey;
  const position = await fetcher.getPosition(positionPubkey, IGNORE_CACHE);

  // check if whirlpool position bundle mint
  const positionBundlePubkey = PDAUtil.getPositionBundle(ORCA_WHIRLPOOL_PROGRAM_ID /* cannot consider other deployment */, pubkey).publicKey;
  const positionBundle = await fetcher.getPositionBundle(positionBundlePubkey, IGNORE_CACHE);

  // top 10 holders
  const largestHolders = await getTokenHolders(pubkey);
  
  return {
    meta: toMeta(pubkey, accountInfo, slotContext),
    parsed: splMintInfo,
    derived: {
      supply: DecimalUtil.fromBN(new BN(splMintInfo.supply.toString()), splMintInfo.decimals),
      metadata,
      largestHolders,
      whirlpoolPosition: position === null ? undefined : positionPubkey,
      whirlpoolPositionBundle: positionBundle === null ? undefined : positionBundlePubkey,
    }
  };
}

export type TokenAccountListEntry = {
  address: PublicKey,
  mint: PublicKey,
  decimals: number,
  amount: BN,
  uiAmount: Decimal,
  isATA: boolean,
  extension: {
    whirlpool?: {
      position?: PublicKey,
      positionBundle?: PublicKey,
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

      const amount = new BN(accountInfo.tokenAmount.amount);
      const uiAmount = DecimalUtil.fromBN(amount, decimals);

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
  const fetcher = buildDefaultAccountFetcher(connection);

  const candidates: { index: number; position: PublicKey; bundle: PublicKey }[] = [];
  tokenAccountList.forEach((ta, i) => {
    if (ta.decimals > 0) return;
    if (!ta.amount.eqn(1)) return;

    candidates.push({
      index: i,
      position: PDAUtil.getPosition(
        ORCA_WHIRLPOOL_PROGRAM_ID /* cannot consider other deployment */,
        ta.mint
      ).publicKey,
      bundle: PDAUtil.getPositionBundle(
        ORCA_WHIRLPOOL_PROGRAM_ID /* cannot consider other deployment */,
        ta.mint
      ).publicKey,
    });
  });

  if (candidates.length === 0) return;

  const whirlpoolPositions = await fetcher.getPositions(
    candidates.map((c) => c.position),
    IGNORE_CACHE
  );

  const whirlpoolPositionBundles = await fetcher.getPositionBundles(
    candidates.map((c) => c.bundle),
    IGNORE_CACHE
  );

  candidates.forEach((c) => {
    if (whirlpoolPositions.get(c.position.toBase58())) {
      const current = tokenAccountList[c.index].extension;
      tokenAccountList[c.index].extension = {
        ...current,
        whirlpool: {
          position: c.position,
        }
      };
    }

    if (whirlpoolPositionBundles.get(c.bundle.toBase58())) {
      const current = tokenAccountList[c.index].extension;
      tokenAccountList[c.index].extension = {
        ...current,
        whirlpool: {
          positionBundle: c.bundle,
        }
      };
    }
  });
}