<script lang="ts">
  import MetaData from "../../components/MetaData.svelte";
  import ParsedData from "../../components/ParsedData.svelte";
  import DerivedData from "../../components/DerivedData.svelte";
  import ParsedAndDerivedData from "../../components/ParsedAndDerivedData.svelte";
  import Data from "../../components/Data.svelte";
  import Pubkey from "../../components/Pubkey.svelte";
  import AccountDefinition from "../../components/AccountDefinition.svelte";

  export let params;

  import { getAdaptiveFeeTierInfo, ACCOUNT_DEFINITION } from "../../libs/whirlpool";
  $: adaptiveFeeTierInfoPromise = getAdaptiveFeeTierInfo(params.pubkey);
</script>

<h2>🌀Whirlpool::AdaptiveFeeTier <AccountDefinition href="{ACCOUNT_DEFINITION.AdaptiveFeeTier}" /></h2>

{#await adaptiveFeeTierInfoPromise}
  loading...
  {params.pubkey}
{:then info}
<MetaData accountType="whirlpool/adaptivefeetier" meta={info.meta} />

<ParsedAndDerivedData>
<ParsedData>
  <Data name="whirlpoolsConfig" type="PublicKey" offset="8"><Pubkey type="whirlpool/config" address={info.parsed.whirlpoolsConfig} /></Data>
  <Data name="feeTierIndex" type="u16" offset="40">{info.parsed.feeTierIndex}</Data>
  <Data name="tickSpacing" type="u16" offset="42">{info.parsed.tickSpacing}</Data>
  <Data name="initializePoolAuthority" type="PublicKey" offset="44"><Pubkey address={info.parsed.initializePoolAuthority} /></Data>
  <Data name="delegatedFeeAuthority" type="PublicKey" offset="76"><Pubkey address={info.parsed.delegatedFeeAuthority} /></Data>
  <Data name="defaultBaseFeeRate" type="u16" offset="108">{info.parsed.defaultBaseFeeRate}</Data>

  <Data name="filterPeriod" type="u16" offset="110">{info.parsed.filterPeriod}</Data>
  <Data name="decayPeriod" type="u16" offset="112">{info.parsed.decayPeriod}</Data>
  <Data name="reductionFactor" type="u16" offset="114">{info.parsed.reductionFactor}</Data>
  <Data name="adaptiveFeeControlFactor" type="u32" offset="116">{info.parsed.adaptiveFeeControlFactor}</Data>
  <Data name="maxVolatilityAccumulator" type="u32" offset="120">{info.parsed.maxVolatilityAccumulator}</Data>
  <Data name="tickGroupSize" type="u16" offset="124">{info.parsed.tickGroupSize}</Data>
  <Data name="majorSwapThresholdTicks" type="u16" offset="126">{info.parsed.majorSwapThresholdTicks}</Data>
</ParsedData>

<DerivedData>
  <Data name="default base fee rate">{info.derived.defaultBaseFeeRate} %</Data>
</DerivedData>
</ParsedAndDerivedData>
{/await}

<style>
</style>