<script lang="ts">
  import { Address } from "@project-serum/anchor";
  import { push } from "svelte-spa-router";

  export let address: Address;
  export let short: boolean = false;
  export let type: string = "generic";

  function getShortNotation(address: Address): string {
    const prefixSuffixLength = 5;
    const b58 = address.toString();
    return b58.substring(0, prefixSuffixLength) + "..." + b58.substring(b58.length-prefixSuffixLength);
  }

  function onClick() {
    const path = `/${type}/${address}`;
    console.log(path);
    push(path);
  }
</script>

📘
<a on:click={onClick}>
{#if short}
<span>{getShortNotation(address)}</span>
{:else}
<span>{address}</span>
{/if}
</a>

<style>
  a {
    cursor: pointer;
    color: #39f;
  }
</style>