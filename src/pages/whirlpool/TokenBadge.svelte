<script lang="ts">
  import MetaData from "../../components/MetaData.svelte";
  import ParsedData from "../../components/ParsedData.svelte";
  import DerivedData from "../../components/DerivedData.svelte";
  import ParsedAndDerivedData from "../../components/ParsedAndDerivedData.svelte";
  import Data from "../../components/Data.svelte";
  import Pubkey from "../../components/Pubkey.svelte";
  import AccountDefinition from "../../components/AccountDefinition.svelte";

  export let params;

  import { getTokenBadgeInfo, ACCOUNT_DEFINITION } from "../../libs/whirlpool";
  import TokenPubkey from "../../components/TokenPubkey.svelte";
  $: tokenBadgeInfoPromise = getTokenBadgeInfo(params.pubkey);
</script>

<h2>🌀Whirlpool::TokenBadge <AccountDefinition href="{ACCOUNT_DEFINITION.TokenBadge}" /></h2>

{#await tokenBadgeInfoPromise}
  loading...
  {params.pubkey}
{:then tokenBadgeInfo}
<MetaData accountType="whirlpool/tokenbadge" meta={tokenBadgeInfo.meta} />

<ParsedAndDerivedData>
<ParsedData>
  <Data name="whirlpoolsConfig" type="PublicKey" offset="8"><Pubkey type="whirlpool/config" address={tokenBadgeInfo.parsed.whirlpoolsConfig} /></Data>
  <Data name="tokenMint" type="PublicKey" offset="40"><TokenPubkey type="token/mint" address={tokenBadgeInfo.parsed.tokenMint} program={tokenBadgeInfo.derived.tokenProgram} /></Data>
</ParsedData>

<DerivedData>
</DerivedData>
</ParsedAndDerivedData>
{/await}

<style>
</style>