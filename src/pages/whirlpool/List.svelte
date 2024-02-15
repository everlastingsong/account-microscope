<script lang="ts">
  import InputRadioGroup from "../../components/InputRadioGroup.svelte";
  import { getWhirlpoolList, WhirlpoolListEntry, whirlpoolListEntryCmp } from "../../libs/orcaapi";

  enum OrderBy {
    volumeDesc = "day $volume (desc)",
    volumeAsc = "day $volume (asc)",
    tvlDesc = "$TVL (desc)",
    tvlAsc = "$TVL (asc)",
    nameAsc = "name (asc)",
  }

  const orderByOptions = Object.values(OrderBy);
  let orderBy = orderByOptions.indexOf(OrderBy.volumeDesc);

  function getComparator(orderBy: number): (a: WhirlpoolListEntry, b: WhirlpoolListEntry) => number {
    switch (orderByOptions[orderBy]) {
      case OrderBy.volumeDesc:
        return (a, b) => b.usdVolumeDay.cmp(a.usdVolumeDay);
      case OrderBy.volumeAsc:
        return (a, b) => a.usdVolumeDay.cmp(b.usdVolumeDay);
      case OrderBy.tvlDesc:
        return (a, b) => b.usdTVL.cmp(a.usdTVL);
      case OrderBy.tvlAsc:
        return (a, b) => a.usdTVL.cmp(b.usdTVL);
      case OrderBy.nameAsc:
        return whirlpoolListEntryCmp;
      default:
        return (a, b) => 0;
    }
  }

  let filter;
  $: effectiveFilter = "";
  $: whirlpoolListPromise = getFilteredWhirlpoolList(effectiveFilter, getComparator(orderBy));

  function onSubmit() {
    effectiveFilter = filter;
  }

  async function getFilteredWhirlpoolList(
    filter: string,
    orderByComparator: (a: WhirlpoolListEntry, b: WhirlpoolListEntry) => number,
  ): Promise<WhirlpoolListEntry[]> {
    const list = await getWhirlpoolList();
    return list
      .filter(
        (p) => filter.length == 0 ||
        p.name.toUpperCase().indexOf(filter.toUpperCase()) >= 0 ||
        p.invertedName.toUpperCase().indexOf(filter.toUpperCase()) >= 0 ||
        p.mintA.toBase58().indexOf(filter) >= 0 ||
        p.mintB.toBase58().indexOf(filter) >= 0
      )
      .sort(orderByComparator);
  }
</script>

<h2>🌀Whirlpool::list</h2>
<form on:submit|preventDefault={onSubmit} style="margin-bottom: 0em;">
  <input style="margin: 0.5em 0em;" bind:value={filter} type="text" size="64" placeholder="SOL/USDC or orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE" />
  <input type="submit" value="Set Filter!" />
</form>
<div style="margin-top: 0.5em; margin-left: 0em; margin-bottom: 1.0em; font-size: smaller; display: flex; flex-direction: row;">
  <div>order by</div>
  <div>
  <InputRadioGroup
    group="orderBy"
    bind:selected={orderBy}
    values={orderByOptions}
  />
  </div>
</div>

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