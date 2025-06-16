<script lang="ts">
  import MetaData from "../../components/MetaData.svelte";
  import ParsedData from "../../components/ParsedData.svelte";
  import DerivedData from "../../components/DerivedData.svelte";
  import ParsedAndDerivedData from "../../components/ParsedAndDerivedData.svelte";
  import Data from "../../components/Data.svelte";
  import Pubkey from "../../components/Pubkey.svelte";
  import AccountDefinition from "../../components/AccountDefinition.svelte";

  export let params;

  import { getTickArrayInfo, ACCOUNT_DEFINITION } from "../../libs/whirlpool";
  $: tickArrayInfoPromise = getTickArrayInfo(params.pubkey);
</script>

<h2>🌀Whirlpool::TickArray <AccountDefinition href="{ACCOUNT_DEFINITION.TickArray}" /></h2>

{#await tickArrayInfoPromise}
  loading...
  {params.pubkey}
{:then tickArrayInfo}
<MetaData accountType="whirlpool/tickarray" meta={tickArrayInfo.meta} />

<ParsedAndDerivedData>
<ParsedData>
  {#if !tickArrayInfo.parsed.tickBitmap}
  <Data name="whirlpool" type="PublicKey" offset="9956"><Pubkey type="whirlpool/whirlpool" address={tickArrayInfo.parsed.whirlpool} /></Data>
  <Data name="startTickIndex" type="i32" offset="8">{tickArrayInfo.parsed.startTickIndex}</Data>
  <Data name="ticks" offset="12">
    <table style="border-spacing: 0;">
      <thead><th>offset</th><th>tick index</th><th>initialized</th><th>liquidity net</th></thead>
      <tbody>
      <tr><td colspan="4">A to B direction (price down)</td></tr>
      {#each tickArrayInfo.parsed.ticks as tick, offset}
      <tr class="{tick.initialized ? "initialized" : "uninitialized"}">
        <td>{offset}</td>
        <td>{tickArrayInfo.parsed.startTickIndex + offset*tickArrayInfo.derived.tickSpacing}</td>
        <td>{tick.initialized}</td>
        <td>{tick.liquidityNet}</td>
      </tr>
      {/each}
      <tr><td colspan="4">B to A direction (price up)</td></tr>
      </tbody>
    </table>  
  </Data>
  {/if}

  {#if !!tickArrayInfo.parsed.tickBitmap}
  <Data name="whirlpool" type="PublicKey" offset="12"><Pubkey type="whirlpool/whirlpool" address={tickArrayInfo.parsed.whirlpool} /></Data>
  <Data name="startTickIndex" type="i32" offset="8">{tickArrayInfo.parsed.startTickIndex}</Data>
  <Data name="tickBitmap" type="u128" offset="44">
    {tickArrayInfo.parsed.tickBitmap.toString()}
    <br /><br />
    <table style="border-spacing: 0;">
      <thead><th>index</th><th>0</th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th><th>6</th><th>7</th></thead>
      <tbody>
      {#each tickArrayInfo.parsed.tickBitmapArray as row, index}
      <tr>
        <td>{index}</td>
        {#each [0, 1, 2, 3, 4, 5, 6, 7].map((i) => (row & (1<<i)) > 0) as bit}
        <td>{bit ? 1 : 0}</td>
        {/each}
      </tr>
      {/each}
      </tbody>
    </table>
  </Data>
  <Data name="ticks" offset="60">
    <table style="border-spacing: 0;">
      <thead><th>offset</th><th>tick index</th><th>initialized</th><th>liquidity net</th></thead>
      <tbody>
      <tr><td colspan="4">A to B direction (price down)</td></tr>
      {#each tickArrayInfo.parsed.ticks as tick, offset}
      <tr class="{tick.initialized ? "initialized" : "uninitialized"}">
        <td>{offset}</td>
        <td>{tickArrayInfo.parsed.startTickIndex + offset*tickArrayInfo.derived.tickSpacing}</td>
        <td>{tick.initialized}</td>
        <td>{tick.liquidityNet}</td>
      </tr>
      {/each}
      <tr><td colspan="4">B to A direction (price up)</td></tr>
      </tbody>
    </table>  
  </Data>
  {/if}

  <Data name="initialized ticks">
    {#each tickArrayInfo.parsed.ticks as tick, offset}
    {#if tick.initialized}
    <Data name={`ticks[${offset}] (${tickArrayInfo.parsed.startTickIndex + offset*tickArrayInfo.derived.tickSpacing})`}>
    <table style="border-spacing: 0;">
      <tbody>
      <tr><td>liquidity_net</td><td>{tick.liquidityNet}</td></tr>
      <tr><td>liquidity_gross</td><td>{tick.liquidityGross}</td></tr>
      <tr><td>fee_growth_outside_a</td><td>{tick.feeGrowthOutsideA}</td></tr>
      <tr><td>fee_growth_outside_b</td><td>{tick.feeGrowthOutsideB}</td></tr>
      <tr><td>reward_growths_outside[0]</td><td>{tick.rewardGrowthsOutside[0]}</td></tr>
      <tr><td>reward_growths_outside[1]</td><td>{tick.rewardGrowthsOutside[1]}</td></tr>
      <tr><td>reward_growths_outside[2]</td><td>{tick.rewardGrowthsOutside[2]}</td></tr>
      </tbody>
    </table>
    </Data>
    {/if}
    {/each}
  </Data>
</ParsedData>

<DerivedData>
  <Data name="type">{tickArrayInfo.derived.tickArrayType}</Data>
  <Data name="tick spacing">{tickArrayInfo.derived.tickSpacing}</Data>
  <Data name="ticks in array">{tickArrayInfo.derived.ticksInArray}</Data>
  <Data name="current tick index">{tickArrayInfo.derived.tickCurrentIndex}</Data>
  <Data name="previous tick array"><Pubkey type="whirlpool/tickarray" address={tickArrayInfo.derived.prevTickArray} /></Data>
  <Data name="next tick array"><Pubkey type="whirlpool/tickarray" address={tickArrayInfo.derived.nextTickArray} /></Data>
</DerivedData>
</ParsedAndDerivedData>
{/await}

<style>
  tr.uninitialized {
    background-color: lightgray;
  }

  th, td {
    padding: 0.1em 0.5em;
  }
</style>