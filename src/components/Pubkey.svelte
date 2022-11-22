<script lang="ts">
  import { Address } from "@project-serum/anchor";

  export let address: Address;
  export let short: boolean = false;
  export let type: string = "generic";

  function getShortNotation(address: Address): string {
    const prefixSuffixLength = 5;
    const b58 = address.toString();
    return b58.substring(0, prefixSuffixLength) + "..." + b58.substring(b58.length-prefixSuffixLength);
  }

  let clipboard;
  function copy() {
    navigator.clipboard.writeText(address.toString());
    clipboard.textContent = "✅";
    setTimeout(()=>clipboard.textContent = "📎", 1000);
  }

  let path = `#/${type}/${address}`;
</script>

📘
<span on:mouseenter={() => clipboard.style.setProperty("visibility", "visible")} on:mouseleave={() => clipboard.style.setProperty("visibility", "hidden")} style="cursor: pointer;">
<a href={path}>
{#if short}
<span>{getShortNotation(address)}</span>
{:else}
<span>{address}</span>
{/if}
</a>
<span bind:this={clipboard} on:click={copy} style="visibility: hidden;">📎</span>
</span>

<style>
  a {
    color: #39f;
    text-decoration: none;
  }
</style>