import { PublicKey, AccountInfo } from "@solana/web3.js";
import Decimal from "decimal.js";
import fetch from "node-fetch";
import moment from "moment";
import { Address, BN } from "@coral-xyz/anchor";
import { getShortAddressNotation } from "./utils";

const STATS_API_WHIRLPOOL_LIST = "https://stats-api-eclipse.mainnet-production.orca.so/api/whirlpools?limit=1000&sort=volume:desc";

export type WhirlpoolListEntry = {
  address: PublicKey,
  name: string,
  invertedName: string,
  symbolA: string,
  symbolB: string,
  mintA: PublicKey,
  mintB: PublicKey,
  tickSpacing: number,
  price: Decimal,
  usdTVL: Decimal,
  usdVolumeDay: Decimal,
}

export function whirlpoolListEntryCmp(a: WhirlpoolListEntry, b: WhirlpoolListEntry): number {
  if ( a.symbolA < b.symbolA ) return -1;
  if ( a.symbolA > b.symbolA ) return +1;
  if ( a.symbolB < b.symbolB ) return -1;
  if ( a.symbolB > b.symbolB ) return +1;
  if ( a.tickSpacing < b.tickSpacing ) return -1;
  if ( a.tickSpacing > b.tickSpacing ) return +1;
  return 0;
}

let _cachedWhirlpoolList: WhirlpoolListEntry[] = null;
let _cachedWhirlpoolListExpire: moment.Moment = null;
export async function getWhirlpoolList(): Promise<WhirlpoolListEntry[]> {
  const now = moment();
  if (_cachedWhirlpoolList !== null && _cachedWhirlpoolListExpire.isAfter(now)) {
    return _cachedWhirlpoolList;
  }

  const tokenList = await getTokenList();
  const response = await (await fetch(STATS_API_WHIRLPOOL_LIST)).json();

  const list: WhirlpoolListEntry[] = [];
  response.data.forEach((p) => {

    const symbolA = warnUndefined(tokenList.getTokenInfoByMint(p.tokenMintA)?.symbol, p.tokenMintA);
    const symbolB = warnUndefined(tokenList.getTokenInfoByMint(p.tokenMintB)?.symbol, p.tokenMintB);

    list.push({
      address: new PublicKey(p.address),
      name: `${symbolA}/${symbolB}(${p.tickSpacing})`,
      invertedName: `${symbolB}/${symbolA}(${p.tickSpacing})`,
      symbolA,
      symbolB,
      mintA: new PublicKey(p.tokenMintA),
      mintB: new PublicKey(p.tokenMintB),
      tickSpacing: p.tickSpacing,
      price: new Decimal(p.price),
      usdTVL: new Decimal(p.tvlUsdc ?? 0),
      usdVolumeDay: new Decimal(p.volumeUsdc24h ?? 0),
    });
  });

  // avoid double sort processing
  //list.sort(whirlpoolListEntryCmp);

  _cachedWhirlpoolListExpire = now.add("15", "m"); // 15 min
  _cachedWhirlpoolList = list;

  return _cachedWhirlpoolList;
}


const STATS_API_TOKEN_LIST = "https://stats-api-eclipse.mainnet-production.orca.so/api/tokens?limit=3000";

export type TokenInfo = {
  mint: PublicKey,
  symbol: string,
  name: string,
  decimals: number,
  logoURI: string,
  coingeckoId: string,
  whitelisted: boolean,
  poolToken: boolean,
}

class TokenList {
  private tokenMintMap: Map<string, TokenInfo>;

  constructor(
    readonly tokenList: TokenInfo[]
  ) {
    this.tokenMintMap = new Map();
    for (const token of tokenList) {
      this.tokenMintMap.set(token.mint.toBase58(), token);
    }
  }

  public getTokenInfoByMint(mint: Address): TokenInfo|undefined {
    return this.tokenMintMap.get(mint.toString());
  }
}

