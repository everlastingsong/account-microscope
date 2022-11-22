<script lang="ts">
  import { getRPCList, RPC, setRPC } from "../libs/client";
  import { replace, location } from "svelte-spa-router";

  const rpclist = getRPCList();
  const rpcmap = new Map<string, RPC>();
  rpclist.forEach((rpc) => rpcmap.set(rpc.id, rpc));
  setRPC(rpclist[0].url);

  let selected;
  function onChange() {
    let rpcurl = "";
    if ( selected === "custom" ) {
      rpcurl = window.prompt("Input your RPC Server");
    }
    else {
      const rpc = rpcmap.get(selected)
      console.log(rpc);
      rpcurl = rpc.url;
    }
    setRPC(rpcurl);
    replace($location);
  }
</script>

<div>
  <div>
    <select bind:value={selected} on:change={onChange}>
      {#each rpclist as rpc}
      <option value="{rpc.id}">{rpc.name} ({rpc.url})</option>        
      {/each}
      <option value="custom">Custom</option>
    </select>
    <div>
      <!--
    {#if selected == "custom"}
    <input type="text" placeholder="http://localhost:8899" />
    {/if}
    -->
    </div>
  </div>
</div>