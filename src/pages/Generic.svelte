<script lang="ts">
  import HexDump from "../components/HexDump.svelte";
import Laboratory from "../components/Laboratory.svelte";
import MetaData from "../components/MetaData.svelte";
  export let params;

  import { getGenericAccountInfo } from "../libs/generic";
  $: genericAccountInfoPromise = getGenericAccountInfo(params.pubkey);
</script>

<h2>📘Generic</h2>

{#await genericAccountInfoPromise}
  loading...
  {params.pubkey}
{:then genericAccountInfo}
<MetaData accountType="generic" meta={genericAccountInfo.meta} />

{#if genericAccountInfo.meta.data.length > 0}
<Laboratory>
  <HexDump accountInfo={genericAccountInfo} />
</Laboratory>
{/if}
{/await}

<style>
</style>