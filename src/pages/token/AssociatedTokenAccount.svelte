<script lang="ts">
  import { utils, translateAddress } from "@project-serum/anchor";

  import { getTokenList, TokenInfo } from "../../libs/orcaapi";
  import Pubkey from "../../components/Pubkey.svelte";

  let wallet;
  let selected;
  $: ata = undefined;

  $: tokenListPromise = getTokenList();

  async function onSubmit() {
    ata = undefined; // to reset Pubkey component
    ata = await utils.token.associatedAddress({
      mint: translateAddress(selected),
      owner: translateAddress(wallet),
    });
  }
</script>

<h2>🪙Token::deriveATA</h2>
{#await tokenListPromise}
  loading...
{:then tokenList}

<form on:submit|preventDefault={onSubmit} style="margin-bottom: 1em;">
  <input style="margin: 0.5em 0em;" bind:value={wallet} type="text" size="64" placeholder="wallet address" />
  <select bind:value={selected}>
    {#each tokenList.tokenList.filter((t) => !t.poolToken) as token}
    <option value="{token.mint}">{token.symbol} ({token.name})</option>
    {/each}
  </select>

  <input type="submit" value="Derive ATA!" />
</form>

{#if ata !== undefined}
<Pubkey type="token/account" address={ata} />
{/if}

{/await}

<style>
  a {
    color: #39f;
    text-decoration: none;
  }
</style>