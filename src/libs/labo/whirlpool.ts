import { AccountJSON, toAccountJSON, toMeta } from "../account";
import { WhirlpoolInfo } from "../whirlpool";
import { AccountName, PDAUtil, PoolUtil, TickUtil, getAccountSize } from "@orca-so/whirlpools-sdk";
import { getConnection } from "../client";
import { AccountInfo, Commitment, Connection, GetProgramAccountsFilter, PublicKey } from "@solana/web3.js";
import pTimeout from "p-timeout";
import pRetry from "p-retry";

export type WhirlpoolCloneConfig = {
  withWhirlpoolsConfig: boolean;
  withFeeTier: boolean;
  withTickArray: boolean;
  withMintAccount: boolean;
  withVaultTokenAccount: boolean;
  withPosition: boolean;
};

export type WhirlpoolCloneAccounts = {
  slotContext: number;
  whirlpool: AccountJSON;
  whirlpoolsConfig?: AccountJSON;
  feeTier?: AccountJSON;
  tickArrays?: AccountJSON[];
  mintAccounts?: AccountJSON[];
  vaultTokenAccounts?: AccountJSON[];
  positions?: AccountJSON[];
};

type AccountInfoMap = {
  slotContext: number;
  accounts: Record<string, AccountInfo<Buffer>>;
};

const EMPTY_ACCOUNT_INFO_MAP: AccountInfoMap = {
  slotContext: 0,
  accounts: {},
};

const CLONE_WHIRLPOOL_IMPL_TIMEOUT = 20 * 1000; // ms
const DEFAULT_RETRY_OPTIONS: pRetry.Options = {
  retries: 5,
  minTimeout: 1 * 1000, // ms
  maxTimeout: 1 * 1000, // ms
};

export async function cloneWhirlpool(whirlpoolInfo: WhirlpoolInfo, config: WhirlpoolCloneConfig, retryOptions: pRetry.Options = DEFAULT_RETRY_OPTIONS): Promise<WhirlpoolCloneAccounts> {
  return await pRetry(
    async () => pTimeout(cloneWhirlpoolImpl(whirlpoolInfo, config), CLONE_WHIRLPOOL_IMPL_TIMEOUT),
    retryOptions
  );
}

