<script lang="ts">
  let filter;
  $: effectiveFilter = "";

    import Pubkey from "../../components/Pubkey.svelte";
  import { getPoolConfigs, PoolFarmDoubleDipTuple } from "../../libs/orcaapi";

  $: poolConfigsPromise = getFilteredPoolConfigs(effectiveFilter);

  function onSubmit() {
    effectiveFilter = filter;
  }

  async function getFilteredPoolConfigs(filter: string): Promise<PoolFarmDoubleDipTuple[]>  {
    const tuples = (await getPoolConfigs()).tuples;
    return tuples.filter((t) => filter.length == 0 || t.pool.name.indexOf(filter) != -1);
  }
</script>

<h2>⚖️TokenSwap</h2>
<form on:submit|preventDefault={onSubmit} style="margin-bottom: 1em;">
  <input style="margin: 0.5em 0em;" bind:value={filter} type="text" size="64" placeholder="SOL/USDC" />
  <input type="submit" value="Set Filter!" />
</form>

{#await poolConfigsPromise}
  loading...
{:then poolConfigTuples}
<table style="border-spacing: 0; font-size: smaller;">
  <thead><th>name</th><th>deprecated</th><th>aquafarm</th><th>doubledip</th></thead>
  <tbody>
  {#each poolConfigTuples as tuple}
  <tr>
    <td><a href={`#/tokenswap/swapstate/${tuple.pool.account}`}>{tuple.pool.name}</a></td>
    <td>{tuple.pool.deprecated} {#if tuple.pool.deprecated}⛔{/if}</td>
    <td>
      {#if tuple.aquafarm}
      <Pubkey type="aquafarm/globalfarm" address={tuple.aquafarm.account} short />
      {/if}
    </td>
    <td>
      {#if tuple.doubledip}
      <Pubkey type="aquafarm/globalfarm" address={tuple.doubledip.account} short />
      {/if}
    </td>
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