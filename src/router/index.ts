import Home from "../pages/Home.svelte";

import Whirlpool from "../pages/whirlpool/Whirlpool.svelte";
import Position from "../pages/whirlpool/Position.svelte";
import WhirlpoolsConfig from "../pages/whirlpool/WhirlpoolsConfig.svelte";
import FeeTier from "../pages/whirlpool/FeeTier.svelte";
import TickArray from "../pages/whirlpool/TickArray.svelte";
import WhirlpoolList from "../pages/whirlpool/List.svelte";

import TokenAccount from "../pages/token/Account.svelte";
import TokenMint from "../pages/token/Mint.svelte";

import TokenSwap from "../pages/tokenswap/TokenSwap.svelte";

import GlobalFarm from "../pages/aquafarm/GlobalFarm.svelte";
import UserFarm from "../pages/aquafarm/UserFarm.svelte";

import Generic from "../pages/Generic.svelte";

export const routes = {
  '/': Home,
  '/whirlpool/list': WhirlpoolList,
  '/whirlpool/config/:pubkey': WhirlpoolsConfig,
  '/whirlpool/feetier/:pubkey': FeeTier,
  '/whirlpool/whirlpool/:pubkey': Whirlpool,
  '/whirlpool/tickarray/:pubkey': TickArray,
  '/whirlpool/position/:pubkey': Position,
  '/token/account/:pubkey': TokenAccount,
  '/token/mint/:pubkey': TokenMint,
  '/tokenswap/swapstate/:pubkey': TokenSwap,
  '/aquafarm/globalfarm/:pubkey': GlobalFarm,
  '/aquafarm/userfarm/:pubkey': UserFarm,
  '/generic/:pubkey': Generic,
}