let _cachedTokenList: TokenList = null;
export async function getTokenList(): Promise<TokenList> {
  if (_cachedTokenList) return _cachedTokenList;

  const response = await (await fetch(STATS_API_TOKEN_LIST)).json();

  const list: TokenInfo[] = [];
  response.data.forEach((t) => {
    list.push({
      mint: new PublicKey(t.address),
      symbol: warnUndefined(t.metadata.symbol, t.address),
      name: warnUndefined(t.metadata.name, t.address),
      decimals: t.decimals,
      logoURI: t.metadata.image,
      coingeckoId: undefined,
      whitelisted: (t.metadata.risk ?? 3) < 3,
      poolToken: false,
    });
  });

  list.sort((a, b) => a.symbol.localeCompare(b.symbol));

  _cachedTokenList = new TokenList(list);
  return _cachedTokenList;
}

const POOL_CONFIG = "https://api.orca.so/configs";

type CurveType = "ConstantProduct" | "Stable";

type PoolConfig = {
  name: string,
  account: PublicKey,
  authority: PublicKey,
  nonce: number,
  poolTokenMint: PublicKey,
  tokenAccountA: PublicKey,
  tokenAccountB: PublicKey,
  feeAccount: PublicKey,
  feeNumerator: number,
  feeDenominator: number,
  ownerTradeFeeNumerator: number,
  ownerTradeFeeDenominator: number,
  ownerWithdrawFeeNumerator: number,
  ownerWithdrawFeeDenominator: number,
  hostFeeNumerator: number,
  hostFeeDenominator: number,
  tokenAName: string,
  tokenBName: string,
  curveType: CurveType,
  deprecated: boolean,
}

type AquaFarmConfig = {
  account: PublicKey,
  nonce: number,
  tokenProgramId: PublicKey,
  emissionsAuthority: PublicKey,
  removeRewardsAuthority: PublicKey,
  baseTokenMint: PublicKey,
  baseTokenVault: PublicKey,
  rewardTokenMint: PublicKey,
  rewardTokenVault: PublicKey,
  farmTokenMint: PublicKey,
}

type DoubleDipConfig = AquaFarmConfig & {
  dateStart: string,
  dateEnd: string,
  totalEmissions: BN,
}

export type PoolFarmDoubleDipTuple = {
  pool: PoolConfig,
  aquafarm: AquaFarmConfig|undefined,
  doubledip: DoubleDipConfig|undefined,
}

class PoolConfigs {
  private poolAddressMap: Map<string, PoolConfig>;
  private aquafarmAddressMap: Map<string, AquaFarmConfig>;
  private doubledipAddressMap: Map<string, DoubleDipConfig>;
  readonly tuples: PoolFarmDoubleDipTuple[];

  constructor(
    readonly pools: PoolConfig[],
    readonly aquafarms: AquaFarmConfig[],
    readonly doubledips: DoubleDipConfig[],
  ) {
    this.poolAddressMap = new Map();
    for (const pool of pools) {
      this.poolAddressMap
        .set(pool.account.toBase58(), pool)
        .set(pool.poolTokenMint.toBase58(), pool);
    }

    this.aquafarmAddressMap = new Map();
    for (const farm of aquafarms) {
      this.aquafarmAddressMap
        .set(farm.account.toBase58(), farm)
        .set(farm.baseTokenMint.toBase58(), farm)
        .set(farm.farmTokenMint.toBase58(), farm);
    }

    this.doubledipAddressMap = new Map();
    for (const dd of doubledips) {
      this.doubledipAddressMap
        .set(dd.account.toBase58(), dd)
        .set(dd.baseTokenMint.toBase58(), dd)
        .set(dd.farmTokenMint.toBase58(), dd);
    }

    this.tuples = [];
    for (const pool of this.pools) {
      const aquafarm = this.getAquaFarmByAddress(pool.poolTokenMint);
      const doubledip = this.getDoubleDipByAddress(aquafarm?.farmTokenMint);
      this.tuples.push({
        pool,
        aquafarm,
        doubledip,
      });
    }
    this.tuples.sort((a, b) => a.pool.name.localeCompare(b.pool.name));
  }

  public getPoolByAddress(address: Address|undefined): PoolConfig|undefined {
    if (!address) return undefined;
    return this.poolAddressMap.get(address.toString());
  }