async function cloneWhirlpoolImpl(whirlpoolInfo: WhirlpoolInfo, config: WhirlpoolCloneConfig): Promise<WhirlpoolCloneAccounts> {
  const { meta, parsed } = whirlpoolInfo;

  const connection = getConnection();
  const programId = meta.owner;

  const whirlpoolPubkey = meta.pubkey;
  const whirlpoolsConfigPubkey = parsed.whirlpoolsConfig;
  const feeTierPubkey = PDAUtil.getFeeTier(programId, whirlpoolsConfigPubkey, parsed.tickSpacing).publicKey;

  const mintAccountAPubkey = parsed.tokenMintA;
  const mintAccountBPubkey = parsed.tokenMintB;
  const vaultTokenAccountAPubkey = parsed.tokenVaultA;
  const vaultTokenAccountBPubkey = parsed.tokenVaultB;

  const initializedRewardInfos = parsed.rewardInfos.filter((ri) => PoolUtil.isRewardInitialized(ri));
  const mintAccountRewardsPubkeys = initializedRewardInfos.map((ri) => ri.mint);
  const vaultTokenAccountRewardsPubkeys = initializedRewardInfos.map((ri) => ri.vault);

  const mintAccountPubkeys = dedup([mintAccountAPubkey, mintAccountBPubkey, ...mintAccountRewardsPubkeys]);
  const vaultTokenAccountPubkeys = [vaultTokenAccountAPubkey, vaultTokenAccountBPubkey, ...vaultTokenAccountRewardsPubkeys];

  // Neighborhood TickArrays, which are prone to change in trade, are obtained by gMA with guaranteed consistency.
  const neighboringTickArrayPubkeys = [-3, -2, -1, 0, +1, +2, +3].map((offset) => {
    const startTickIndex = TickUtil.getStartTickIndex(parsed.tickCurrentIndex, parsed.tickSpacing, offset);
    return PDAUtil.getTickArray(programId, meta.pubkey, startTickIndex).publicKey;
  });

  // addresses.length is obviously less than 100.
  const addresses = [
    whirlpoolPubkey,
    whirlpoolsConfigPubkey,
    feeTierPubkey,
    ...neighboringTickArrayPubkeys,
    ...mintAccountPubkeys,
    ...vaultTokenAccountPubkeys,
  ];

  const commitment: Commitment = "confirmed";
  const tickArrayFilters: GetProgramAccountsFilter[] = [
    {dataSize: getAccountSize(AccountName.TickArray)},
    {memcmp: {offset: 9956, bytes: whirlpoolPubkey.toBase58()}},
  ];
  const positionFilters: GetProgramAccountsFilter[] = [
    {dataSize: getAccountSize(AccountName.Position)},
    {memcmp: {offset: 8, bytes: whirlpoolPubkey.toBase58()}},
  ];

  const tickArrayAccountsPrePromise = config.withTickArray
    ? getProgramAccountsInfo(connection, programId, tickArrayFilters, commitment)
    : Promise.resolve(EMPTY_ACCOUNT_INFO_MAP);
  const positionAccountsPrePromise = config.withPosition
    ? getProgramAccountsInfo(connection, programId, positionFilters, commitment)
    : Promise.resolve(EMPTY_ACCOUNT_INFO_MAP);
  const [tickArrayAccountsPre, positionAccountsPre] = await Promise.all([
    tickArrayAccountsPrePromise,
    positionAccountsPrePromise,
  ]);

  const minSlotContext = Math.max(tickArrayAccountsPre.slotContext, positionAccountsPre.slotContext);
  const accounts = await getMultipleAccountsInfo(connection, addresses, commitment, minSlotContext);

  const tickArrayAccountsPostPromise = config.withTickArray
    ? getProgramAccountsInfo(connection, programId, tickArrayFilters, commitment, accounts.slotContext)
    : Promise.resolve(EMPTY_ACCOUNT_INFO_MAP);
  const positionAccountsPostPromise = config.withPosition
    ? getProgramAccountsInfo(connection, programId, positionFilters, commitment, accounts.slotContext)
    : Promise.resolve(EMPTY_ACCOUNT_INFO_MAP);
  const [tickArrayAccountsPost, positionAccountsPost] = await Promise.all([
    tickArrayAccountsPostPromise,
    positionAccountsPostPromise,
  ]);

  // align slotContext
  const slotContext = accounts.slotContext;
  // If the results pre and post gMA are consistent, it can be concluded that there was no change.
  // The TickArray around the current price, which is prone to change in a trade,
  // is overwritten by the gMA result, so consistency can be guaranteed.
  const tickArrayAccountsPreUpdated = updateAccountInfoBy(tickArrayAccountsPre, accounts);
  const tickArrayAccountsPostUpdated = updateAccountInfoBy(tickArrayAccountsPost, accounts);
  if (!isEqualAccountInfo(tickArrayAccountsPreUpdated, tickArrayAccountsPostUpdated)) {
    throw new Error("cannot fetch TickArray accounts consistently");
  }
  // Position does not change with the trade, so just make sure it matches pre and post the gMA.
  if (!isEqualAccountInfo(positionAccountsPre, positionAccountsPost)) {
    throw new Error("cannot fetch Position accounts consistently");
  }

  function pack(pubkey: PublicKey, accountInfoMap: AccountInfoMap): AccountJSON {
    const meta = toMeta(pubkey, accountInfoMap.accounts[pubkey.toBase58()], slotContext);
    return toAccountJSON(meta, true);
  }

  const tickArrayPubkeys = Object.keys(tickArrayAccountsPostUpdated.accounts).map((k) => new PublicKey(k));
  const positionPubkeys = Object.keys(positionAccountsPost.accounts).map((k) => new PublicKey(k));
  return {
    slotContext,
    whirlpool: pack(whirlpoolPubkey, accounts),
    whirlpoolsConfig: config.withWhirlpoolsConfig
      ? pack(whirlpoolsConfigPubkey, accounts)
      : undefined,
    feeTier: config.withFeeTier
      ? pack(feeTierPubkey, accounts)
      : undefined,
    tickArrays: config.withTickArray
      ? tickArrayPubkeys.map((k) => pack(k, tickArrayAccountsPostUpdated))
      : undefined,
    mintAccounts: config.withMintAccount
      ? mintAccountPubkeys.map((k) => pack(k, accounts))
      : undefined,
    vaultTokenAccounts: config.withVaultTokenAccount
      ? vaultTokenAccountPubkeys.map((k) => pack(k, accounts))
      : undefined,
    positions: config.withPosition
      ? positionPubkeys.map((k) => pack(k, positionAccountsPost))
      : undefined,
  };
}

