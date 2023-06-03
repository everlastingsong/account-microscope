<script lang="ts">
  import MetaData from "../../components/MetaData.svelte";
  import ParsedData from "../../components/ParsedData.svelte";
  import DerivedData from "../../components/DerivedData.svelte";
  import ParsedAndDerivedData from "../../components/ParsedAndDerivedData.svelte";
  import Data from "../../components/Data.svelte";
  import Pubkey from "../../components/Pubkey.svelte";
  import AccountDefinition from "../../components/AccountDefinition.svelte";

  export let params;

  import { getPositionBundleInfo, ACCOUNT_DEFINITION } from "../../libs/whirlpool";
  $: positionBundleInfoPromise = getPositionBundleInfo(params.pubkey);
</script>

<h2>🌀Whirlpool::PositionBundle <AccountDefinition href="{ACCOUNT_DEFINITION.PositionBundle}" /></h2>

{#await positionBundleInfoPromise}
  loading...
  {params.pubkey}
{:then positionBundleInfo}
<MetaData>
  <Data name="pubkey" type="PublicKey"><Pubkey type="whirlpool/tickarray" address={positionBundleInfo.meta.pubkey} /></Data>
  <Data name="owner program" type="PublicKey"><Pubkey address={positionBundleInfo.meta.owner} /></Data>
  <Data name="lamports" type="u64">{positionBundleInfo.meta.lamports}</Data>
  <Data name="data size">{positionBundleInfo.meta.data.length}</Data>
</MetaData>

<ParsedAndDerivedData>
<ParsedData>
  <Data name="positionBundleMint" type="PublicKey" offset="8"><Pubkey type="token/mint" address={positionBundleInfo.parsed.positionBundleMint} /></Data>
  <Data name="positionBitmap" type="[u8; 32]" offset="40">
    <table style="border-spacing: 0;">
      <thead><th>index</th><th>0</th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th><th>6</th><th>7</th></thead>
      <tbody>
      {#each positionBundleInfo.parsed.positionBitmap as row, index}
      <tr>
        <td>{index}</td>
        {#each [0, 1, 2, 3, 4, 5, 6, 7].map((i) => (row & (1<<i)) > 0) as bit}
        <td>{bit ? 1 : 0}</td>
        {/each}
      </tr>
      {/each}
      </tbody>
    </table>  
  </Data>
</ParsedData>

<DerivedData>
  <Data name="occupied">{positionBundleInfo.derived.occupied} / {positionBundleInfo.derived.occupied + positionBundleInfo.derived.unoccupied}</Data>
  <Data name="bundled positions">
    <table style="border-spacing: 0;">
      <thead><th>index</th><th>position</th><th>whirlpool</th><th>tickLowerIndex</th><th>tickUpperIndex</th><th>liquidity</th></thead>
      <tbody>
      {#each positionBundleInfo.derived.bundledPositions as position}
      <tr>
        <td>{position.bundleIndex}</td>
        <td><Pubkey type="whirlpool/position" address={position.address} short/></td>
        <td><Pubkey type="whirlpool/whirlpool" address={position.whirlpool} short/></td>
        <td>{position.tickLowerIndex}</td>
        <td>{position.tickUpperIndex}</td>
        <td>{position.liquidity}</td>
      </tr>
      {/each}
      </tbody>
    </table>
  </Data>
</DerivedData>
</ParsedAndDerivedData>
{/await}

<style>
  th, td {
    padding: 0.1em 0.5em;
  }
</style>