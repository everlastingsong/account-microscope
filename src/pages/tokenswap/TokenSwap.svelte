<script lang="ts">
  import MetaData from "../../components/MetaData.svelte";
  import ParsedData from "../../components/ParsedData.svelte";
  import DerivedData from "../../components/DerivedData.svelte";
  import ParsedAndDerivedData from "../../components/ParsedAndDerivedData.svelte";
  import Data from "../../components/Data.svelte";
  import Pubkey from "../../components/Pubkey.svelte";

  export let params;

  import { getTokenSwapInfo } from "../../libs/tokenswap";
  $: tokenSwapInfoPromise = getTokenSwapInfo(params.pubkey);
</script>

<h2>⚖️TokenSwap::SwapState</h2>
  
{#await tokenSwapInfoPromise}
  loading...
  {params.pubkey}
{:then tokenSwapInfo}
<MetaData>
  <Data name="pubkey" type="PublicKey"><Pubkey type="tokenswap/swapstate" address={tokenSwapInfo.meta.pubkey} /></Data>
  <Data name="owner program" type="PublicKey"><Pubkey address={tokenSwapInfo.meta.owner} /></Data>
  <Data name="lamports" type="u64">{tokenSwapInfo.meta.lamports}</Data>
  <Data name="data size">{tokenSwapInfo.meta.data.length}</Data>
</MetaData>

<ParsedAndDerivedData>
<ParsedData>
  <Data name="bumpSeed" type="u8">{tokenSwapInfo.parsed.bumpSeed}</Data>
  <Data name="tokenProgram" type="PublicKey"><Pubkey address={tokenSwapInfo.parsed.tokenProgramId} /></Data>
  <Data name="vaultA" type="PublicKey"><Pubkey type="token/account" address={tokenSwapInfo.parsed.vaultA} /></Data>
  <Data name="vaultB" type="PublicKey"><Pubkey type="token/account" address={tokenSwapInfo.parsed.vaultB} /></Data>
  <Data name="poolMint" type="PublicKey"><Pubkey type="token/mint" address={tokenSwapInfo.parsed.poolMint} /></Data>
  <Data name="mintA" type="PublicKey"><Pubkey type="token/mint" address={tokenSwapInfo.parsed.mintA} /></Data>
  <Data name="mintB" type="PublicKey"><Pubkey type="token/mint" address={tokenSwapInfo.parsed.mintB} /></Data>
  <Data name="poolFeeAccount" type="PublicKey"><Pubkey type="token/account" address={tokenSwapInfo.parsed.poolFeeAccount} /></Data>
  <Data name="traderFee" type="u64, u64">{tokenSwapInfo.parsed.traderFee.numerator} / {tokenSwapInfo.parsed.traderFee.denominator}</Data>
  <Data name="ownerFee" type="u64, u64">{tokenSwapInfo.parsed.ownerFee.numerator} / {tokenSwapInfo.parsed.ownerFee.denominator}</Data>
  <Data name="curveType" type="u8">{tokenSwapInfo.parsed.curveType}</Data>
  {#if tokenSwapInfo.parsed.curveType === "Stable"}
  <Data name="amp" type="u64">{tokenSwapInfo.parsed.amp}</Data>
  {/if}
</ParsedData>

<DerivedData>
  <Data name="decimals">
    <table style="border-spacing: 0;">
      <thead><th>token</th><th>decimals</th></thead>
      <tbody>
        <tr><td>A</td><td>{tokenSwapInfo.derived.decimalsA}</td></tr>
        <tr><td>B</td><td>{tokenSwapInfo.derived.decimalsB}</td></tr>
        <tr><td>LP</td><td>{tokenSwapInfo.derived.decimalsLP}</td></tr>
      </tbody>
    </table>  
  </Data>
  <Data name="LP token supply">{tokenSwapInfo.derived.supplyLP}</Data>
  <Data name="price">{tokenSwapInfo.derived.price}</Data>
  <Data name="fee rate">{tokenSwapInfo.derived.feeRate} %</Data>
  <Data name="token vault amount">
    <table style="border-spacing: 0;">
      <thead><th>token</th><th>amount</th></thead>
      <tbody>
        <tr><td>A</td><td>{tokenSwapInfo.derived.tokenVaultAAmount}</td></tr>
        <tr><td>B</td><td>{tokenSwapInfo.derived.tokenVaultBAmount}</td></tr>
      </tbody>
    </table>  
  </Data>
  <Data name="pool fee account amount">{tokenSwapInfo.derived.poolFeeAccountAmount}</Data>
</DerivedData>
</ParsedAndDerivedData>
{/await}

<style>
  th, td {
    padding: 0.1em 0.5em;
  }
</style>