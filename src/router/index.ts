import Home from "../pages/Home.svelte";

import Whirlpool from "../pages/whirlpool/Whirlpool.svelte";
import Position from "../pages/whirlpool/Position.svelte";
import WhirlpoolsConfig from "../pages/whirlpool/WhirlpoolsConfig.svelte";
import WhirlpoolsConfigExtension from "../pages/whirlpool/WhirlpoolsConfigExtension.svelte";
import TokenBadge from "../pages/whirlpool/TokenBadge.svelte";
import FeeTier from "../pages/whirlpool/FeeTier.svelte";
import TickArray from "../pages/whirlpool/TickArray.svelte";
import PositionBundle from "../pages/whirlpool/PositionBundle.svelte";
import LockConfig from "../pages/whirlpool/LockConfig.svelte";
import AdaptiveFeeTier from "../pages/whirlpool/AdaptiveFeeTier.svelte";
import WhirlpoolList from "../pages/whirlpool/List.svelte";
import PositionList from "../pages/whirlpool/ListPositions.svelte";

import TokenAccount from "../pages/token/Account.svelte";
import TokenMint from "../pages/token/Mint.svelte";
import TokenAccountList from "../pages/token/List.svelte";
import AssociatedTokenAccount from "../pages/token/AssociatedTokenAccount.svelte";

import TokenAccount2022 from "../pages/token2022/Account.svelte";
import TokenMint2022 from "../pages/token2022/Mint.svelte";

import TokenSwap from "../pages/tokenswap/TokenSwap.svelte";
import TokenSwapList from "../pages/tokenswap/List.svelte";

import GlobalFarm from "../pages/aquafarm/GlobalFarm.svelte";
import UserFarm from "../pages/aquafarm/UserFarm.svelte";

import Generic from "../pages/Generic.svelte";

export const routes = {
  '/': Home,

  '/whirlpool/list': WhirlpoolList,
  '/whirlpool/listPositions/:pubkey': PositionList,
//  '/whirlpool/findPositionsByRange': FindPositions,
  '/whirlpool/config/:pubkey': WhirlpoolsConfig,
  '/whirlpool/configextension/:pubkey': WhirlpoolsConfigExtension,
  '/whirlpool/tokenbadge/:pubkey': TokenBadge,
  '/whirlpool/feetier/:pubkey': FeeTier,
  '/whirlpool/whirlpool/:pubkey': Whirlpool,
  '/whirlpool/tickarray/:pubkey': TickArray,
  '/whirlpool/position/:pubkey': Position,
  '/whirlpool/positionbundle/:pubkey': PositionBundle,
  '/whirlpool/lockconfig/:pubkey': LockConfig,
  '/whirlpool/adaptivefeetier/:pubkey': AdaptiveFeeTier,

  '/token/account/:pubkey': TokenAccount,
  '/token/mint/:pubkey': TokenMint,
  '/token/listTokenAccounts/:pubkey?': TokenAccountList,
  '/token/deriveAta': AssociatedTokenAccount,

  '/token2022/account/:pubkey': TokenAccount2022,
  '/token2022/mint/:pubkey': TokenMint2022,

  '/tokenswap/list': TokenSwapList,
  '/tokenswap/swapstate/:pubkey': TokenSwap,

  '/aquafarm/globalfarm/:pubkey': GlobalFarm,
  '/aquafarm/userfarm/:pubkey': UserFarm,

  '/generic/:pubkey': Generic,
}
