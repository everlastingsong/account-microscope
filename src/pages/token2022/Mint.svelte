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
  import ExtensionData from "../../components/ExtensionData.svelte";
  import { toJsonStringWithoutTopBracket } from "../../libs/utils";
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
    {#if mintInfo.parsed.unknownExtensions.length > 0}
    <ExtensionData name="Unknown ExtensionType🚨" href="https://github.com/solana-labs/solana-program-library/blob/master/token/program-2022/src/extension/mod.rs#L906" desc="Please be careful. Account microscope detected unknown extensions.">
      <pre>{JSON.stringify(mintInfo.parsed.unknownExtensions)}</pre>
    </ExtensionData>
    {/if}

    <ExtensionData name="confidential transfer extensions" href="" desc="Includes several confidential transfer extensions">
      {#if mintInfo.parsed.extensions.confidentialTransferExtensions}
        <pre>{JSON.stringify(mintInfo.parsed.extensions.confidentialTransferExtensions)}</pre>
      {:else}
        <pre>No extensions</pre>
      {/if}
    </ExtensionData>

    <!-- desc is quoted from: https://github.com/solana-labs/solana-program-library/blob/master/token/program-2022/src/extension/mod.rs#L906 -->
    <ExtensionData name="TransferFeeConfig(1)" href="https://spl.solana.com/token-2022/extensions#transfer-fees" desc="Includes transfer fee rate info and accompanying authorities to withdraw and set the fee">
      <pre>{toJsonStringWithoutTopBracket(mintInfo.parsed.extensions.transferFeeConfig)}</pre>
    </ExtensionData>
    <ExtensionData name="MintCloseAuthority(3)" href="https://spl.solana.com/token-2022/extensions#mint-close-authority" desc="Includes an optional mint close authority">
      <pre>{toJsonStringWithoutTopBracket(mintInfo.parsed.extensions.mintCloseAuthority)}</pre>
    </ExtensionData>
    <ExtensionData name="DefaultAccountState(6)" href="https://spl.solana.com/token-2022/extensions#default-account-state" desc="Specifies the default Account::state for new Accounts">
      <pre>{toJsonStringWithoutTopBracket(mintInfo.parsed.extensions.defaultAccountState)}</pre>
    </ExtensionData>
    <ExtensionData name="NonTransferable(9)" href="https://spl.solana.com/token-2022/extensions#non-transferable-tokens" desc="Indicates that the tokens from this mint can't be transfered">
      <pre>{toJsonStringWithoutTopBracket(mintInfo.parsed.extensions.nonTransferable)}</pre>
    </ExtensionData>
    <ExtensionData name="InterestBearingConfig(10)" href="https://spl.solana.com/token-2022/extensions#interest-bearing-tokens" desc="Tokens accrue interest over time">
      <pre>{toJsonStringWithoutTopBracket(mintInfo.parsed.extensions.interestBearingConfig)}</pre>
    </ExtensionData>
    <ExtensionData name="PermanentDelegate(12)" href="https://spl.solana.com/token-2022/extensions#permanent-delegate" desc="Includes an optional permanent delegate">
      <pre>{toJsonStringWithoutTopBracket(mintInfo.parsed.extensions.permanentDelegate)}</pre>
    </ExtensionData>
    <ExtensionData name="TransferHook(14)" href="https://spl.solana.com/token-2022/extensions#transfer-hook" desc="Mint requires a CPI to a program implementing the 'transfer hook' interface">
      <pre>{toJsonStringWithoutTopBracket(mintInfo.parsed.extensions.transferHook)}</pre>
    </ExtensionData>
    <ExtensionData name="MetadataPointer(18)" href="https://spl.solana.com/token-2022/extensions#metadata-pointer" desc="Mint contains a pointer to another account (or the same account) that holds metadata">
      <pre>{toJsonStringWithoutTopBracket(mintInfo.parsed.extensions.metadataPointer)}</pre>
    </ExtensionData>
    <ExtensionData name="TokenMetadata(19)" href="https://spl.solana.com/token-2022/extensions#metadata" desc="Mint contains token-metadata">
      <pre>{toJsonStringWithoutTopBracket(mintInfo.parsed.extensions.tokenMetadata)}</pre>
    </ExtensionData>

    <ExtensionData name="TokenGroupPointer(20)" href="https://www.solana-program.com/docs/token-2022/extensions#group-pointer" desc="Includes a pointer to a group of tokens">
      <pre>{toJsonStringWithoutTopBracket(mintInfo.parsed.extensions.tokenGroupPointer)}</pre>
    </ExtensionData>
    <ExtensionData name="TokenGroup(21)" href="https://www.solana-program.com/docs/token-2022/extensions#group" desc="Includes a group of tokens">
      <pre>{toJsonStringWithoutTopBracket(mintInfo.parsed.extensions.tokenGroup)}</pre>
    </ExtensionData>
    <ExtensionData name="TokenGroupMemberPointer(22)" href="https://www.solana-program.com/docs/token-2022/extensions#member-pointer" desc="Includes a pointer to a member of a token group">
      <pre>{toJsonStringWithoutTopBracket(mintInfo.parsed.extensions.tokenGroupMemberPointer)}</pre>
    </ExtensionData>
    <ExtensionData name="TokenGroupMember(23)" href="https://www.solana-program.com/docs/token-2022/extensions#member" desc="Includes a member of a token group">
      <pre>{toJsonStringWithoutTopBracket(mintInfo.parsed.extensions.tokenGroupMember)}</pre>
    </ExtensionData>

    <ExtensionData name="ScaledUiAmountConfig(25)" href="https://www.solana-program.com/docs/token-2022/extensions#scaled-ui-amount" desc="Includes a configuration for scaling the UI amount">
      <pre>{toJsonStringWithoutTopBracket(mintInfo.parsed.extensions.scaledUiAmountConfig)}</pre>
    </ExtensionData>
    <ExtensionData name="PausableConfig(26)" href="https://www.solana-program.com/docs/token-2022/extensions#pausable" desc="Includes a configuration for pausing mint operations">
      <pre>{toJsonStringWithoutTopBracket(mintInfo.parsed.extensions.pausableConfig)}</pre>
    </ExtensionData>
  </Data>
</ParsedData>

<DerivedData>
  <Data name="supply">{mintInfo.derived.supply}</Data>
  <Data name="metadata (metaplex)"><Pubkey address={mintInfo.derived.metadataMetaplex} /></Data>
  <Data name="metadata (fluxbeam)"><Pubkey address={mintInfo.derived.metadataFluxbeam} /></Data>
  <Data name="isTokenBadgeInitialized">{mintInfo.derived.isTokenBadgeInitialized}</Data>
  <Data name="tokenBadge"><Pubkey type="whirlpool/tokenbadge" address={mintInfo.derived.tokenBadge} /></Data>
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