<script lang="ts">
  import MetaData from "../../components/MetaData.svelte";
  import ParsedData from "../../components/ParsedData.svelte";
  import DerivedData from "../../components/DerivedData.svelte";
  import ParsedAndDerivedData from "../../components/ParsedAndDerivedData.svelte";
  import Data from "../../components/Data.svelte";
  import Pubkey from "../../components/Pubkey.svelte";
  import AccountDefinition from "../../components/AccountDefinition.svelte";

  export let params;

  import { getWhirlpoolsConfigExtensionInfo, ACCOUNT_DEFINITION } from "../../libs/whirlpool";
  $: configExtensionInfoPromise = getWhirlpoolsConfigExtensionInfo(params.pubkey);
</script>

<h2>🌀Whirlpool::WhirlpoolsConfigExtension <AccountDefinition href="{ACCOUNT_DEFINITION.WhirlpoolsConfigExtension}" /></h2>

{#await configExtensionInfoPromise}
  loading...
  {params.pubkey}
{:then configExtensionInfo}
<MetaData accountType="whirlpool/configextension" meta={configExtensionInfo.meta} />

<ParsedAndDerivedData>
<ParsedData>
  <Data name="whirlpoolsConfig" type="PublicKey" offset="8"><Pubkey type="whirlpool/config" address={configExtensionInfo.parsed.whirlpoolsConfig} /></Data>
  <Data name="configExtensionAuthority" type="PublicKey" offset="40"><Pubkey address={configExtensionInfo.parsed.configExtensionAuthority} /></Data>
  <Data name="tokenBadgeAuthority" type="PublicKey" offset="72"><Pubkey address={configExtensionInfo.parsed.tokenBadgeAuthority} /></Data>
</ParsedData>

<DerivedData>
</DerivedData>
</ParsedAndDerivedData>
{/await}

<style>
</style>