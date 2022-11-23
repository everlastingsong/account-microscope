<script lang="ts">
  import MetaData from "../../components/MetaData.svelte";
  import ParsedData from "../../components/ParsedData.svelte";
  import DerivedData from "../../components/DerivedData.svelte";
  import ParsedAndDerivedData from "../../components/ParsedAndDerivedData.svelte";
  import Data from "../../components/Data.svelte";
  import Pubkey from "../../components/Pubkey.svelte";

  export let params;

  import { getMintInfo } from "../../libs/token";
    import { derived } from "svelte/store";
  $: mintInfoPromise = getMintInfo(params.pubkey);
</script>

<h2>🪙Token::Mint</h2>

{#await mintInfoPromise}
  loading...
  {params.pubkey}
{:then mintInfo}
<MetaData>
  <Data name="pubkey" type="PublicKey"><Pubkey type="token/mint" address={mintInfo.meta.pubkey} /></Data>
  <Data name="owner program" type="PublicKey"><Pubkey address={mintInfo.meta.owner} /></Data>
  <Data name="lamports" type="u64">{mintInfo.meta.lamports}</Data>
  <Data name="data size">{mintInfo.meta.data.length}</Data>
</MetaData>

<ParsedAndDerivedData>
<ParsedData>
  <Data name="decimals" type="u8">{mintInfo.parsed.decimals}</Data>
  <Data name="supply" type="u64">{mintInfo.parsed.supply}</Data>
  <Data name="freezeAuthority" type="PublicKey"><Pubkey address={mintInfo.parsed.freezeAuthority} /></Data>
  <Data name="mintAuthority" type="PublicKey"><Pubkey address={mintInfo.parsed.mintAuthority} /></Data>
</ParsedData>

<DerivedData>
  <Data name="supply">{mintInfo.derived.supply}</Data>
  <Data name="is whirlpool position mint">{mintInfo.derived.whirlpoolPosition !== undefined}</Data>
  {#if mintInfo.derived.whirlpoolPosition !== undefined}
  <Data name="whirlpool position"><Pubkey type="whirlpool/position" address={mintInfo.derived.whirlpoolPosition} /></Data>
  {/if}
</DerivedData>
</ParsedAndDerivedData>
{/await}

<style>
</style>