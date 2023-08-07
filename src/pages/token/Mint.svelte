<script lang="ts">
  import MetaData from "../../components/MetaData.svelte";
  import ParsedData from "../../components/ParsedData.svelte";
  import DerivedData from "../../components/DerivedData.svelte";
  import ParsedAndDerivedData from "../../components/ParsedAndDerivedData.svelte";
  import Data from "../../components/Data.svelte";
  import Pubkey from "../../components/Pubkey.svelte";
  import AccountDefinition from "../../components/AccountDefinition.svelte";

  export let params;

  import { getMintInfo, ACCOUNT_DEFINITION } from "../../libs/token";
  $: mintInfoPromise = getMintInfo(params.pubkey);
</script>

<h2>🪙Token::Mint <AccountDefinition href="{ACCOUNT_DEFINITION.Mint}" /></h2>

{#await mintInfoPromise}
  loading...
  {params.pubkey}
{:then mintInfo}
<MetaData accountType="token/mint" meta={mintInfo.meta} />

<ParsedAndDerivedData>
<ParsedData>
  <Data name="decimals" type="u8" offset="44">{mintInfo.parsed.decimals}</Data>
  <Data name="supply" type="u64" offset="36">{mintInfo.parsed.supply}</Data>
  <Data name="mintAuthority" type="COption<PublicKey>" offset="COption(0)+PublicKey(4)"><Pubkey address={mintInfo.parsed.mintAuthority} /></Data>
  <Data name="freezeAuthority" type="COption<PublicKey>" offset="COption(46)+PublicKey(50)"><Pubkey address={mintInfo.parsed.freezeAuthority} /></Data>
</ParsedData>

<DerivedData>
  <Data name="supply">{mintInfo.derived.supply}</Data>
  <Data name="metadata"><Pubkey address={mintInfo.derived.metadata} /></Data>

  <!--
  <Data name="largest holders (Solscan)">
    <table style="border-spacing: 0;">
      <thead><th>owner</th><th>address</th><th>amount<th></thead>
      <tbody>
      {#each mintInfo.derived.largestHolders as holder}
      <tr>
        <td><Pubkey address={holder.owner} short /></td>
        <td><Pubkey address={holder.address} short /></td>
        <td>{holder.decimalAmount}</td>
      </tr>
      {/each}
      </tbody>
    </table>  
  </Data>
  -->

  <Data name="is whirlpool position mint">{mintInfo.derived.whirlpoolPosition !== undefined}</Data>
  {#if mintInfo.derived.whirlpoolPosition !== undefined}
  <Data name="whirlpool position"><Pubkey type="whirlpool/position" address={mintInfo.derived.whirlpoolPosition} /></Data>
  {/if}

  <Data name="is whirlpool position bundle mint">{mintInfo.derived.whirlpoolPositionBundle !== undefined}</Data>
  {#if mintInfo.derived.whirlpoolPositionBundle !== undefined}
  <Data name="whirlpool position bundle"><Pubkey type="whirlpool/positionbundle" address={mintInfo.derived.whirlpoolPositionBundle} /></Data>
  {/if}
</DerivedData>
</ParsedAndDerivedData>
{/await}

<style>
</style>