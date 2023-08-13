<script lang="ts">
  import { PublicKey } from "@solana/web3.js";
  import InputPubkey from "./InputPubkey.svelte";
  import { MintInfo } from "../libs/token";
  import { createRewrittenMintAuthorityJSON } from "../libs/labo/token";
  import { createBlobFromObject, downloadFileAs } from "../libs/fileutils";
  import DownloadJsonButton from "./DownloadJSONButton.svelte";

  export let mintInfo: MintInfo;

  let newMintAuthority: PublicKey | undefined;

  $: disabled = !newMintAuthority

  async function download() {
    const account = createRewrittenMintAuthorityJSON(mintInfo, newMintAuthority);
    const filename = `${account.pubkey}.json`;
    downloadFileAs(createBlobFromObject(account), filename);
  }
</script>

<div>
  <table style="border-spacing: 0;">
    <tr><th>newMintAuthority</th><td><InputPubkey bind:value={newMintAuthority} /></td></tr>
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