<script lang="ts">
  import MetaData from "../../components/MetaData.svelte";
  import ParsedData from "../../components/ParsedData.svelte";
  import DerivedData from "../../components/DerivedData.svelte";
  import ParsedAndDerivedData from "../../components/ParsedAndDerivedData.svelte";
  import Data from "../../components/Data.svelte";
  import Pubkey from "../../components/Pubkey.svelte";

  export let params;

  import { getTickArrayInfo } from "../../libs/whirlpool";
  $: tickArrayInfoPromise = getTickArrayInfo(params.pubkey);
</script>

<h2>🌀Whirlpool::TickArray</h2>

{#await tickArrayInfoPromise}
  loading...
  {params.pubkey}
{:then tickArrayInfo}
<MetaData>
  <Data name="pubkey" type="PublicKey"><Pubkey type="whirlpool/tickarray" address={tickArrayInfo.meta.pubkey} /></Data>
  <Data name="owner program" type="PublicKey"><Pubkey address={tickArrayInfo.meta.owner} /></Data>
  <Data name="lamports" type="u64">{tickArrayInfo.meta.lamports}</Data>
  <Data name="data size">{tickArrayInfo.meta.data.length}</Data>
</MetaData>

<ParsedAndDerivedData>
<ParsedData>
  <Data name="whirlpool" type="PublicKey"><Pubkey type="whirlpool/whirlpool" address={tickArrayInfo.parsed.whirlpool} /></Data>
  <Data name="startTickIndex" type="i32">{tickArrayInfo.parsed.startTickIndex}</Data>
  <Data name="ticks">
    <table style="border-spacing: 0;">
      <thead><th>offset</th><th>tick index</th><th>initialized</th><th>liquidity net</th></thead>
      <tbody>
      <tr><td colspan="4">A to B direction</td></tr>
      {#each tickArrayInfo.parsed.ticks as tick, offset}
      <tr class="{tick.initialized ? "initialized" : "uninitialized"}">
        <td>{offset}</td>
        <td>{tickArrayInfo.parsed.startTickIndex + offset*tickArrayInfo.derived.tickSpacing}</td>
        <td>{tick.initialized}</td>
        <td>{tick.liquidityNet}</td>
      </tr>
      {/each}
      <tr><td colspan="4">B to A direction</td></tr>
      </tbody>
    </table>  
  </Data>
</ParsedData>

<DerivedData>
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