<script lang="ts">
  import MetaData from "../../components/MetaData.svelte";
  import ParsedData from "../../components/ParsedData.svelte";
  import DerivedData from "../../components/DerivedData.svelte";
  import ParsedAndDerivedData from "../../components/ParsedAndDerivedData.svelte";
  import Data from "../../components/Data.svelte";
  import Pubkey from "../../components/Pubkey.svelte";
  import AccountDefinition from "../../components/AccountDefinition.svelte";

  export let params;

  import { getMint2022Info, ACCOUNT_DEFINITION } from "../../libs/token2022";
//  import Laboratory from "../../components/Laboratory.svelte";
//  import TokenMintCreateAta from "../../components/TokenMintCreateATA.svelte";
//  import TokenMintRewriteAuthority from "../../components/TokenMintRewriteAuthority.svelte";
  $: mintInfoPromise = getMint2022Info(params.pubkey);
</script>

<h2>💎Token2022::Mint <AccountDefinition href="{ACCOUNT_DEFINITION.Mint}" /></h2>

{#await mintInfoPromise}
  loading...
  {params.pubkey}
{:then mintInfo}
<MetaData accountType="token2022/mint" meta={mintInfo.meta} />

<ParsedAndDerivedData>
<ParsedData>
  <Data name="decimals" type="u8" offset="44">{mintInfo.parsed.base.decimals}</Data>
  <Data name="supply" type="u64" offset="36">{mintInfo.parsed.base.supply}</Data>
  <Data name="mintAuthority" type="COption<PublicKey>" offset="COption(0)+PublicKey(4)"><Pubkey address={mintInfo.parsed.base.mintAuthority} /></Data>
  <Data name="freezeAuthority" type="COption<PublicKey>" offset="COption(46)+PublicKey(50)"><Pubkey address={mintInfo.parsed.base.freezeAuthority} /></Data>
  <Data name="extensions">
    <pre>
    {JSON.stringify(mintInfo.parsed.extensions, null, 2)}
    </pre>
  </Data>
</ParsedData>

<DerivedData>
  <Data name="supply">{mintInfo.derived.supply}</Data>
</DerivedData>

<!--Laboratory>
  <Data name="create ATA account">
    <TokenMintCreateAta {mintInfo} />
  </Data>
  <Data name="rewrite mintAuthority">
    <TokenMintRewriteAuthority {mintInfo} />
  </Data>
</Laboratory-->

</ParsedAndDerivedData>
{/await}

<style>
</style>