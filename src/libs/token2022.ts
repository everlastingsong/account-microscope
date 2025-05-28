import { Address, utils } from "@coral-xyz/anchor";
import { AddressUtil, DecimalUtil } from "@orca-so/common-sdk";
import {
  TOKEN_2022_PROGRAM_ID,
  Mint,
  unpackMint,
  Account,
  unpackAccount,
  ExtensionType,
  getExtensionTypes,
  getExtensionData,
// mint
  getTransferFeeConfig, TransferFeeConfig,
  getMintCloseAuthority, MintCloseAuthority,
  // getConfidentialTransferMint
  getDefaultAccountState, DefaultAccountState,
  getNonTransferable, NonTransferable,
  getInterestBearingMintConfigState, InterestBearingMintConfigState,
  getPermanentDelegate, PermanentDelegate,
  getTransferHook, TransferHook,
  getMetadataPointerState, MetadataPointer,
  // getTokenMetadata, 
// token
  getTransferFeeAmount, TransferFeeAmount,
  // getConfidentialTransferAccount
  getImmutableOwner, ImmutableOwner,
  getMemoTransfer, MemoTransfer,
  getCpiGuard, CpiGuard,
  getNonTransferableAccount, NonTransferableAccount,
  getTransferHookAccount, TransferHookAccount,
} from "@solana/spl-token-2022";
import { TokenMetadata, unpack as unpackTokenMetadata } from '@solana/spl-token-metadata';
import { AccountMetaInfo, getAccountInfo, toMeta } from "./account";
import { getConnection } from "./client";
import Decimal from "decimal.js";
import BN from "bn.js";
import { ORCA_WHIRLPOOL_PROGRAM_ID, ORCA_WHIRLPOOLS_CONFIG, ParsableTokenBadge, PDAUtil } from "@orca-so/whirlpools-sdk";
import { PublicKey } from "@solana/web3.js";

export const ACCOUNT_DEFINITION = {
  Mint: "https://github.com/solana-labs/solana-program-library/blob/master/token/program-2022/src/state.rs#L22",
  Account: "https://github.com/solana-labs/solana-program-library/blob/master/token/program-2022/src/state.rs#L93",
}

type TokenAccount2022DerivedInfo = {
  decimals: number,
  amount: Decimal,
  isATA: boolean,
}

type TokenAccount2022Extensions = {
  transferFeeAmount: TransferFeeAmount | null,
  // confidentialTransferAccount
  immutableOwner: ImmutableOwner | null,
  memoTransfer: MemoTransfer | null,
  cpiGuard: CpiGuard | null,
  nonTransferableAccount: NonTransferableAccount | null,
  transferHookAccount: TransferHookAccount | null,
}

export type TokenAccount2022Info = {
  meta: AccountMetaInfo,
  parsed: {
    base: Account,
    extensions: TokenAccount2022Extensions,
    unknownExtensions: ExtensionType[],
  },
  derived: TokenAccount2022DerivedInfo,
}

type Mint2022DerivedInfo = {
  supply: Decimal,
  metadataMetaplex: PublicKey,
  metadataFluxbeam: PublicKey,
  isTokenBadgeInitialized: boolean,
  tokenBadge: PublicKey,
}

type Mint2022Extensions = {
  transferFeeConfig: TransferFeeConfig | null,
  mintCloseAuthority: MintCloseAuthority | null,
  // confidentialTransferMint
  defaultAccountState: DefaultAccountState | null,
  nonTransferable: NonTransferable | null,
  interestBearingConfig: InterestBearingMintConfigState | null,
  permanentDelegate: PermanentDelegate | null,
  transferHook: TransferHook | null,
  metadataPointer: Partial<MetadataPointer> | null,
  tokenMetadata: TokenMetadata | null, 
}

export type Mint2022Info = {
  meta: AccountMetaInfo,
  parsed: {
    base: Mint,
    extensions: Mint2022Extensions,
    unknownExtensions: ExtensionType[],
  },
  derived: Mint2022DerivedInfo,
}

