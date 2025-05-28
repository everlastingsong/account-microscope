<script lang="ts">
  import MetaData from "../../components/MetaData.svelte";
  import ParsedData from "../../components/ParsedData.svelte";
  import DerivedData from "../../components/DerivedData.svelte";
  import ParsedAndDerivedData from "../../components/ParsedAndDerivedData.svelte";
  import Data from "../../components/Data.svelte";
  import Pubkey from "../../components/Pubkey.svelte";
  import AccountDefinition from "../../components/AccountDefinition.svelte";
  import { push } from "svelte-spa-router";

  export let params;

  import { getWhirlpoolInfo, ACCOUNT_DEFINITION } from "../../libs/whirlpool";
  $: whirlpoolInfoPromise = getWhirlpoolInfo(params.pubkey);

  import { TokenInfo } from "../../libs/orcaapi";
  import Laboratory from "../../components/Laboratory.svelte";
  import WhirlpoolClonePool from "../../components/WhirlpoolClonePool.svelte";
  import TokenPubkey from "../../components/TokenPubkey.svelte";
  function symbol_if_not_undefined(tokenInfo: TokenInfo, symbolOnly: boolean = false): string {
    if (tokenInfo === undefined) return "";
    return symbolOnly ? tokenInfo.symbol : `(${tokenInfo.symbol})`;
  }

  function price_unit_if_not_undefined(baseTokenInfo: TokenInfo, quoteTokenInfo: TokenInfo): string {
    if (baseTokenInfo === undefined || quoteTokenInfo === undefined) return "";
    return `${quoteTokenInfo.symbol}/${baseTokenInfo.symbol}`;
  }

  function listPositions() {
    const url = `/whirlpool/listPositions/${params.pubkey}`;
    console.log(url);
    push(url);
  }
</script>

<h2>🌀Whirlpool::Whirlpool <AccountDefinition href="{ACCOUNT_DEFINITION.Whirlpool}" /></h2>

