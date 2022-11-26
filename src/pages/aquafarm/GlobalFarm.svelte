<script lang="ts">
  import MetaData from "../../components/MetaData.svelte";
  import ParsedData from "../../components/ParsedData.svelte";
  import DerivedData from "../../components/DerivedData.svelte";
  import ParsedAndDerivedData from "../../components/ParsedAndDerivedData.svelte";
  import Data from "../../components/Data.svelte";
  import Pubkey from "../../components/Pubkey.svelte";

  export let params;

  import { getGlobalFarmInfo } from "../../libs/aquafarm";
  $: infoPromise = getGlobalFarmInfo(params.pubkey);
</script>

<h2>🐋AquaFarm::GlobalFarm</h2>
  
{#await infoPromise}
  loading...
  {params.pubkey}
{:then info}
<MetaData>
  <Data name="pubkey" type="PublicKey"><Pubkey type="aquafarm/globalfarm" address={info.meta.pubkey} /></Data>
  <Data name="owner program" type="PublicKey"><Pubkey address={info.meta.owner} /></Data>
  <Data name="lamports" type="u64">{info.meta.lamports}</Data>
  <Data name="data size">{info.meta.data.length}</Data>
</MetaData>

<ParsedAndDerivedData>
<ParsedData>
  <Data name="nonce" type="u8">{info.parsed.nonce}</Data>
  <Data name="tokenProgramId" type="PublicKey"><Pubkey address={info.parsed.tokenProgramId} /></Data>
  <Data name="emissionsAuthority" type="PublicKey"><Pubkey address={info.parsed.emissionsAuthority} /></Data>
  <Data name="removeRewardsAuthority" type="PublicKey"><Pubkey address={info.parsed.removeRewardsAuthority} /></Data>

  <Data name="baseTokenMint" type="PublicKey"><Pubkey type="token/mint" address={info.parsed.baseTokenMint} /></Data>
  <Data name="baseTokenVault" type="PublicKey"><Pubkey type="token/account" address={info.parsed.baseTokenVault} /></Data>
  <Data name="rewardTokenVault" type="PublicKey"><Pubkey type="token/account" address={info.parsed.rewardTokenVault} /></Data>
  <Data name="farmTokenMint" type="PublicKey"><Pubkey type="token/mint" address={info.parsed.farmTokenMint} /></Data>

  <Data name="emissionsPerSecondNumerator/Denominator" type="u64, u64">{info.parsed.emissionsPerSecondNumerator} / {info.parsed.emissionsPerSecondDenominator}</Data>
  <Data name="lastUpdatedTimestamp" type="u64">{info.parsed.lastUpdatedTimestamp}</Data>
  <Data name="cumulativeEmissionsPerFarmToken" type="u256">{info.parsed.cumulativeEmissionsPerFarmToken}</Data>
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
  <Data name="authority"><Pubkey address={info.derived.authority} /></Data>
  <Data name="base token supply">{info.derived.supplyBase}</Data>
  <Data name="farm token supply">{info.derived.supplyFarm}</Data>
  <Data name="reward vault amount">{info.derived.rewardVaultAmount}</Data>
  <Data name="reward weekly emission">{info.derived.rewardWeeklyEmission}</Data>
  <Data name="reward last updated timestamp">{info.derived.lastUpdatedTimestamp.format("YYYY/MM/DD HH:mm:ss UTCZZ")}</Data>
</DerivedData>
</ParsedAndDerivedData>
{/await}

<style>
  th, td {
    padding: 0.1em 0.5em;
  }
</style>