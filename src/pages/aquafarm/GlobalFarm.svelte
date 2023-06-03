<script lang="ts">
  import MetaData from "../../components/MetaData.svelte";
  import ParsedData from "../../components/ParsedData.svelte";
  import DerivedData from "../../components/DerivedData.svelte";
  import ParsedAndDerivedData from "../../components/ParsedAndDerivedData.svelte";
  import Data from "../../components/Data.svelte";
  import Pubkey from "../../components/Pubkey.svelte";
  import AccountDefinition from "../../components/AccountDefinition.svelte";

  export let params;

  import { getGlobalFarmInfo, ACCOUNT_DEFINITION } from "../../libs/aquafarm";
    import { derived } from "svelte/store";
  $: infoPromise = getGlobalFarmInfo(params.pubkey);
</script>

<h2>🐋AquaFarm::GlobalFarm <AccountDefinition href="{ACCOUNT_DEFINITION.GlobalFarm}" /></h2>
  
{#await infoPromise}
  loading...
  {params.pubkey}
{:then info}
<MetaData accountType="aquafarm/globalfarm" meta={info.meta} />

<ParsedAndDerivedData>
<ParsedData>
  <Data name="nonce" type="u8" offset="2">{info.parsed.nonce}</Data>
  <Data name="tokenProgramId" type="PublicKey" offset="3"><Pubkey address={info.parsed.tokenProgramId} /></Data>
  <Data name="emissionsAuthority" type="PublicKey" offset="35"><Pubkey address={info.parsed.emissionsAuthority} /></Data>
  <Data name="removeRewardsAuthority" type="PublicKey" offset="67"><Pubkey address={info.parsed.removeRewardsAuthority} /></Data>

  <Data name="baseTokenMint" type="PublicKey" offset="99"><Pubkey type="token/mint" address={info.parsed.baseTokenMint} /></Data>
  <Data name="baseTokenVault" type="PublicKey" offset="131"><Pubkey type="token/account" address={info.parsed.baseTokenVault} /></Data>
  <Data name="rewardTokenVault" type="PublicKey" offset="163"><Pubkey type="token/account" address={info.parsed.rewardTokenVault} /></Data>
  <Data name="farmTokenMint" type="PublicKey" offset="195"><Pubkey type="token/mint" address={info.parsed.farmTokenMint} /></Data>

  <Data name="emissionsPerSecondNumerator/Denominator" type="u64, u64" offset="u64(227)+u64(235)">{info.parsed.emissionsPerSecondNumerator} / {info.parsed.emissionsPerSecondDenominator}</Data>
  <Data name="lastUpdatedTimestamp" type="u64" offset="243">{info.parsed.lastUpdatedTimestamp}</Data>
  <Data name="cumulativeEmissionsPerFarmToken" type="u256" offset="251">{info.parsed.cumulativeEmissionsPerFarmToken}</Data>
</ParsedData>

<DerivedData>
  <Data name="is aquafarm">{info.derived.isAquaFarm}</Data>
  <Data name="is doubledip">{info.derived.isDoubleDip}</Data>
  <Data name="pool">{info.derived.poolName}</Data>
  <Data name="pool / aquafarm / doubledip">
    <table style="border-spacing: 0;">
      <thead><th>account</th><th>pubkey</th></thead>
      <tbody>
        <tr><td>pool</td><td><Pubkey type="tokenswap/swapstate" address={info.derived.pool} /></td></tr>
        <tr><td>aquafarm</td><td><Pubkey type="aquafarm/globalfarm" address={info.derived.aquaFarm} /></td></tr>
        <tr><td>doubledip</td><td><Pubkey type="aquafarm/globalfarm" address={info.derived.doubleDip} /></td></tr>
      </tbody>
    </table>  
  </Data>

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