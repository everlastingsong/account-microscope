<script lang="ts">
  import { Address } from "@project-serum/anchor";
  import { getRPC } from "../libs/client";

  export let address: Address;
  export let short: boolean = false;
  export let type: string = "generic";

  function getShortNotation(address: Address): string {
    const prefixSuffixLength = 5;
    const b58 = address.toString();
    return b58.substring(0, prefixSuffixLength) + "..." + b58.substring(b58.length-prefixSuffixLength);
  }

  function getSolscanURL(address: Address): string {
    const solscanBaseUrl = "https://solscan.io/account";
    const rpc = getRPC();

    let querystring = "";
    if (rpc.network === "devnet") {
      querystring = "?cluster=devnet";
    }
    if (rpc.network === "localnet") {
      querystring = `?cluster=custom&customUrl=${rpc.url}`;
    }
    if (rpc.network === "custom") {
      // pass (don't include custom RPC URL, treat it as mainnet)
    }

    const url = `${solscanBaseUrl}/${address.toString()}${querystring}`;
    return url;
  }

  let toolkit;
  let clipboard;
  function copy() {
    navigator.clipboard.writeText(address.toString());
    clipboard.textContent = "✅";
    setTimeout(()=>clipboard.textContent = "📎", 1000);
  }

  let path = `#/${type}/${address}`;
</script>

📘
<span on:mouseenter={() => toolkit.style.setProperty("visibility", "visible")} on:mouseleave={() => toolkit.style.setProperty("visibility", "hidden")} style="cursor: pointer;">
<a href={path}>
{#if short}
<span>{getShortNotation(address)}</span>
{:else}
<span>{address}</span>
{/if}
</a>
<span bind:this={toolkit} style="visibility: hidden;">
  <a target="_blank" href={getSolscanURL(address)}>🔍</a>
  <span bind:this={clipboard} on:click={copy}>📎</span>
</span>
</span>

<style>
  a {
    color: #39f;
    text-decoration: none;
  }
</style>