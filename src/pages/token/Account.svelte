<script lang="ts">
  import MetaData from "../../components/MetaData.svelte";
  import ParsedData from "../../components/ParsedData.svelte";
  import DerivedData from "../../components/DerivedData.svelte";
  import ParsedAndDerivedData from "../../components/ParsedAndDerivedData.svelte";
  import Data from "../../components/Data.svelte";
  import Pubkey from "../../components/Pubkey.svelte";
  import AccountDefinition from "../../components/AccountDefinition.svelte";

  export let params;

  import { getTokenAccountInfo, ACCOUNT_DEFINITION } from "../../libs/token";
  $: tokenAccountInfoPromise = getTokenAccountInfo(params.pubkey);
</script>

<h2>🪙Token::Account <AccountDefinition href="{ACCOUNT_DEFINITION.Account}" /></h2>

{#await tokenAccountInfoPromise}
  loading...
  {params.pubkey}
{:then tokenAccountInfo}
<MetaData>
  <Data name="pubkey" type="PublicKey"><Pubkey type="token/account" address={tokenAccountInfo.meta.pubkey} /></Data>
  <Data name="owner program" type="PublicKey"><Pubkey address={tokenAccountInfo.meta.owner} /></Data>
  <Data name="lamports" type="u64">{tokenAccountInfo.meta.lamports}</Data>
  <Data name="data size">{tokenAccountInfo.meta.data.length}</Data>
</MetaData>

<ParsedAndDerivedData>
<ParsedData>
  <Data name="owner" type="PublicKey" offset="32"><Pubkey address={tokenAccountInfo.parsed.owner} /></Data>
  <Data name="mint" type="PublicKey" offset="0"><Pubkey type="token/mint" address={tokenAccountInfo.parsed.mint} /></Data>
  <Data name="amount" type="u64" offset="64">{tokenAccountInfo.parsed.amount}</Data>
  <Data name="isNative" type="bool">{tokenAccountInfo.parsed.isNative}</Data>
  <Data name="isFrozen" type="bool">{tokenAccountInfo.parsed.isFrozen}</Data>
  <Data name="delegate" type="COption<PublicKey>" offset="COption(72)+PublicKey(76)"><Pubkey address={tokenAccountInfo.parsed.delegate} /></Data>
  <Data name="delegatedAmount" type="u64" offset="121">{tokenAccountInfo.parsed.delegatedAmount}</Data>
  <Data name="closeAuthority" type="COption<PublicKey>" offset="COption(129)+PublicKey(133)"><Pubkey address={tokenAccountInfo.parsed.closeAuthority} /></Data>
</ParsedData>

<DerivedData>
  <Data name="decimals">{tokenAccountInfo.derived.decimals}</Data>
  <Data name="amount">{tokenAccountInfo.derived.amount}</Data>
</DerivedData>
</ParsedAndDerivedData>
{/await}

<style>
</style>