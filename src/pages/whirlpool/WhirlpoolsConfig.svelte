<script lang="ts">
  import MetaData from "../../components/MetaData.svelte";
  import ParsedData from "../../components/ParsedData.svelte";
  import DerivedData from "../../components/DerivedData.svelte";
  import ParsedAndDerivedData from "../../components/ParsedAndDerivedData.svelte";
  import Data from "../../components/Data.svelte";
  import Pubkey from "../../components/Pubkey.svelte";
  import AccountDefinition from "../../components/AccountDefinition.svelte";

  export let params;

  import { getWhirlpoolsConfigInfo, ACCOUNT_DEFINITION } from "../../libs/whirlpool";
  $: configInfoPromise = getWhirlpoolsConfigInfo(params.pubkey);
</script>

<h2>🌀Whirlpool::WhirlpoolsConfig <AccountDefinition href="{ACCOUNT_DEFINITION.WhirlpoolsConfig}" /></h2>

{#await configInfoPromise}
  loading...
  {params.pubkey}
{:then configInfo}
<MetaData accountType="whirlpool/config" meta={configInfo.meta} />

<ParsedAndDerivedData>
<ParsedData>
  <Data name="feeAuthority" type="PublicKey" offset="8"><Pubkey address={configInfo.parsed.feeAuthority} /></Data>
  <Data name="collectProtocolFeesAuthority" type="PublicKey" offset="40"><Pubkey address={configInfo.parsed.collectProtocolFeesAuthority} /></Data>
  <Data name="rewardEmissionsSuperAuthority" type="PublicKey" offset="72"><Pubkey address={configInfo.parsed.rewardEmissionsSuperAuthority} /></Data>
  <Data name="defaultProtocolFeeRate" type="u16" offset="104">{configInfo.parsed.defaultProtocolFeeRate}</Data>
</ParsedData>

<DerivedData>
  <Data name="default protocol fee rate">{configInfo.derived.defaultProtocolFeeRate} % of fee</Data>
  <Data name="fee tiers">
    <table style="border-spacing: 0;">
      <thead><th>tick spacing</th><th>initialized</th><th>default fee rate</th><th>pubkey</th></thead>
      <tbody>
      {#each configInfo.derived.feeTiers as feeTier}
      <tr class="{feeTier.isInitialized ? "initialized" : "uninitialized"}">
        <td>{feeTier.tickSpacing}</td>
        <td>{feeTier.isInitialized}</td>
        <td>{feeTier.defaultFeeRate === undefined ? undefined : feeTier.defaultFeeRate + " %"}</td>
        <td><Pubkey type="whirlpool/feetier" address={feeTier.pubkey} short /></td>
      </tr>
      {/each}
      </tbody>
      </table>  
  </Data>
</DerivedData>
</ParsedAndDerivedData>
{/await}

<style>
  tr.uninitialized {
    background-color: lightgray;
  }

  th, td {
    padding: 0.1em 0.5em;
  }
</style>