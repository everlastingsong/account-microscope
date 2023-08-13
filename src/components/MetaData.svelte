<script lang="ts">
  import Data from "./Data.svelte";
  import Pubkey from "./Pubkey.svelte";
  import { AccountMetaInfo, toAccountJSON } from "../libs/account";
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
  <Data name="lamports" type="u64">{meta.lamports} ({lamports2sol(meta.lamports)} SOL)</Data>
  <Data name="data size">{meta.data.length}</Data>
</dl>
<DownloadJsonButton {download} />
