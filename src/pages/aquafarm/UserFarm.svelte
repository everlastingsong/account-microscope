<script lang="ts">
  import MetaData from "../../components/MetaData.svelte";
  import ParsedData from "../../components/ParsedData.svelte";
  import DerivedData from "../../components/DerivedData.svelte";
  import ParsedAndDerivedData from "../../components/ParsedAndDerivedData.svelte";
  import Data from "../../components/Data.svelte";
  import Pubkey from "../../components/Pubkey.svelte";
  import AccountDefinition from "../../components/AccountDefinition.svelte";

  export let params;

  import { getUserFarmInfo, ACCOUNT_DEFINITION } from "../../libs/aquafarm";
  $: infoPromise = getUserFarmInfo(params.pubkey);
</script>

<h2>🐋AquaFarm::UserFarm <AccountDefinition href="{ACCOUNT_DEFINITION.UserFarm}" /></h2>
  
{#await infoPromise}
  loading...
  {params.pubkey}
{:then info}
<MetaData>
  <Data name="pubkey" type="PublicKey"><Pubkey type="aquafarm/userfarm" address={info.meta.pubkey} /></Data>
  <Data name="owner program" type="PublicKey"><Pubkey address={info.meta.owner} /></Data>
  <Data name="lamports" type="u64">{info.meta.lamports}</Data>
  <Data name="data size">{info.meta.data.length}</Data>
</MetaData>

<ParsedAndDerivedData>
<ParsedData>
  <Data name="globalFarm" type="PublicKey" offset="2"><Pubkey type="aquafarm/globalfarm" address={info.parsed.globalFarm} /></Data>
  <Data name="owner" type="PublicKey" offset="34"><Pubkey address={info.parsed.owner} /></Data>
  <Data name="baseTokensConverted" type="u64" offset="42">{info.parsed.baseTokensConverted}</Data>
  <Data name="cumulativeEmissionsCheckpoint" type="u256" offset="50">{info.parsed.cumulativeEmissionsCheckpoint}</Data>
</ParsedData>

<DerivedData>
  <Data name="decimals">
    <table style="border-spacing: 0;">
      <thead><th>token</th><th>decimals</th></thead>
      <tbody>
        <tr><td>Base</td><td>{info.derived.decimalsBase}</td></tr>
        <tr><td>Farm</td><td>{info.derived.decimalsFarm}</td></tr>
        <tr><td>Reward</td><td>{info.derived.decimalsReward}</td></tr>
      </tbody>
    </table>  
  </Data>
  <Data name="rewardMint"><Pubkey type="token/mint" address={info.derived.rewardMint} /></Data>
  <Data name="harvestable reward amount">{info.derived.harvestableAmount}</Data>
  <Data name="harvestable reward amount (estimate)">{info.derived.currentHarvestableAmount}</Data>
  <Data name="farm reward weekly emission">{info.derived.rewardWeeklyEmission}</Data>
  <Data name="share of farm">{info.derived.sharePercentOfFarm} %</Data>
  <Data name="reward weekly earned">{info.derived.rewardWeeklyAmount}</Data>
</DerivedData>
</ParsedAndDerivedData>
{/await}

<style>
  th, td {
    padding: 0.1em 0.5em;
  }
</style>