  public getAquaFarmByAddress(address: Address|undefined): AquaFarmConfig|undefined {
    if (!address) return undefined;
    return this.aquafarmAddressMap.get(address.toString());
  }

  public getDoubleDipByAddress(address: Address|undefined): DoubleDipConfig|undefined {
    if (!address) return undefined;
    return this.doubledipAddressMap.get(address.toString());
  }
}

let _cachedPoolConfigs: PoolConfigs = null;
export async function getPoolConfigs(): Promise<PoolConfigs> {
  if (_cachedPoolConfigs) return _cachedPoolConfigs;

  const response = await (await fetch(POOL_CONFIG)).json();

  const pools: PoolConfig[] = [];
  Object.keys(response.pools).forEach((name) => {
    const p = response.pools[name];
    pools.push({
      name,
      account: new PublicKey(p.account),
      authority: new PublicKey(p.authority),
      nonce: p.nonce,
      poolTokenMint: new PublicKey(p.poolTokenMint),
      tokenAccountA: new PublicKey(p.tokenAccountA),
      tokenAccountB: new PublicKey(p.tokenAccountB),
      feeAccount: new PublicKey(p.feeAccount),
      feeNumerator: p.feeNumerator,
      feeDenominator: p.feeDenominator,
      ownerTradeFeeNumerator: p.ownerTradeFeeNumerator,
      ownerTradeFeeDenominator: p.ownerTradeFeeDenominator,
      ownerWithdrawFeeNumerator: p.ownerWithdrawFeeNumerator,
      ownerWithdrawFeeDenominator: p.ownerWithdrawFeeDenominator,
      hostFeeNumerator: p.hostFeeNumerator,
      hostFeeDenominator: p.hostFeeDenominator,
      tokenAName: p.tokenAName,
      tokenBName: p.tokenBName,
      curveType: p.curveType === "ConstantProduct" ? "ConstantProduct" : "Stable",
      deprecated: p.deprecated ?? false,
    });
  });

  const farms: AquaFarmConfig[] = [];
  Object.keys(response.aquafarms).forEach((addr) => {
    const f = response.aquafarms[addr];
    farms.push({
      account: new PublicKey(f.account),
      nonce: f.nonce,
      tokenProgramId: new PublicKey(f.tokenProgramId),
      emissionsAuthority: new PublicKey(f.emissionsAuthority),
      removeRewardsAuthority: new PublicKey(f.removeRewardsAuthority),
      baseTokenMint: new PublicKey(f.baseTokenMint),
      baseTokenVault: new PublicKey(f.baseTokenVault),
      rewardTokenMint: new PublicKey(f.rewardTokenMint),
      rewardTokenVault: new PublicKey(f.rewardTokenVault),
      farmTokenMint: new PublicKey(f.farmTokenMint),
    });
  });

  const doubledips: DoubleDipConfig[] = [];
  Object.keys(response.doubleDips).forEach((addr) => {
    const f = response.doubleDips[addr];
    doubledips.push({
      account: new PublicKey(f.account),
      nonce: f.nonce,
      tokenProgramId: new PublicKey(f.tokenProgramId),
      emissionsAuthority: new PublicKey(f.emissionsAuthority),
      removeRewardsAuthority: new PublicKey(f.removeRewardsAuthority),
      baseTokenMint: new PublicKey(f.baseTokenMint),
      baseTokenVault: new PublicKey(f.baseTokenVault),
      rewardTokenMint: new PublicKey(f.rewardTokenMint),
      rewardTokenVault: new PublicKey(f.rewardTokenVault),
      farmTokenMint: new PublicKey(f.farmTokenMint),
      dateStart: f.dateStart,
      dateEnd: f.dateEnd,
      totalEmissions: f.totalEmissions,
    });
  });

  const poolConfigs = new PoolConfigs(pools, farms, doubledips);
  _cachedPoolConfigs = poolConfigs;
  return poolConfigs;
}

function warnUndefined(s: string | undefined, mint: Address): string {
  return s?.trim() || `❓(${getShortAddressNotation(mint, 4)})`; // use "||" to process "" as undefined
}
