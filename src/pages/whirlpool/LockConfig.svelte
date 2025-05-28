<script lang="ts">
  import MetaData from "../../components/MetaData.svelte";
  import ParsedData from "../../components/ParsedData.svelte";
  import DerivedData from "../../components/DerivedData.svelte";
  import ParsedAndDerivedData from "../../components/ParsedAndDerivedData.svelte";
  import Data from "../../components/Data.svelte";
  import Pubkey from "../../components/Pubkey.svelte";
  import AccountDefinition from "../../components/AccountDefinition.svelte";

  export let params;

  import { getLockConfigInfo, ACCOUNT_DEFINITION } from "../../libs/whirlpool";
  $: lockConfigInfoPromise = getLockConfigInfo(params.pubkey);
</script>

<h2>🌀Whirlpool::LockConfig <AccountDefinition href="{ACCOUNT_DEFINITION.LockConfig}" /></h2>

{#await lockConfigInfoPromise}
  loading...
  {params.pubkey}
{:then info}
<MetaData accountType="whirlpool/lockconfig" meta={info.meta} />

<ParsedAndDerivedData>
<ParsedData>
  <Data name="position" type="PublicKey" offset="8"><Pubkey type="whirlpool/position" address={info.parsed.position} /></Data>
  <Data name="positionOwner" type="PublicKey" offset="40"><Pubkey address={info.parsed.positionOwner} /></Data>
  <Data name="whirlpool" type="PublicKey" offset="72"><Pubkey type="whirlpool/whirlpool" address={info.parsed.whirlpool} /></Data>
  <Data name="lockedTimestamp" type="u64" offset="104">{info.parsed.lockedTimestamp.toString()}</Data>
  <Data name="lockType" type="LockTypeLabel" offset="112">{JSON.stringify(info.parsed.lockType)}</Data>
</ParsedData>

<DerivedData>
  <Data name="locked timestamp">{info.derived.lockedTimestamp.format("YYYY/MM/DD HH:mm:ss UTCZZ")}</Data>
</DerivedData>
</ParsedAndDerivedData>
{/await}

<style>
</style>