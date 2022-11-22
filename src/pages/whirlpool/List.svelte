<script lang="ts">
  import MetaData from "../../components/MetaData.svelte";
  import ParsedData from "../../components/ParsedData.svelte";
  import DerivedData from "../../components/DerivedData.svelte";
  import ParsedAndDerivedData from "../../components/ParsedAndDerivedData.svelte";
  import Data from "../../components/Data.svelte";
  import Pubkey from "../../components/Pubkey.svelte";

  export let params;

  let filter;
  $: effectiveFilter = "";

  import { getWhirlpoolList } from "../../libs/whirlpool";

  $: whirlpoolListPromise = getFilteredWhirlpoolList(effectiveFilter);

  function onSubmit() {
    effectiveFilter = filter;
  }

  let _cache = null;
  async function getFilteredWhirlpoolList(filter: string) {
    if (!_cache) _cache = await getWhirlpoolList();
    return _cache.filter((p) => filter.length == 0 || p.name.indexOf(filter) != -1);
  }
</script>

<h2>🌀Whirlpool</h2>
<form on:submit|preventDefault={onSubmit} style="margin-bottom: 1em;">
  <input style="margin: 0.5em 0em;" bind:value={filter} type="text" size="64" placeholder="SOL/USDC" />
  <input type="submit" value="Set Filter!" />
</form>

{#await whirlpoolListPromise}
  loading...
{:then whirlpoolList}
<table style="border-spacing: 0; font-size: smaller;">
  <thead><th>name</th><th>mintA</th><th>mintB</th><th>tickSpacing</th><th>price</th><th>$TVL</th><th>day $volume</th></thead>
  <tbody>
  {#each whirlpoolList as whirlpool}
  <tr>
    <td><a href={`#/whirlpool/whirlpool/${whirlpool.address.toBase58()}`}>{whirlpool.name}</a></td>
    <td><a href={`#/token/mint/${whirlpool.mintA.toBase58()}`}>{whirlpool.symbolA}</a></td>
    <td><a href={`#/token/mint/${whirlpool.mintB.toBase58()}`}>{whirlpool.symbolB}</a></td>
    <td>{whirlpool.tickSpacing}</td>
    <td>{whirlpool.price}</td>
    <td>{whirlpool.usdTVL.toFixed(0)}</td>
    <td>{whirlpool.usdVolumeDay.toFixed(0)}</td>
  </tr>
  {/each}
  </tbody>
</table>
{/await}

<style>
  tr.uninitialized {
    background-color: lightgray;
  }

  th, td {
    padding: 0.1em 0.5em;
  }

  a {
    color: #39f;
    text-decoration: none;
  }
</style>