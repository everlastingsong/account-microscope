<script lang="ts">
  import MetaData from "../../components/MetaData.svelte";
  import ParsedData from "../../components/ParsedData.svelte";
  import DerivedData from "../../components/DerivedData.svelte";
  import ParsedAndDerivedData from "../../components/ParsedAndDerivedData.svelte";
  import Data from "../../components/Data.svelte";
  import Pubkey from "../../components/Pubkey.svelte";
  import AccountDefinition from "../../components/AccountDefinition.svelte";

  export let params;

  import { getFeeTierInfo, ACCOUNT_DEFINITION } from "../../libs/whirlpool";
  $: feeTierInfoPromise = getFeeTierInfo(params.pubkey);
</script>

<h2>🌀Whirlpool::FeeTier <AccountDefinition href="{ACCOUNT_DEFINITION.FeeTier}" /></h2>

{#await feeTierInfoPromise}
  loading...
  {params.pubkey}
{:then feeTierInfo}
<MetaData>
  <Data name="pubkey" type="PublicKey"><Pubkey type="whirlpool/feetier" address={feeTierInfo.meta.pubkey} /></Data>
  <Data name="owner program" type="PublicKey"><Pubkey address={feeTierInfo.meta.owner} /></Data>
  <Data name="lamports" type="u64">{feeTierInfo.meta.lamports}</Data>
  <Data name="data size">{feeTierInfo.meta.data.length}</Data>
</MetaData>

<ParsedAndDerivedData>
<ParsedData>
  <Data name="whirlpoolsConfig" type="PublicKey"><Pubkey type="whirlpool/config" address={feeTierInfo.parsed.whirlpoolsConfig} /></Data>
  <Data name="tickSpacing" type="u16">{feeTierInfo.parsed.tickSpacing}</Data>
  <Data name="defaultFeeRate" type="u16">{feeTierInfo.parsed.defaultFeeRate}</Data>
</ParsedData>

<DerivedData>
  <Data name="default fee rate">{feeTierInfo.derived.defaultFeeRate} %</Data>
</DerivedData>
</ParsedAndDerivedData>
{/await}

<style>
</style>