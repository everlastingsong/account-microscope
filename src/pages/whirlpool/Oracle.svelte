<script lang="ts">
  import MetaData from "../../components/MetaData.svelte";
  import ParsedData from "../../components/ParsedData.svelte";
  import DerivedData from "../../components/DerivedData.svelte";
  import ParsedAndDerivedData from "../../components/ParsedAndDerivedData.svelte";
  import Data from "../../components/Data.svelte";
  import Pubkey from "../../components/Pubkey.svelte";
  import AccountDefinition from "../../components/AccountDefinition.svelte";

  export let params;

  import { getOracleInfo, ACCOUNT_DEFINITION } from "../../libs/whirlpool";
  $: oracleInfoPromise = getOracleInfo(params.pubkey);
</script>

<h2>🌀Whirlpool::Oracle <AccountDefinition href="{ACCOUNT_DEFINITION.Oracle}" /></h2>

{#await oracleInfoPromise}
  loading...
  {params.pubkey}
{:then info}
<MetaData accountType="whirlpool/oracle" meta={info.meta} />

<ParsedAndDerivedData>
<ParsedData>
  <Data name="whirlpool" type="PublicKey" offset="8"><Pubkey type="whirlpool/whirlpool" address={info.parsed.whirlpool} /></Data>
  <Data name="tradeEnableTimestamp" type="u64" offset="40">{info.parsed.tradeEnableTimestamp}</Data>

  <Data name="adaptiveFeeConstants">
  <Data name="filterPeriod" type="u16" offset="40">{info.parsed.adaptiveFeeConstants.filterPeriod}</Data>
  <Data name="decayPeriod" type="u16" offset="42">{info.parsed.adaptiveFeeConstants.decayPeriod}</Data>
  <Data name="reductionFactor" type="u16" offset="44">{info.parsed.adaptiveFeeConstants.reductionFactor}</Data>
  <Data name="adaptiveFeeControlFactor" type="u32" offset="46">{info.parsed.adaptiveFeeConstants.adaptiveFeeControlFactor}</Data>
  <Data name="maxVolatilityAccumulator" type="u32" offset="50">{info.parsed.adaptiveFeeConstants.maxVolatilityAccumulator}</Data>
  <Data name="tickGroupSize" type="u16" offset="54">{info.parsed.adaptiveFeeConstants.tickGroupSize}</Data>
  <Data name="majorSwapThresholdTicks" type="u16" offset="56">{info.parsed.adaptiveFeeConstants.majorSwapThresholdTicks}</Data>
  </Data>

  <Data name="adaptiveFeeVariables">
    <Data name="lastReferenceUpdateTimestamp" type="u64" offset="72">{info.parsed.adaptiveFeeVariables.lastReferenceUpdateTimestamp}</Data>
    <Data name="lastMajorSwapTimestamp" type="u64" offset="80">{info.parsed.adaptiveFeeVariables.lastMajorSwapTimestamp}</Data>
    <Data name="volatilityReference" type="u32" offset="88">{info.parsed.adaptiveFeeVariables.volatilityReference}</Data>
    <Data name="tickGroupIndexReference" type="i32" offset="92">{info.parsed.adaptiveFeeVariables.tickGroupIndexReference}</Data>
    <Data name="volatilityAccumulator" type="u32" offset="96">{info.parsed.adaptiveFeeVariables.volatilityAccumulator}</Data>
  </Data>
</ParsedData>

<DerivedData>
  <Data name="trade enable timestamp">{info.derived.tradeEnableTimestamp.format("YYYY/MM/DD HH:mm:ss UTCZZ")} %</Data>
</DerivedData>
</ParsedAndDerivedData>
{/await}

<style>
</style>