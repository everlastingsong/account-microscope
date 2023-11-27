<script lang="ts">
  import Data from "./Data.svelte";
  import Pubkey from "./Pubkey.svelte";
  import { AccountMetaInfo, toAccountJSON, getMinimumBalanceForRentExemption } from "../libs/account";
  import { lamports2sol } from "../libs/utils";
  import { createBlobFromObject, downloadFileAs } from "../libs/fileutils";
  import DownloadJsonButton from "./DownloadJSONButton.svelte";

  export let meta: AccountMetaInfo;
  export let accountType: string;

  function download() {
    const account = toAccountJSON(meta, true);
    const filename = `${meta.pubkey}.json`;
    downloadFileAs(createBlobFromObject(account), filename);
  }
</script>

<h3>🔖 Meta <span style="color: #999; font-size: small; font-weight: normal;">slot {meta.slotContext}</span></h3>
<dl style="font-size: smaller">
  <Data name="pubkey" type="PublicKey"><Pubkey type={accountType} address={meta.pubkey} /></Data>
  <Data name="owner program" type="PublicKey"><Pubkey address={meta.owner} /></Data>
  <Data name="lamports" type="u64">{meta.lamports} ({lamports2sol(meta.lamports)} SOL) (Rent: {getMinimumBalanceForRentExemption(meta.data.length)}, NotRent: {meta.lamports - getMinimumBalanceForRentExemption(meta.data.length)})</Data>
  <div class="col">
    <span><Data name="data size">{meta.data.length}</Data></span>
    <span><Data name="executable">{meta.executable}</Data></span>
  </div>
</dl>
<DownloadJsonButton {download} />

<style>
  .col {
    display: flex;
    flex-direction: row;
    gap: 200px;
  }
</style>