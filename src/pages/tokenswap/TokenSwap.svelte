<script lang="ts">
  import MetaData from "../../components/MetaData.svelte";
  import ParsedData from "../../components/ParsedData.svelte";
  import DerivedData from "../../components/DerivedData.svelte";
  import ParsedAndDerivedData from "../../components/ParsedAndDerivedData.svelte";
  import Data from "../../components/Data.svelte";
  import Pubkey from "../../components/Pubkey.svelte";
  import AccountDefinition from "../../components/AccountDefinition.svelte";

  export let params;

  import { getTokenSwapInfo, ACCOUNT_DEFINITION } from "../../libs/tokenswap";
  $: infoPromise = getTokenSwapInfo(params.pubkey);

  import { TokenInfo } from "../../libs/orcaapi";
  function symbol_if_not_undefined(tokenInfo: TokenInfo, symbolOnly: boolean = false): string {
    if (tokenInfo === undefined) return "";
    return symbolOnly ? tokenInfo.symbol : `(${tokenInfo.symbol})`;
  }

  function price_unit_if_not_undefined(baseTokenInfo: TokenInfo, quoteTokenInfo: TokenInfo): string {
    if (baseTokenInfo === undefined || quoteTokenInfo === undefined) return "";
    return `${quoteTokenInfo.symbol}/${baseTokenInfo.symbol}`;
  }
</script>

<h2>⚖️TokenSwap::SwapState <AccountDefinition href="{ACCOUNT_DEFINITION.TokenSwap}" /></h2>
  
{#await infoPromise}
  loading...
  {params.pubkey}
{:then info}
<MetaData accountType="tokenswap/swapstate" meta={info.meta} />

<ParsedAndDerivedData>
<ParsedData>
  <Data name="bumpSeed" type="u8" offset="2">{info.parsed.bumpSeed}</Data>
  <Data name="tokenProgram" type="PublicKey" offset="3"><Pubkey address={info.parsed.tokenProgramId} /></Data>
  <Data name="vaultA" type="PublicKey" offset="35"><Pubkey type="token/account" address={info.parsed.vaultA} /></Data>
  <Data name="vaultB" type="PublicKey" offset="67"><Pubkey type="token/account" address={info.parsed.vaultB} /></Data>
  <Data name="poolMint" type="PublicKey" offset="99"><Pubkey type="token/mint" address={info.parsed.poolMint} /></Data>
  <Data name="mintA" type="PublicKey" offset="131"><Pubkey type="token/mint" address={info.parsed.mintA} /></Data>
  <Data name="mintB" type="PublicKey" offset="163"><Pubkey type="token/mint" address={info.parsed.mintB} /></Data>
  <Data name="poolFeeAccount" type="PublicKey" offset="195"><Pubkey type="token/account" address={info.parsed.poolFeeAccount} /></Data>
  <Data name="traderFee" type="u64, u64" offset="u64(227)+u64(235)">{info.parsed.traderFee.numerator} / {info.parsed.traderFee.denominator}</Data>
  <Data name="ownerFee" type="u64, u64" offset="u64(243)+u64(251)">{info.parsed.ownerFee.numerator} / {info.parsed.ownerFee.denominator}</Data>
  <Data name="curveType" type="u8" offset="283">{info.parsed.curveType}</Data>
  {#if info.parsed.curveType === "Stable"}
  <Data name="amp" type="u64" offset="284">{info.parsed.amp}</Data>
  {/if}
</ParsedData>

<DerivedData>
  <Data name="pool / aquafarm / doubledip">
    <table style="border-spacing: 0;">
      <thead><th>account</th><th>pubkey</th></thead>
      <tbody>
        <tr><td>pool</td><td><Pubkey type="tokenswap/swapstate" address={info.meta.pubkey} /></td></tr>
        <tr><td>aquafarm</td><td><Pubkey type="aquafarm/globalfarm" address={info.derived.aquaFarm} /></td></tr>
        <tr><td>doubledip</td><td><Pubkey type="aquafarm/globalfarm" address={info.derived.doubleDip} /></td></tr>
      </tbody>
    </table>  
  </Data>

  <Data name="decimals">
    <table style="border-spacing: 0;">
      <thead><th>token</th><th>decimals</th></thead>
      <tbody>
        <tr><td>A{symbol_if_not_undefined(info.derived.tokenInfoA)}</td><td>{info.derived.decimalsA}</td></tr>
        <tr><td>B{symbol_if_not_undefined(info.derived.tokenInfoB)}</td><td>{info.derived.decimalsB}</td></tr>
        <tr><td>LP</td><td>{info.derived.decimalsLP}</td></tr>
      </tbody>
    </table>  
  </Data>
  <Data name="LP token supply">{info.derived.supplyLP}</Data>
  <Data name="price">{info.derived.price} {price_unit_if_not_undefined(info.derived.tokenInfoA, info.derived.tokenInfoB)}</Data>
  <Data name="fee rate">{info.derived.feeRate} %</Data>
  <Data name="token vault amount">
    <table style="border-spacing: 0;">
      <thead><th>token</th><th>amount</th></thead>
      <tbody>
        <tr><td>A{symbol_if_not_undefined(info.derived.tokenInfoA)}</td><td>{info.derived.tokenVaultAAmount}</td></tr>
        <tr><td>B{symbol_if_not_undefined(info.derived.tokenInfoB)}</td><td>{info.derived.tokenVaultBAmount}</td></tr>
      </tbody>
    </table>  
  </Data>
  <Data name="pool fee account amount">{info.derived.poolFeeAccountAmount}</Data>
</DerivedData>
</ParsedAndDerivedData>
{/await}

<style>
  th, td {
    padding: 0.1em 0.5em;
  }
</style>