async function getMultipleAccountsInfo(connection: Connection, addresses: PublicKey[], commitment: Commitment = "confirmed", minContextSlot?: number): Promise<AccountInfoMap> {
  // throws if error
  const accounts = await connection.getMultipleAccountsInfoAndContext(addresses, {
    commitment,
    minContextSlot,
  });

  return {
    slotContext: accounts.context.slot,
    accounts: Object.fromEntries(addresses
      .map((address, i) => [address.toBase58(), accounts.value[i]])
      .filter(([, account]) => account !== null)
    ),
  };
}

async function getProgramAccountsInfo(connection: Connection, programId, filters: GetProgramAccountsFilter[], commitment: Commitment = "confirmed", minContextSlot?: number): Promise<AccountInfoMap> {
  // throws if error
  const accounts = await connection.getProgramAccounts(programId, {
    commitment,
    encoding: "base64",
    withContext: true,
    filters,
    minContextSlot,
  });

  return {
    slotContext: accounts.context.slot,
    accounts: Object.fromEntries(accounts.value.map(({ pubkey, account }) => [pubkey.toBase58(), account])),
  };
}

function isEqualAccountInfo(a: AccountInfoMap, b: AccountInfoMap): boolean {
  const aKeys = Object.keys(a.accounts).sort();
  const bKeys = Object.keys(b.accounts).sort();

  if (aKeys.length !== bKeys.length) return false;
  if (JSON.stringify(aKeys) !== JSON.stringify(bKeys)) return false;
  // now keys are equal

  for (const key of aKeys) {
    const aAccount = a.accounts[key];
    const bAccount = b.accounts[key];

    if (aAccount.executable !== bAccount.executable) return false;
    if (aAccount.lamports !== bAccount.lamports) return false;
    if (aAccount.owner.toBase58() !== bAccount.owner.toBase58()) return false;
    if (aAccount.rentEpoch !== bAccount.rentEpoch) return false;
    if (Buffer.compare(aAccount.data, bAccount.data) !== 0) return false;
  }
  // now account data are equal

  return true;
}

function updateAccountInfoBy(base: AccountInfoMap, update: AccountInfoMap): AccountInfoMap {
  const updated: AccountInfoMap = {
    slotContext: base.slotContext,
    accounts: { ...base.accounts },
  };

  for (const key of Object.keys(update.accounts)) {
    // update if the account exists in base
    if (updated.accounts[key] !== undefined) {
      updated.accounts[key] = update.accounts[key];
    }
  }

  return updated;
}

function dedup(pubkeys: PublicKey[]): PublicKey[] {
  const puekeySet = new Set<string>(pubkeys.map((k) => k.toBase58()));
  return Array.from(puekeySet).map((k) => new PublicKey(k));
}
