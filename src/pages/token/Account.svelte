<script lang="ts">
  import MetaData from "../../components/MetaData.svelte";
  import ParsedData from "../../components/ParsedData.svelte";
  import DerivedData from "../../components/DerivedData.svelte";
  import ParsedAndDerivedData from "../../components/ParsedAndDerivedData.svelte";
  import Data from "../../components/Data.svelte";
  import Pubkey from "../../components/Pubkey.svelte";

  export let params;

  import { getTokenAccountInfo } from "../../libs/token";
  $: tokenAccountInfoPromise = getTokenAccountInfo(params.pubkey);
</script>

<h2>🪙Token::Account</h2>

{#await tokenAccountInfoPromise}
  loading...
  addr: {params.pubkey}
{:then tokenAccountInfo}
<MetaData>
  <Data name="pubkey" type="PublicKey"><Pubkey type="token/account" address={tokenAccountInfo.meta.pubkey} /></Data>
  <Data name="owner program" type="PublicKey"><Pubkey address={tokenAccountInfo.meta.owner} /></Data>
  <Data name="lamports" type="u64">{tokenAccountInfo.meta.lamports}</Data>
  <Data name="data size">{tokenAccountInfo.meta.data.length}</Data>
</MetaData>

<ParsedAndDerivedData>
<ParsedData>
  <Data name="owner" type="PublicKey"><Pubkey address={tokenAccountInfo.parsed.owner} /></Data>
  <Data name="mint" type="PublicKey"><Pubkey type="token/mint" address={tokenAccountInfo.parsed.mint} /></Data>
  <Data name="isNative" type="bool">{tokenAccountInfo.parsed.isNative}</Data>
  <Data name="amount" type="u64">{tokenAccountInfo.parsed.amount}</Data>
  <Data name="isFrozen">{tokenAccountInfo.parsed.isFrozen}</Data>
  <Data name="delegate" type="PublicKey"><Pubkey address={tokenAccountInfo.parsed.delegate} /></Data>
  <Data name="delegatedAmount" type="u64">{tokenAccountInfo.parsed.delegatedAmount}</Data>
  <Data name="closeAuthority" type="PublicKey"><Pubkey address={tokenAccountInfo.parsed.closeAuthority} /></Data>
</ParsedData>

<DerivedData>
  <Data name="decimals">{tokenAccountInfo.derived.decimals}</Data>
  <Data name="amount">{tokenAccountInfo.derived.amount}</Data>
</DerivedData>
</ParsedAndDerivedData>
{/await}

<style>
</style>