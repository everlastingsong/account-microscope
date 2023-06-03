<script lang="ts">
  import Data from "./Data.svelte";
  import Pubkey from "./Pubkey.svelte";
  import { AccountMetaInfo } from "../libs/account";
  import { lamports2sol } from "../libs/utils";

  export let meta: AccountMetaInfo;
  export let accountType: string;
</script>

<h3>🔖 Meta</h3>
<dl style="font-size: smaller">
  <Data name="pubkey" type="PublicKey"><Pubkey type={accountType} address={meta.pubkey} /></Data>
  <Data name="owner program" type="PublicKey"><Pubkey address={meta.owner} /></Data>
  <Data name="lamports" type="u64">{meta.lamports} ({lamports2sol(meta.lamports)} SOL)</Data>
  <Data name="data size">{meta.data.length}</Data>
</dl>
