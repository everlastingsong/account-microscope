<script lang="ts">
  import { PublicKey } from "@solana/web3.js";
  import BN from "bn.js";
  import InputTokenAmount from "./InputTokenAmount.svelte";
  import InputPubkey from "./InputPubkey.svelte";
  import { MintInfo } from "../libs/token";
  import { createATAJSON } from "../libs/labo/token";
  import { createBlobFromObject, downloadFileAs } from "../libs/fileutils";
  import DownloadJsonButton from "./DownloadJSONButton.svelte";

  export let mintInfo: MintInfo;

  let owner: PublicKey | undefined;
  let amount: BN | undefined;

  $: disabled = !owner || !amount;

  async function download() {
    const account = await createATAJSON(mintInfo.meta.pubkey, owner, amount);
    const filename = `${account.pubkey}.json`;
    downloadFileAs(createBlobFromObject(account), filename);
  }
</script>

<div>
  <table style="border-spacing: 0;">
    <tr><th>owner</th><td><InputPubkey bind:value={owner} /></td></tr>
    <tr><th>amount</th><td><InputTokenAmount bind:value={amount} decimals={mintInfo.parsed.decimals} /></td></tr>
    <tr><td colspan="2"><DownloadJsonButton {disabled} {download} /></td></tr>
  </table>
</div>

<style>
  td, th {
    padding-top: 5px;
    padding-bottom: 5px;
  }

  th {
    padding-right: 10px;
  }
</style>