export async function getTokenAccount2022Info(addr: Address): Promise<TokenAccount2022Info> {
  const pubkey = AddressUtil.toPubKey(addr);
  const connection = getConnection();

  const { accountInfo, slotContext } = await getAccountInfo(connection, pubkey);
  const account = unpackAccount(pubkey, accountInfo, TOKEN_2022_PROGRAM_ID);

  const { accountInfo: mintInfo } = await getAccountInfo(connection, account.mint);
  const mint = unpackMint(account.mint, mintInfo, TOKEN_2022_PROGRAM_ID);

  // extention
  const transferFeeAmount = getTransferFeeAmount(account);
  // const confidentialTransferAccount = not implemented yet
  const immutableOwner = getImmutableOwner(account);
  const memoTransfer = getMemoTransfer(account);
  const cpiGuard = getCpiGuard(account);
  const nonTransferableAccount = getNonTransferableAccount(account);
  const transferHookAccount = getTransferHookAccount(account);

  // tlvData: Type(2bytes) + Length(2bytes) + Value(Length bytes)
  const extensions = getExtensionTypes(account.tlvData);
  const unknownExtensions = extensions.sort().filter((e) => {
    switch (e) {
      case ExtensionType.TransferFeeAmount:
      case ExtensionType.ImmutableOwner:
      case ExtensionType.MemoTransfer:
      case ExtensionType.CpiGuard:
      case ExtensionType.NonTransferableAccount:
      case ExtensionType.TransferHookAccount:
        return false;
      default:
        return true;
    }
  });

  // isATA ?
  const ataAddress = await utils.token.associatedAddress({ mint: account.mint, owner: account.owner });
  const isATA = ataAddress.equals(pubkey);

  return {
    meta: toMeta(pubkey, accountInfo, slotContext),
    parsed: {
      base: account,
      extensions: {
        transferFeeAmount,
        immutableOwner,
        memoTransfer,
        cpiGuard,
        nonTransferableAccount,
        transferHookAccount,
      },
      unknownExtensions,
    },
    derived: {
      decimals: mint.decimals,
      amount: DecimalUtil.fromBN(new BN(account.amount.toString()), mint.decimals),
      isATA,
    }
  };
}

const FLUXBEAM_METADATA_PROGRAM_ADDRESS = new PublicKey("META4s4fSmpkTbZoUsgC1oBnWB31vQcmnN8giPw51Zu");
export async function getMint2022Info(addr: Address): Promise<Mint2022Info> {
  const pubkey = AddressUtil.toPubKey(addr);
  const connection = getConnection();

  const { accountInfo, slotContext } = await getAccountInfo(connection, pubkey);
  const mint = unpackMint(pubkey, accountInfo, TOKEN_2022_PROGRAM_ID);

  // metaplex metadata
  const metadataMetaplex = PDAUtil.getPositionMetadata(pubkey).publicKey;
  const metadataFluxbeam = AddressUtil.findProgramAddress(
    [
      Buffer.from("metadata"),
      FLUXBEAM_METADATA_PROGRAM_ADDRESS.toBuffer(),
      pubkey.toBuffer(),
    ],
    FLUXBEAM_METADATA_PROGRAM_ADDRESS
  ).publicKey;

  const transferFeeConfig = getTransferFeeConfig(mint);
  const mintCloseAuthority = getMintCloseAuthority(mint);
  // const confidentialTransferMint = ?
  const defaultAccountState = getDefaultAccountState(mint);
  const nonTransferable = getNonTransferable(mint);
  const interestBearingConfig = getInterestBearingMintConfigState(mint);
  const permanentDelegate = getPermanentDelegate(mint);
  const transferHook = getTransferHook(mint);
  const metadataPointer = getMetadataPointerState(mint);
  const tokenMetadata = (() => {
    const data = getExtensionData(ExtensionType.TokenMetadata, mint.tlvData);
    if (data === null) return null;
    return unpackTokenMetadata(data);
  })();

  // tlvData: Type(2bytes) + Length(2bytes) + Value(Length bytes)
  const extensions = getExtensionTypes(mint.tlvData);
  const unknownExtensions = extensions.sort().filter((e) => {
    switch (e) {
      case ExtensionType.TransferFeeConfig:
      case ExtensionType.MintCloseAuthority:
      case ExtensionType.DefaultAccountState:
      case ExtensionType.NonTransferable:
      case ExtensionType.InterestBearingConfig:
      case ExtensionType.PermanentDelegate:
      case ExtensionType.TransferHook:
      case ExtensionType.MetadataPointer:
      case ExtensionType.TokenMetadata:
        return false;
      default:
        return true;
    }
  });

  // TokenBadge
  const tokenBadge = PDAUtil.getTokenBadge(
    ORCA_WHIRLPOOL_PROGRAM_ID,
    ORCA_WHIRLPOOLS_CONFIG,
    pubkey,
  ).publicKey;
  const tokenBadgeAccountInfo = await getAccountInfo(connection, tokenBadge);
  const tokenBadgeData = ParsableTokenBadge.parse(tokenBadge, tokenBadgeAccountInfo.accountInfo);
  const isTokenBadgeInitialized = !!tokenBadgeData;

  return {
    meta: toMeta(pubkey, accountInfo, slotContext),
    parsed: {
      base: mint,
      extensions: {
        transferFeeConfig,
        mintCloseAuthority,
        defaultAccountState,
        nonTransferable,
        interestBearingConfig,
        permanentDelegate,
        transferHook,
        metadataPointer,
        tokenMetadata,
      },
      unknownExtensions,
    },
    derived: {
      supply: DecimalUtil.fromBN(new BN(mint.supply.toString()), mint.decimals),
      metadataMetaplex,
      metadataFluxbeam,
      isTokenBadgeInitialized,
      tokenBadge,
    }
  };
}

/*

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
        ORCA_WHIRLPOOL_PROGRAM_ID, // cannot consider other deployment
        ta.mint
      ).publicKey,
      bundle: PDAUtil.getPositionBundle(
        ORCA_WHIRLPOOL_PROGRAM_ID, // cannot consider other deploymen
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
*/