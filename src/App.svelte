<script lang="ts">
  import { routes } from "./router";
  import Router from "svelte-spa-router";
  import { push, replace } from "svelte-spa-router";
  import RpcSelector from "./components/RpcSelector.svelte"
  import { resolveAccountType, ResolvedAccount } from "./libs/resolver";

  let pubkey: string;

  // INIT RPC
  import { setRPC } from "./libs/client";
  setRPC("https://api.mainnet-beta.solana.com");


  function onSubmit() {
    console.log(pubkey);
    resolveAccountType(pubkey).then(onResolved);
  }

  function onResolved(resolved: ResolvedAccount) {
    const url = `${resolved.path}/${resolved.pubkey}`;
    console.log(url);
    push(url);
  }

</script>

<main>
  <!--div style="text-align: right;">
  <RpcSelector />
  </div-->

  <h1 style="margin: 0em;">🔬Account microscope</h1>
  <div></div>
  <form on:submit|preventDefault={onSubmit}>
  	<input style="margin: 0.5em 0em;" bind:value={pubkey} type="text" size="64" placeholder="HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ" />
    <input type="submit" value="Check!" />
  </form>
  <hr />
  <Router {routes} />
</main>

<style>
	main {
		text-align: left;
		padding: 0.2em 0.2em;
		max-width: 240px;
		margin: 0 auto;
	}

  @media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>