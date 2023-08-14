<script lang="ts">
  import { AccountJSON } from "../libs/account";
  import { createBlobFromObject, downloadFileAs } from "../libs/fileutils";
  import { WhirlpoolCloneConfig, cloneWhirlpool } from "../libs/labo/whirlpool";
  import { WhirlpoolInfo } from "../libs/whirlpool";
  import DownloadJsonButton from "./DownloadJSONButton.svelte";
  import InputCheckBox from "./InputCheckBox.svelte";
  import JSZip from "jszip";

  export let whirlpoolInfo: WhirlpoolInfo;

  let appendFilenamePrefix: boolean = true;
  let withWhirlpoolsConfig: boolean = true;
  let withFeeTier: boolean = true;
  let withTickArray: boolean = true;
  let withVaultTokenAccount: boolean = true;
  let withMintAccount: boolean = true;
  let withPosition: boolean = false;

  async function download() {
    const config: WhirlpoolCloneConfig = {
      withWhirlpoolsConfig,
      withFeeTier,
      withTickArray,
      withVaultTokenAccount,
      withMintAccount,
      withPosition,
    };

    // TODO: try/catch
    const result = await cloneWhirlpool(whirlpoolInfo, config);
    console.log("cloneWhirlpool", result);

    const zipfile = new JSZip();
    function pack(accountJSON: AccountJSON | undefined, filenamePrefix: string) {
      if (!accountJSON) return;
      const filename = appendFilenamePrefix
        ? `${filenamePrefix}.${accountJSON.pubkey}.json`
        : `${accountJSON.pubkey}.json`;
      zipfile.file(filename, createBlobFromObject(accountJSON));
    }

    pack(result.whirlpool, "whirlpool");
    pack(result.whirlpoolsConfig, "config");
    pack(result.feeTier, "feetier");
    result.tickArrays?.forEach((ta) => pack(ta, "tickarray"));
    result.vaultTokenAccounts?.forEach((vta) => pack(vta, "vault"));
    result.mintAccounts?.forEach((ma) => pack(ma, "mint"));
    result.positions?.forEach((p) => pack(p, "position"));

    const filename = `${whirlpoolInfo.meta.pubkey.toBase58()}.${result.slotContext}.zip`;
    const zipBlob = await zipfile.generateAsync({
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: {
        level: 5, // 1(fastest) - 9(best compression)
      },
    });

    downloadFileAs(zipBlob, filename);
  }
</script>

<div>
  <table style="border-spacing: 0;">
    <tr><td><InputCheckBox bind:value={appendFilenamePrefix} label="append filename prefix" /></td></tr>
    <tr><td><InputCheckBox bind:value={withWhirlpoolsConfig} label="with WhirlpoolsConfig" /></td></tr>
    <tr><td><InputCheckBox bind:value={withFeeTier} label="with FeeTier" /></td></tr>
    <tr><td><InputCheckBox bind:value={withTickArray} label="with TickArray" /></td></tr>
    <tr><td><InputCheckBox bind:value={withVaultTokenAccount} label="with VaultTokenAccount" /></td></tr>
    <tr><td><InputCheckBox bind:value={withMintAccount} label="with MintAccount" /></td></tr>
    <tr><td><InputCheckBox bind:value={withPosition} label="with Position" /></td></tr>
    <tr><td><DownloadJsonButton {download} /></td></tr>
  </table>
</div>

<style>
  td {
    padding-top: 5px;
    padding-bottom: 5px;
  }
</style>