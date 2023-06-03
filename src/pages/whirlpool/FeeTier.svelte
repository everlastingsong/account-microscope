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
<MetaData accountType="whirlpool/feetier" meta={feeTierInfo.meta} />

<ParsedAndDerivedData>
<ParsedData>
  <Data name="whirlpoolsConfig" type="PublicKey" offset="8"><Pubkey type="whirlpool/config" address={feeTierInfo.parsed.whirlpoolsConfig} /></Data>
  <Data name="tickSpacing" type="u16" offset="40">{feeTierInfo.parsed.tickSpacing}</Data>
  <Data name="defaultFeeRate" type="u16" offset="42">{feeTierInfo.parsed.defaultFeeRate}</Data>
</ParsedData>

<DerivedData>
  <Data name="default fee rate">{feeTierInfo.derived.defaultFeeRate} %</Data>
</DerivedData>
</ParsedAndDerivedData>
{/await}

<style>
</style>