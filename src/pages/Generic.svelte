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
  addr: {params.pubkey}
{:then genericAccountInfo}
<MetaData>
  <Data name="pubkey" type="PublicKey"><Pubkey address={genericAccountInfo.meta.pubkey} /></Data>
  <Data name="owner program" type="PublicKey"><Pubkey address={genericAccountInfo.meta.owner} /></Data>
  <Data name="lamports" type="u64">{genericAccountInfo.meta.lamports}</Data>
  <Data name="data size">{genericAccountInfo.meta.data.length}</Data>
</MetaData>
{/await}

<style>
</style>