{#await whirlpoolInfoPromise}
  loading...
  {params.pubkey}
{:then whirlpoolInfo}
<MetaData accountType="whirlpool/whirlpool" meta={whirlpoolInfo.meta} />

<ParsedAndDerivedData>
<ParsedData>
  <Data name="whirlpoolsConfig" type="PublicKey" offset="8"><Pubkey type="whirlpool/config" address={whirlpoolInfo.parsed.whirlpoolsConfig} /></Data>
  <Data name="tokenMintA" type="PublicKey" offset="101"><TokenPubkey type="token/mint" address={whirlpoolInfo.parsed.tokenMintA} program={whirlpoolInfo.derived.tokenProgramA} /></Data>
  <Data name="tokenMintB" type="PublicKey" offset="181"><TokenPubkey type="token/mint" address={whirlpoolInfo.parsed.tokenMintB} program={whirlpoolInfo.derived.tokenProgramB} /></Data>
  <Data name="tickSpacing" type="u16" offset="41">{whirlpoolInfo.parsed.tickSpacing}</Data>
  <Data name="liquidity" type="u128" offset="49">{whirlpoolInfo.parsed.liquidity}</Data>
  <Data name="tokenVaultA" type="PublicKey" offset="133"><TokenPubkey type="token/account" address={whirlpoolInfo.parsed.tokenVaultA} program={whirlpoolInfo.derived.tokenProgramA} /></Data>
  <Data name="tokenVaultB" type="PublicKey" offset="213"><TokenPubkey type="token/account" address={whirlpoolInfo.parsed.tokenVaultB} program={whirlpoolInfo.derived.tokenProgramB} /></Data>
  <Data name="sqrtPrice" type="u128" offset="65">{whirlpoolInfo.parsed.sqrtPrice}</Data>
  <Data name="tickCurrentIndex" type="i32" offset="81">{whirlpoolInfo.parsed.tickCurrentIndex}</Data>
  <Data name="feeGrowthGlobalA" type="u128" offset="165">{whirlpoolInfo.parsed.feeGrowthGlobalA}</Data>
  <Data name="feeGrowthGlobalB" type="u128" offset="245">{whirlpoolInfo.parsed.feeGrowthGlobalB}</Data>
  <Data name="feeRate" type="u16" offset="45">{whirlpoolInfo.parsed.feeRate}</Data>
  <Data name="protocolFeeRate" type="u16" offset="47">{whirlpoolInfo.parsed.protocolFeeRate}</Data>
  <Data name="protocolFeeOwedA" type="u64" offset="85">{whirlpoolInfo.parsed.protocolFeeOwedA}</Data>
  <Data name="protocolFeeOwedB" type="u64" offset="93">{whirlpoolInfo.parsed.protocolFeeOwedB}</Data>
  <Data name="whirlpoolBump" type="[u8; 1]" offset="40">[{whirlpoolInfo.parsed.whirlpoolBump[0]}]</Data>
  <Data name="rewardLastUpdatedTimestamp" type="u64" offset="261">{whirlpoolInfo.parsed.rewardLastUpdatedTimestamp}</Data>
  <Data name="rewardInfos[0]">
    <Data name="mint" type="PublicKey" offset="269"><TokenPubkey type="token/mint" address={whirlpoolInfo.parsed.rewardInfos[0].mint} program={whirlpoolInfo.derived.tokenProgramR0} /></Data>
    <Data name="vault" type="PublicKey" offset="301"><TokenPubkey type="token/account" address={whirlpoolInfo.parsed.rewardInfos[0].vault} program={whirlpoolInfo.derived.tokenProgramR0} /></Data>
    <Data name="emissionsPerSecondX64" type="u128" offset="365">{whirlpoolInfo.parsed.rewardInfos[0].emissionsPerSecondX64}</Data>
    <Data name="authority" type="PublicKey" offset="333"><Pubkey address={whirlpoolInfo.parsed.rewardInfos[0].authority} /></Data>
    <Data name="growthGlobalX64" type="u128" offset="381">{whirlpoolInfo.parsed.rewardInfos[0].growthGlobalX64}</Data>
  </Data>
  <Data name="rewardInfos[1]">
    <Data name="mint" type="PublicKey" offset="397"><TokenPubkey type="token/mint" address={whirlpoolInfo.parsed.rewardInfos[1].mint} program={whirlpoolInfo.derived.tokenProgramR1} /></Data>
    <Data name="vault" type="PublicKey" offset="429"><TokenPubkey type="token/account" address={whirlpoolInfo.parsed.rewardInfos[1].vault} program={whirlpoolInfo.derived.tokenProgramR1} /></Data>
    <Data name="emissionsPerSecondX64" type="u128" offset="493">{whirlpoolInfo.parsed.rewardInfos[1].emissionsPerSecondX64}</Data>
    <Data name="authority" type="PublicKey" offset="461"><Pubkey address={whirlpoolInfo.parsed.rewardInfos[1].authority} /></Data>
    <Data name="growthGlobalX64" type="u128" offset="509">{whirlpoolInfo.parsed.rewardInfos[1].growthGlobalX64}</Data>
  </Data>
  <Data name="rewardInfos[2]">
    <Data name="mint" type="PublicKey" offset="525"><TokenPubkey type="token/mint" address={whirlpoolInfo.parsed.rewardInfos[2].mint} program={whirlpoolInfo.derived.tokenProgramR2} /></Data>
    <Data name="vault" type="PublicKey" offset="557"><TokenPubkey type="token/account" address={whirlpoolInfo.parsed.rewardInfos[2].vault} program={whirlpoolInfo.derived.tokenProgramR2} /></Data>
    <Data name="emissionsPerSecondX64" type="u128" offset="621">{whirlpoolInfo.parsed.rewardInfos[2].emissionsPerSecondX64}</Data>
    <Data name="authority" type="PublicKey" offset="589"><Pubkey address={whirlpoolInfo.parsed.rewardInfos[2].authority} /></Data>
    <Data name="growthGlobalX64" type="u128" offset="637">{whirlpoolInfo.parsed.rewardInfos[2].growthGlobalX64}</Data>
  </Data>
</ParsedData>

<DerivedData>
  <Data name="token program, decimals">
    <table style="border-spacing: 0;">
      <thead><th>token</th><th>program</th><th>decimals</th></thead>
      <tbody>
        <tr><td>A{symbol_if_not_undefined(whirlpoolInfo.derived.tokenInfoA)}</td><td>{whirlpoolInfo.derived.tokenProgramA}</td><td>{whirlpoolInfo.derived.decimalsA}</td></tr>
        <tr><td>B{symbol_if_not_undefined(whirlpoolInfo.derived.tokenInfoB)}</td><td>{whirlpoolInfo.derived.tokenProgramB}</td><td>{whirlpoolInfo.derived.decimalsB}</td></tr>
        <tr><td>reward0{symbol_if_not_undefined(whirlpoolInfo.derived.tokenInfoR0)}</td><td>{whirlpoolInfo.derived.tokenProgramR0}</td><td>{whirlpoolInfo.derived.decimalsR0}</td></tr>
        <tr><td>reward1{symbol_if_not_undefined(whirlpoolInfo.derived.tokenInfoR1)}</td><td>{whirlpoolInfo.derived.tokenProgramR1}</td><td>{whirlpoolInfo.derived.decimalsR1}</td></tr>
        <tr><td>reward2{symbol_if_not_undefined(whirlpoolInfo.derived.tokenInfoR2)}</td><td>{whirlpoolInfo.derived.tokenProgramR2}</td><td>{whirlpoolInfo.derived.decimalsR2}</td></tr>
      </tbody>
    </table>  
  </Data>
  <Data name="price">{whirlpoolInfo.derived.price} {price_unit_if_not_undefined(whirlpoolInfo.derived.tokenInfoA, whirlpoolInfo.derived.tokenInfoB)}</Data>
  <Data name="inverted price">{whirlpoolInfo.derived.invertedPrice} {price_unit_if_not_undefined(whirlpoolInfo.derived.tokenInfoB, whirlpoolInfo.derived.tokenInfoA)}</Data>
  <Data name="fee rate">{whirlpoolInfo.derived.feeRate} %</Data>
  <Data name="protocol fee rate">{whirlpoolInfo.derived.protocolFeeRate} % of fee ({whirlpoolInfo.derived.feeRate.mul(whirlpoolInfo.derived.protocolFeeRate.div(100))} %)</Data>
  <Data name="token vault amount">
    <table style="border-spacing: 0;">
      <thead><th>token</th><th>amount</th></thead>
      <tbody>
        <tr><td>A{symbol_if_not_undefined(whirlpoolInfo.derived.tokenInfoA)}</td><td>{whirlpoolInfo.derived.tokenVaultAAmount}</td></tr>
        <tr><td>B{symbol_if_not_undefined(whirlpoolInfo.derived.tokenInfoB)}</td><td>{whirlpoolInfo.derived.tokenVaultBAmount}</td></tr>
        <tr><td>reward0{symbol_if_not_undefined(whirlpoolInfo.derived.tokenInfoR0)}</td><td>{whirlpoolInfo.derived.tokenVaultR0Amount}</td></tr>
        <tr><td>reward1{symbol_if_not_undefined(whirlpoolInfo.derived.tokenInfoR1)}</td><td>{whirlpoolInfo.derived.tokenVaultR1Amount}</td></tr>
        <tr><td>reward2{symbol_if_not_undefined(whirlpoolInfo.derived.tokenInfoR2)}</td><td>{whirlpoolInfo.derived.tokenVaultR2Amount}</td></tr>
      </tbody>
    </table>  
  </Data>
  <Data name="reward weekly emission">
    <table style="border-spacing: 0;">
      <thead><th>reward</th><th>emission</th></thead>
      <tbody>
        <tr><td>reward0{symbol_if_not_undefined(whirlpoolInfo.derived.tokenInfoR0)}</td><td>{whirlpoolInfo.derived.reward0WeeklyEmission}</td></tr>
        <tr><td>reward1{symbol_if_not_undefined(whirlpoolInfo.derived.tokenInfoR1)}</td><td>{whirlpoolInfo.derived.reward1WeeklyEmission}</td></tr>
        <tr><td>reward2{symbol_if_not_undefined(whirlpoolInfo.derived.tokenInfoR2)}</td><td>{whirlpoolInfo.derived.reward2WeeklyEmission}</td></tr>
      </tbody>
    </table>  
  </Data>
  <Data name="reward last updated timestamp">{whirlpoolInfo.derived.rewardLastUpdatedTimestamp.format("YYYY/MM/DD HH:mm:ss UTCZZ")}</Data>
  <Data name="oracle"><Pubkey type="whirlpool/oracle" address={whirlpoolInfo.derived.oracle} /></Data>
  <Data name="tick arrays for full range">
    <table style="border-spacing: 0;">
    <thead><th>initialized</th><th>start tick</th><th>pubkey</th></thead>
    <tbody>
      {#each whirlpoolInfo.derived.fullRangeTickArrays as tickArray}
      <tr class="{tickArray.isInitialized ? "initialized" : "uninitialized"}">
        <td>{tickArray.isInitialized}</td>
        <td>{tickArray.startTickIndex}</td>
        <td><Pubkey type="whirlpool/tickarray" address={tickArray.pubkey} short/></td>
      </tr>
      {/each}
      </tbody>
    </table>
  </Data>
  <Data name="neighboring tick arrays">
    <table style="border-spacing: 0;">
    <thead><th>current</th><th>initialized</th><th>start tick</th><th>start price</th><th>pubkey</th></thead>
    <tbody>
    <tr><td colspan="5">B{symbol_if_not_undefined(whirlpoolInfo.derived.tokenInfoB)} to A{symbol_if_not_undefined(whirlpoolInfo.derived.tokenInfoA)} direction (price up)</td></tr>
    {#each whirlpoolInfo.derived.neighboringTickArrays.reverse() as tickArray}
    <!--tr class="{tickArray.hasTickCurrentIndex ? "current" : (tickArray.isInitialized ? "initialized" : "uninitialized")}"-->
    <tr class="{tickArray.isInitialized ? (tickArray.hasTickCurrentIndex ? "current" : "initialized") : "uninitialized"}">
      <td>{tickArray.hasTickCurrentIndex}{tickArray.hasTickCurrentIndex ? ` 📍(${whirlpoolInfo.parsed.tickCurrentIndex})` : ""}</td>
      <td>{tickArray.isInitialized}</td>
      <td>{tickArray.startTickIndex}</td>
      <td>{tickArray.startPrice}</td>
      <td><Pubkey type="whirlpool/tickarray" address={tickArray.pubkey} short/></td>
    </tr>
    {/each}
    <tr><td colspan="5">A{symbol_if_not_undefined(whirlpoolInfo.derived.tokenInfoA)} to B{symbol_if_not_undefined(whirlpoolInfo.derived.tokenInfoB)} direction (price down)</td></tr>
    </tbody>
    </table>
  </Data>
  <Data name="tradable amounts (global)">
    {#if whirlpoolInfo.derived.tickArrayTradableAmounts.error}
    error detected 😵
    {:else}
    <table style="border-spacing: 0;">
      <thead><th>start price</th><th>tokenA{symbol_if_not_undefined(whirlpoolInfo.derived.tokenInfoA)}</th><th>tokenB{symbol_if_not_undefined(whirlpoolInfo.derived.tokenInfoB)}</th><th>pubkey</th></thead>
      <tbody>
      <tr><td colspan="4">B{symbol_if_not_undefined(whirlpoolInfo.derived.tokenInfoB)} to A{symbol_if_not_undefined(whirlpoolInfo.derived.tokenInfoA)} direction (price up)</td></tr>
      {#each whirlpoolInfo.derived.tickArrayTradableAmounts.upward.reverse() as tradableAmount}
      <tr class="{!!tradableAmount.tickArrayData ? "initialized" : "uninitialized"}">
        <td>{tradableAmount.tickArrayStartPrice}</td>
        <td class="{!!tradableAmount.tickArrayData ? "amount buy" : "amount uninitbuy"}">{tradableAmount.amountA.toFixed(whirlpoolInfo.derived.decimalsA)}</td>
        <td class="amount">{tradableAmount.amountB.toFixed(whirlpoolInfo.derived.decimalsB)}</td>
        <td><Pubkey type="whirlpool/tickarray" address={tradableAmount.tickArrayPubkey} short/></td>
      </tr>
      {/each}

      {#each whirlpoolInfo.derived.tickArrayTradableAmounts.downward as tradableAmount}
      <tr class="{!!tradableAmount.tickArrayData ? "initialized" : "uninitialized"}">
        <td>{tradableAmount.tickArrayStartPrice}</td>
        <td class="amount">{tradableAmount.amountA.toFixed(whirlpoolInfo.derived.decimalsA)}</td>
        <td class="{!!tradableAmount.tickArrayData ? "amount sell" : "amount uninitsell"}">{tradableAmount.amountB.toFixed(whirlpoolInfo.derived.decimalsB)}</td>
        <td><Pubkey type="whirlpool/tickarray" address={tradableAmount.tickArrayPubkey} short/></td>
      </tr>
      {/each}
      <tr><td colspan="4">A{symbol_if_not_undefined(whirlpoolInfo.derived.tokenInfoA)} to B{symbol_if_not_undefined(whirlpoolInfo.derived.tokenInfoB)} direction (price down)</td></tr>
      </tbody>
    </table>  
    {/if}
  </Data>
  <Data name="tradable amounts (local)">
    {#if whirlpoolInfo.derived.tradableAmounts.error}
    error detected 😵
    {:else}
    <table style="border-spacing: 0;">
      <thead><th>tick index</th><th>price</th><th>tokenA{symbol_if_not_undefined(whirlpoolInfo.derived.tokenInfoA)}</th><th>tokenB{symbol_if_not_undefined(whirlpoolInfo.derived.tokenInfoB)}</th></thead>
      <tbody>
      <tr><td colspan="4">B{symbol_if_not_undefined(whirlpoolInfo.derived.tokenInfoB)} to A{symbol_if_not_undefined(whirlpoolInfo.derived.tokenInfoA)} direction (price up)</td></tr>
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
      <tr><td colspan="4">A{symbol_if_not_undefined(whirlpoolInfo.derived.tokenInfoA)} to B{symbol_if_not_undefined(whirlpoolInfo.derived.tokenInfoB)} direction (price down)</td></tr>
      </tbody>
    </table>  
    {/if}
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
</DerivedData>
<Laboratory>
  <Data name="clone whirlpool">
    <WhirlpoolClonePool {whirlpoolInfo} />
  </Data>
  <Data name="list positions">
    <button on:click={listPositions} style="margin-top: 0.5em; padding-left: 30px; padding-right: 30px;">List Positions!</button>
  </Data>
</Laboratory>
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

  .uninitbuy {
    background-color: #996666;
  }

  .sell {
    background-color: lightblue;
  }

  .uninitsell {
    background-color: #666699;
  }
</style>