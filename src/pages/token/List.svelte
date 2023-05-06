<script lang="ts">
  import { translateAddress } from "@project-serum/anchor";
  import { TokenAccountList, listTokenAccounts } from "../../libs/token";
  import Pubkey from "../../components/Pubkey.svelte";

  let wallet;
  let hideZeroAccounts = true;

  $: tokenAccountListPromise = new Promise<TokenAccountList>((resolve) => resolve([]));

  async function onSubmit() {
    const walletAddress = translateAddress(wallet);
    tokenAccountListPromise = listTokenAccounts(walletAddress);
  }
</script>

<h2>🪙Token::listTokenAccounts</h2>
<form on:submit|preventDefault={onSubmit} style="margin-bottom: 1em;">
  <input style="margin: 0.5em 0em;" bind:value={wallet} type="text" size="64" placeholder="wallet address" />
  <input type="submit" value="List!" />

  <div style="margin-top: 0.5em; font-size: smaller;">
    <input type="checkbox" bind:checked={hideZeroAccounts} /> hide 0 amount accounts
  </div>  
</form>

{#await tokenAccountListPromise}
  loading...
{:then tokenAccountList}

<h4>decimals > 0</h4>
<table style="border-spacing: 0; font-size: smaller;">
  <thead>
    <th>address</th>
    <th>isATA</th>
    <th>mint</th>
    <th>amount</th>
  </thead>
  <tbody>
  {#each tokenAccountList.filter((a) => a.decimals > 0 && (!hideZeroAccounts || !a.amount.isZero())) as account}
  <tr>
    <td><Pubkey short type="token/account" address={account.address} /></td>
    <td>{account.isATA} {#if !account.isATA}🚨{/if}</td>
    <td><Pubkey short type="token/mint" address={account.mint} /></td>
    <td>{account.uiAmount}</td>
  </tr>
  {/each}
  </tbody>
</table>

<h4>decimals = 0</h4>
<table style="border-spacing: 0; font-size: smaller;">
  <thead>
    <th>address</th>
    <th>isATA</th>
    <th>mint</th>
    <th>amount</th>
    <th>whirlpool position</th>
  </thead>
  <tbody>
  {#each tokenAccountList.filter((a) => a.decimals === 0 && (!hideZeroAccounts || !a.amount.isZero())) as account}
  <tr>
    <td><Pubkey short type="token/account" address={account.address} /></td>
    <td>{account.isATA} {#if !account.isATA}🚨{/if}</td>
    <td><Pubkey short type="token/mint" address={account.mint} /></td>
    <td>{account.uiAmount} {#if account.amount.gtn(1)}🤔{/if}</td>
    <td>
      {#if account.extension.whirlpool?.position}
      <Pubkey short type="whirlpool/position" address={account.extension.whirlpool.position} />
      {/if}
    </td>
  </tr>
  {/each}
  </tbody>
</table>

{:catch error}
  {error.message}
{/await}

<style>
  th {
    min-width: 50px;
    padding-right: 10px;
  }
</style>