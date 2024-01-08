<script lang="ts">
  import MetaData from "../../components/MetaData.svelte";
  import ParsedData from "../../components/ParsedData.svelte";
  import DerivedData from "../../components/DerivedData.svelte";
  import ParsedAndDerivedData from "../../components/ParsedAndDerivedData.svelte";
  import Data from "../../components/Data.svelte";
  import Pubkey from "../../components/Pubkey.svelte";
  import AccountDefinition from "../../components/AccountDefinition.svelte";

  export let params;

  import { getTokenAccount2022Info, ACCOUNT_DEFINITION } from "../../libs/token2022";
  $: tokenAccountInfoPromise = getTokenAccount2022Info(params.pubkey);
</script>

<h2>💎Token2022::Account <AccountDefinition href="{ACCOUNT_DEFINITION.Account}" /></h2>

{#await tokenAccountInfoPromise}
  loading...
  {params.pubkey}
{:then tokenAccountInfo}
<MetaData accountType="token2022/account" meta={tokenAccountInfo.meta} />

<ParsedAndDerivedData>
<ParsedData>
  <Data name="owner" type="PublicKey" offset="32"><Pubkey address={tokenAccountInfo.parsed.base.owner} /></Data>
  <Data name="mint" type="PublicKey" offset="0"><Pubkey type="token2022/mint" address={tokenAccountInfo.parsed.base.mint} /></Data>
  <Data name="amount" type="u64" offset="64">{tokenAccountInfo.parsed.base.amount}</Data>
  <Data name="isNative" type="bool">{tokenAccountInfo.parsed.base.isNative}</Data>
  <Data name="isFrozen" type="bool">{tokenAccountInfo.parsed.base.isFrozen}</Data>
  <Data name="delegate" type="COption<PublicKey>" offset="COption(72)+PublicKey(76)"><Pubkey address={tokenAccountInfo.parsed.base.delegate} /></Data>
  <Data name="delegatedAmount" type="u64" offset="121">{tokenAccountInfo.parsed.base.delegatedAmount}</Data>
  <Data name="closeAuthority" type="COption<PublicKey>" offset="COption(129)+PublicKey(133)"><Pubkey address={tokenAccountInfo.parsed.base.closeAuthority} /></Data>
  <Data name="extensions">
    <pre>
    {JSON.stringify(tokenAccountInfo.parsed.extensions, null, 2)}
    </pre>
  </Data>
</ParsedData>

<DerivedData>
  <Data name="decimals">{tokenAccountInfo.derived.decimals}</Data>
  <Data name="amount">{tokenAccountInfo.derived.amount}</Data>
  <Data name="isATA">{tokenAccountInfo.derived.isATA}</Data>
</DerivedData>
</ParsedAndDerivedData>
{/await}

<style>
</style>