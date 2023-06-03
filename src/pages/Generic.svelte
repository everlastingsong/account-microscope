<script lang="ts">
  import MetaData from "../components/MetaData.svelte";
  import ParsedData from "../components/ParsedData.svelte";
  import DerivedData from "../components/DerivedData.svelte";
  import ParsedAndDerivedData from "../components/ParsedAndDerivedData.svelte";
  import Data from "../components/Data.svelte";
  import Pubkey from "../components/Pubkey.svelte";

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
{/await}

<style>
</style>