<script lang="ts">
  import { WhirlpoolCloneConfig, cloneWhirlpool } from "../libs/labo/whirlpool";
  import { WhirlpoolInfo } from "../libs/whirlpool";
  import DownloadJsonButton from "./DownloadJSONButton.svelte";
  import InputCheckBox from "./InputCheckBox.svelte";

  export let whirlpoolInfo: WhirlpoolInfo;

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
    //const filename = `config.json`;
    //downloadFileAs(createBlobFromObject(config), filename);
  }
</script>

<div>
  <table style="border-spacing: 0;">
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