<script lang="ts">
  import MetaData from "../../components/MetaData.svelte";
  import ParsedData from "../../components/ParsedData.svelte";
  import DerivedData from "../../components/DerivedData.svelte";
  import ParsedAndDerivedData from "../../components/ParsedAndDerivedData.svelte";
  import Data from "../../components/Data.svelte";
  import Pubkey from "../../components/Pubkey.svelte";

  export let params;

  import { getWhirlpoolInfo } from "../../libs/whirlpool";
  $: whirlpoolInfoPromise = getWhirlpoolInfo(params.pubkey);
</script>

<h2>🌀Whirlpool::Whirlpool</h2>

{#await whirlpoolInfoPromise}
  loading...
  {params.pubkey}
{:then whirlpoolInfo}
<MetaData>
  <Data name="pubkey" type="PublicKey"><Pubkey type="whirlpool/whirlpool" address={whirlpoolInfo.meta.pubkey} /></Data>
  <Data name="owner program" type="PublicKey"><Pubkey address={whirlpoolInfo.meta.owner} /></Data>
  <Data name="lamports" type="u64">{whirlpoolInfo.meta.lamports}</Data>
  <Data name="data size">{whirlpoolInfo.meta.data.length}</Data>
</MetaData>

<ParsedAndDerivedData>
<ParsedData>
  <Data name="whirlpoolsConfig" type="PublicKey"><Pubkey type="whirlpool/config" address={whirlpoolInfo.parsed.whirlpoolsConfig} /></Data>
  <Data name="tokenMintA" type="PublicKey"><Pubkey type="token/mint" address={whirlpoolInfo.parsed.tokenMintA} /></Data>
  <Data name="tokenMintB" type="PublicKey"><Pubkey type="token/mint" address={whirlpoolInfo.parsed.tokenMintB} /></Data>
  <Data name="tickSpacing" type="u16">{whirlpoolInfo.parsed.tickSpacing}</Data>
  <Data name="liquidity" type="u128">{whirlpoolInfo.parsed.liquidity}</Data>
  <Data name="tokenVaultA" type="PublicKey"><Pubkey type="token/account" address={whirlpoolInfo.parsed.tokenVaultA} /></Data>
  <Data name="tokenVaultB" type="PublicKey"><Pubkey type="token/account" address={whirlpoolInfo.parsed.tokenVaultB} /></Data>
  <Data name="sqrtPrice" type="u128">{whirlpoolInfo.parsed.sqrtPrice}</Data>
  <Data name="tickCurrentIndex" type="i32">{whirlpoolInfo.parsed.tickCurrentIndex}</Data>
  <Data name="feeGrowthGlobalA" type="u128">{whirlpoolInfo.parsed.feeGrowthGlobalA}</Data>
  <Data name="feeGrowthGlobalB" type="u128">{whirlpoolInfo.parsed.feeGrowthGlobalB}</Data>
  <Data name="feeRate" type="u16">{whirlpoolInfo.parsed.feeRate}</Data>
  <Data name="protocolFeeRate" type="u16">{whirlpoolInfo.parsed.protocolFeeRate}</Data>
  <Data name="protocolFeeOwedA" type="u64">{whirlpoolInfo.parsed.protocolFeeOwedA}</Data>
  <Data name="protocolFeeOwedB" type="u64">{whirlpoolInfo.parsed.protocolFeeOwedB}</Data>
  <Data name="whirlpoolBump" type="[u8; 1]">[{whirlpoolInfo.parsed.whirlpoolBump[0]}]</Data>
  <Data name="rewardLastUpdatedTimestamp" type="u64">{whirlpoolInfo.parsed.rewardLastUpdatedTimestamp}</Data>
  <Data name="rewardInfos[0]">
    <Data name="mint" type="PublicKey"><Pubkey type="token/mint" address={whirlpoolInfo.parsed.rewardInfos[0].mint} /></Data>
    <Data name="vault" type="PublicKey"><Pubkey type="token/account" address={whirlpoolInfo.parsed.rewardInfos[0].vault} /></Data>
    <Data name="emissionsPerSecondX64" type="u128">{whirlpoolInfo.parsed.rewardInfos[0].emissionsPerSecondX64}</Data>
    <Data name="authority" type="PublicKey"><Pubkey address={whirlpoolInfo.parsed.rewardInfos[0].authority} /></Data>
    <Data name="growthGlobalX64" type="u128">{whirlpoolInfo.parsed.rewardInfos[0].growthGlobalX64}</Data>
  </Data>
  <Data name="rewardInfos[1]">
    <Data name="mint" type="PublicKey"><Pubkey type="token/mint" address={whirlpoolInfo.parsed.rewardInfos[1].mint} /></Data>
    <Data name="vault" type="PublicKey"><Pubkey type="token/account" address={whirlpoolInfo.parsed.rewardInfos[1].vault} /></Data>
    <Data name="emissionsPerSecondX64" type="u128">{whirlpoolInfo.parsed.rewardInfos[1].emissionsPerSecondX64}</Data>
    <Data name="authority" type="PublicKey"><Pubkey address={whirlpoolInfo.parsed.rewardInfos[1].authority} /></Data>
    <Data name="growthGlobalX64" type="u128">{whirlpoolInfo.parsed.rewardInfos[1].growthGlobalX64}</Data>
  </Data>
  <Data name="rewardInfos[2]">
    <Data name="mint" type="PublicKey"><Pubkey type="token/mint" address={whirlpoolInfo.parsed.rewardInfos[2].mint} /></Data>
    <Data name="vault" type="PublicKey"><Pubkey type="token/account" address={whirlpoolInfo.parsed.rewardInfos[2].vault} /></Data>
    <Data name="emissionsPerSecondX64" type="u128">{whirlpoolInfo.parsed.rewardInfos[2].emissionsPerSecondX64}</Data>
    <Data name="authority" type="PublicKey"><Pubkey address={whirlpoolInfo.parsed.rewardInfos[2].authority} /></Data>
    <Data name="growthGlobalX64" type="u128">{whirlpoolInfo.parsed.rewardInfos[2].growthGlobalX64}</Data>
  </Data>
</ParsedData>

<DerivedData>
  <Data name="decimals">
    <table style="border-spacing: 0;">
      <thead><th>token</th><th>decimals</th></thead>
      <tbody>
        <tr><td>A</td><td>{whirlpoolInfo.derived.decimalsA}</td></tr>
        <tr><td>B</td><td>{whirlpoolInfo.derived.decimalsB}</td></tr>
        <tr><td>reward0</td><td>{whirlpoolInfo.derived.decimalsR0}</td></tr>
        <tr><td>reward1</td><td>{whirlpoolInfo.derived.decimalsR1}</td></tr>
        <tr><td>reward2</td><td>{whirlpoolInfo.derived.decimalsR2}</td></tr>
      </tbody>
    </table>  
  </Data>
  <Data name="price">{whirlpoolInfo.derived.price}</Data>
  <Data name="inverted price">{whirlpoolInfo.derived.invertedPrice}</Data>
  <Data name="fee rate">{whirlpoolInfo.derived.feeRate} %</Data>
  <Data name="protocol fee rate">{whirlpoolInfo.derived.protocolFeeRate} % of fee ({whirlpoolInfo.derived.feeRate.mul(whirlpoolInfo.derived.protocolFeeRate.div(100))} %)</Data>
  <Data name="token vault amount">
    <table style="border-spacing: 0;">
      <thead><th>token</th><th>amount</th></thead>
      <tbody>
        <tr><td>A</td><td>{whirlpoolInfo.derived.tokenVaultAAmount}</td></tr>
        <tr><td>B</td><td>{whirlpoolInfo.derived.tokenVaultBAmount}</td></tr>
        <tr><td>reward0</td><td>{whirlpoolInfo.derived.tokenVaultR0Amount}</td></tr>
        <tr><td>reward1</td><td>{whirlpoolInfo.derived.tokenVaultR1Amount}</td></tr>
        <tr><td>reward2</td><td>{whirlpoolInfo.derived.tokenVaultR2Amount}</td></tr>
      </tbody>
    </table>  
  </Data>
  <Data name="reward weekly emission">
    <table style="border-spacing: 0;">
      <thead><th>reward</th><th>emission</th></thead>
      <tbody>
        <tr><td>reward0</td><td>{whirlpoolInfo.derived.reward0WeeklyEmission}</td></tr>
        <tr><td>reward1</td><td>{whirlpoolInfo.derived.reward1WeeklyEmission}</td></tr>
        <tr><td>reward2</td><td>{whirlpoolInfo.derived.reward2WeeklyEmission}</td></tr>
      </tbody>
    </table>  
  </Data>
  <Data name="reward last updated timestamp">{whirlpoolInfo.derived.rewardLastUpdatedTimestamp.format("YYYY/MM/DD HH:mm:ss UTCZZ")}</Data>
  <Data name="oracle"><Pubkey address={whirlpoolInfo.derived.oracle} /></Data>
  <Data name="neighboring tick arrays">
    <table style="border-spacing: 0;">
    <thead><th>current</th><th>initialized</th><th>start tick</th><th>start price</th><th>pubkey</th></thead>
    <tbody>
    <tr><td colspan="5">A to B direction (price down)</td></tr>
    {#each whirlpoolInfo.derived.neighboringTickArrays as tickArray}
    <!--tr class="{tickArray.hasTickCurrentIndex ? "current" : (tickArray.isInitialized ? "initialized" : "uninitialized")}"-->
    <tr class="{tickArray.isInitialized ? (tickArray.hasTickCurrentIndex ? "current" : "initialized") : "uninitialized"}">
      <td>{tickArray.hasTickCurrentIndex}{tickArray.hasTickCurrentIndex ? " 📍" : ""}</td>
      <td>{tickArray.isInitialized}</td>
      <td>{tickArray.startTickIndex}</td>
      <td>{tickArray.startPrice}</td>
      <td><Pubkey type="whirlpool/tickarray" address={tickArray.pubkey} short/></td>
    </tr>
    {/each}
    <tr><td colspan="5">B to A direction (price up)</td></tr>
    </tbody>
    </table>
  </Data>
  <Data name="isotope whirlpools">
    <table style="border-spacing: 0;">
      <thead><th>ts</th><th>fee</th><th>liquidity</th><th>tick</th><th>price</th><th>pubkey</th></thead>
      <tbody>
      {#each whirlpoolInfo.derived.isotopeWhirlpools as whirlpool}
      <tr>
        <td>{whirlpool.tickSpacing}</td>
        <td>{whirlpool.feeRate} %</td>
        <td>{whirlpool.liquidity}</td>
        <td>{whirlpool.tickCurrentIndex}</td>
        <td>{whirlpool.price}</td>
        <td><Pubkey type="whirlpool/whirlpool" address={whirlpool.pubkey} short/></td>
      </tr>
      {/each}
      </tbody>
    </table>  
  </Data>
  <Data name="tradable amounts">
    <table style="border-spacing: 0;">
      <thead><th>tick index</th><th>price</th><th>tokenA</th><th>tokenB</th></thead>
      <tbody>
      {#each whirlpoolInfo.derived.tradableAmounts.upward.reverse() as tradableAmount}
      <tr>
        <td>{tradableAmount.tickIndex}</td>
        <td>{tradableAmount.price}</td>
        <td class="amount buy">{tradableAmount.amountA.toFixed(whirlpoolInfo.derived.decimalsA)}</td>
        <td class="amount">{tradableAmount.amountB.toFixed(whirlpoolInfo.derived.decimalsB)}</td>
      </tr>
      {/each}

      {#each whirlpoolInfo.derived.tradableAmounts.downward as tradableAmount}
      <tr>
        <td>{tradableAmount.tickIndex}</td>
        <td>{tradableAmount.price}</td>
        <td class="amount">{tradableAmount.amountA.toFixed(whirlpoolInfo.derived.decimalsA)}</td>
        <td class="amount sell">{tradableAmount.amountB.toFixed(whirlpoolInfo.derived.decimalsB)}</td>
      </tr>
      {/each}
      </tbody>
    </table>  
  </Data>
</DerivedData>
</ParsedAndDerivedData>
{/await}

<style>
  tr.current {
    background-color: #cfc;
    border: 1px solid black;
  }

  tr.uninitialized {
    background-color: lightgray;
  }

  th, td {
    padding: 0.1em 0.5em;
  }

  .amount {
    text-align: right;
  }

  .buy {
    background-color: lightpink;
  }

  .sell {
    background-color: lightblue;
  }
</style>