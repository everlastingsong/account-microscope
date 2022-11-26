<script lang="ts">
  let filter;
  $: effectiveFilter = "";

  import { getWhirlpoolList, WhirlpoolListEntry } from "../../libs/orcaapi";

  $: whirlpoolListPromise = getFilteredWhirlpoolList(effectiveFilter);

  function onSubmit() {
    effectiveFilter = filter;
  }

  async function getFilteredWhirlpoolList(filter: string): WhirlpoolListEntry[] {
    const list = await getWhirlpoolList();
    return list.filter((p) => filter.length == 0 || p.name.indexOf(filter) != -1);
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
  th, td {
    padding: 0.1em 0.5em;
  }

  a {
    color: #39f;
    text-decoration: none;
  }
</style>