<script lang="ts">
  import MetaData from "../../components/MetaData.svelte";
  import ParsedData from "../../components/ParsedData.svelte";
  import DerivedData from "../../components/DerivedData.svelte";
  import ParsedAndDerivedData from "../../components/ParsedAndDerivedData.svelte";
  import Data from "../../components/Data.svelte";
  import Pubkey from "../../components/Pubkey.svelte";
  import AccountDefinition from "../../components/AccountDefinition.svelte";

  export let params;

  import { getTokenAccount2022Info, ACCOUNT_DEFINITION } from "../../libs/token2022";
  import ExtensionData from "../../components/ExtensionData.svelte";
  import { toJsonStringWithoutTopBracket } from "../../libs/utils";
  $: tokenAccountInfoPromise = getTokenAccount2022Info(params.pubkey);
</script>

<h2>💎Token2022::Account <AccountDefinition href="{ACCOUNT_DEFINITION.Account}" /></h2>

{#await tokenAccountInfoPromise}
  loading...
  {params.pubkey}
{:then tokenAccountInfo}
<MetaData accountType="token2022/account" meta={tokenAccountInfo.meta} />

<ParsedAndDerivedData>
<ParsedData>
  <Data name="owner" type="PublicKey" offset="32"><Pubkey address={tokenAccountInfo.parsed.base.owner} /></Data>
  <Data name="mint" type="PublicKey" offset="0"><Pubkey type="token2022/mint" address={tokenAccountInfo.parsed.base.mint} /></Data>
  <Data name="amount" type="u64" offset="64">{tokenAccountInfo.parsed.base.amount}</Data>
  <Data name="isNative" type="bool">{tokenAccountInfo.parsed.base.isNative}</Data>
  <Data name="isFrozen" type="bool">{tokenAccountInfo.parsed.base.isFrozen}</Data>
  <Data name="delegate" type="COption<PublicKey>" offset="COption(72)+PublicKey(76)"><Pubkey address={tokenAccountInfo.parsed.base.delegate} /></Data>
  <Data name="delegatedAmount" type="u64" offset="121">{tokenAccountInfo.parsed.base.delegatedAmount}</Data>
  <Data name="closeAuthority" type="COption<PublicKey>" offset="COption(129)+PublicKey(133)"><Pubkey address={tokenAccountInfo.parsed.base.closeAuthority} /></Data>
    <Data name="extensions">
      {#if tokenAccountInfo.parsed.unknownExtensions.length > 0}
      <ExtensionData name="Unknown ExtensionType🚨" href="https://github.com/solana-labs/solana-program-library/blob/master/token/program-2022/src/extension/mod.rs#L906" desc="Please be careful. Account microscope detected unknown extensions.">
        <pre>{JSON.stringify(tokenAccountInfo.parsed.unknownExtensions)}</pre>
      </ExtensionData>
      {/if}
  
      <!-- desc is quoted from: https://github.com/solana-labs/solana-program-library/blob/master/token/program-2022/src/extension/mod.rs#L906 -->
      <ExtensionData name="TransferFeeAmount(2)" href="https://spl.solana.com/token-2022/extensions#transfer-fees" desc="Includes withheld transfer fees">
        <pre>{toJsonStringWithoutTopBracket(tokenAccountInfo.parsed.extensions.transferFeeAmount)}</pre>
      </ExtensionData>
      <ExtensionData name="ImmutableOwner(7)" href="https://spl.solana.com/token-2022/extensions#immutable-owner" desc="Indicates that the Account owner authority cannot be changed">
        <pre>{toJsonStringWithoutTopBracket(tokenAccountInfo.parsed.extensions.immutableOwner)}</pre>
      </ExtensionData>
      <ExtensionData name="MemoTransfer(8)" href="https://spl.solana.com/token-2022/extensions#required-memo-on-transfer" desc="Require inbound transfers to have memo">
        <pre>{toJsonStringWithoutTopBracket(tokenAccountInfo.parsed.extensions.memoTransfer)}</pre>
      </ExtensionData>
      <ExtensionData name="CpiGuard(11)" href="https://spl.solana.com/token-2022/extensions#cpi-guard" desc="Locks privileged token operations from happening via CPI">
        <pre>{toJsonStringWithoutTopBracket(tokenAccountInfo.parsed.extensions.cpiGuard)}</pre>
      </ExtensionData>
      <ExtensionData name="NonTransferableAccount(13)" href="https://spl.solana.com/token-2022/extensions#non-transferable-tokens" desc="Indicates that the tokens in this account belong to a non-transferable mint">
        <pre>{toJsonStringWithoutTopBracket(tokenAccountInfo.parsed.extensions.nonTransferableAccount)}</pre>
      </ExtensionData>
      <ExtensionData name="TransferHookAccount(15)" href="https://spl.solana.com/token-2022/extensions#transfer-hook" desc="Indicates that the tokens in this account belong to a mint with a transfer hook">
        <pre>{toJsonStringWithoutTopBracket(tokenAccountInfo.parsed.extensions.transferHookAccount)}</pre>
      </ExtensionData>
    </Data>
  </ParsedData>

<DerivedData>
  <Data name="decimals">{tokenAccountInfo.derived.decimals}</Data>
  <Data name="amount">{tokenAccountInfo.derived.amount}</Data>
  <Data name="isATA">{tokenAccountInfo.derived.isATA}</Data>
</DerivedData>
</ParsedAndDerivedData>
{/await}

<style>
</style>