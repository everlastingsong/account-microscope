<script lang="ts">
  import MetaData from "../components/MetaData.svelte";
  import ParsedData from "../components/ParsedData.svelte";
  import DerivedData from "../components/DerivedData.svelte";
  import ParsedAndDerivedData from "../components/ParsedAndDerivedData.svelte";
  import Data from "../components/Data.svelte";
  import Pubkey from "../components/Pubkey.svelte";
  import { PublicKey } from "@solana/web3.js";
  import { translateAddress } from "@coral-xyz/anchor";
  import { getGenericAccountInfo } from "../libs/generic";
  import BN from "bn.js";
  import moment from "moment";

  export let params;

  let account = params.pubkey ?? "";

  let genericAccountInfoPromise = isValidAddress()
    ? getGenericAccountInfoWithData(account)
    : new Promise<undefined>((resolve) => resolve(undefined));

  async function onSubmit() {
    if (!isValidAddress()) return;
    genericAccountInfoPromise = getGenericAccountInfoWithData(account);
  }

  function isValidAddress() {
    try {
      translateAddress(account);
      return true;
    } catch (e) {
      return false;
    }
  }

  async function getGenericAccountInfoWithData(pubkey: string) {
    const genericAccountInfo = await getGenericAccountInfo(pubkey);
    return {
      ...genericAccountInfo,
      data: genericAccountInfo.meta.data.slice(0, 1024*10), // max 10KB
    };
  }

  let hover: number | undefined = undefined;

  let littleEndian: boolean = true;
  let offset: number | undefined = undefined;
  function setOffset(o: number) {
    offset = o;
  }

  function getClass(offset: number, o: number) {
    if (o < offset ) return "none byte";
    if (o === offset) return "selected byte";
    if (o < offset + 8) return "within8 byte";
    if (o < offset + 16) return "within16 byte";
    if (o < offset + 32) return "within32 byte";
    return "none byte";
  }

  function toHexFragment(data: Buffer): string {
    const hexString = data.toString("hex");

    // ["XX", "XX", "XX", "XX"] <= "XXXXXXXX"
    const hexStringArray = hexString.match(/.{1,2}/g) ?? [];

    return hexStringArray.join(" ");
  }

  function toAsciiString(data: Buffer): string {
    const asciiString: string[] = [];
    data.forEach((d) => {
      asciiString.push((d < 32 || d > 126)
        ? "." // non-printable characters
        : String.fromCharCode(d)
      );
    });
    return asciiString.join("");
  }

  function asU8(data: Buffer, offset: number, _littleEndian: boolean = true): string {
    if (offset === undefined) return undefined;
    if (offset + 1 > data.length) return undefined;
    return data.readUInt8(offset).toString();
  }

  function asI8(data: Buffer, offset: number, _littleEndian: boolean = true): string {
    if (offset === undefined) return undefined;
    if (offset + 1 > data.length) return undefined;
    return data.readInt8(offset).toString();
  }

  function asU16(data: Buffer, offset: number, littleEndian: boolean = true): string {
    if (offset === undefined) return undefined;
    if (offset + 2 > data.length) return undefined;
    return littleEndian
      ? data.readUInt16LE(offset).toString()
      : data.readUInt16BE(offset).toString();
  }

  function asI16(data: Buffer, offset: number, littleEndian: boolean = true): string {
    if (offset === undefined) return undefined;
    if (offset + 2 > data.length) return undefined;
    return littleEndian
      ? data.readInt16LE(offset).toString()
      : data.readInt16BE(offset).toString();
  }

  function asU32(data: Buffer, offset: number, littleEndian: boolean = true): string {
    if (offset === undefined) return undefined;
    if (offset + 4 > data.length) return undefined;
    return littleEndian
      ? data.readUInt32LE(offset).toString()
      : data.readUInt32BE(offset).toString();
  }

  function asI32(data: Buffer, offset: number, littleEndian: boolean = true): string {
    if (offset === undefined) return undefined;
    if (offset + 4 > data.length) return undefined;
    return littleEndian
      ? data.readInt32LE(offset).toString()
      : data.readInt32BE(offset).toString();
  }

  function asU64(data: Buffer, offset: number, littleEndian: boolean = true): string {
    if (offset === undefined) return undefined;
    if (offset + 8 > data.length) return undefined;
    return littleEndian
      ? data.readBigUInt64LE(offset).toString()
      : data.readBigUInt64BE(offset).toString();
  }

  function asI64(data: Buffer, offset: number, littleEndian: boolean = true): string {
    if (offset === undefined) return undefined;
    if (offset + 8 > data.length) return undefined;
    return littleEndian
      ? data.readBigInt64LE(offset).toString()
      : data.readBigInt64BE(offset).toString();
  }

  function asU128(data: Buffer, offset: number, littleEndian: boolean = true): string {
    if (offset === undefined) return undefined;
    if (offset + 16 > data.length) return undefined;
    const high = littleEndian ? data.readBigUInt64LE(offset + 8) : data.readBigUInt64BE(offset);
    const low = littleEndian ? data.readBigUInt64LE(offset) : data.readBigUInt64BE(offset + 8);
    return new BN(low.toString()).add(new BN(high.toString()).shln(64)).toString();
  }

  function asDatetime(data: Buffer, offset: number, littleEndian: boolean = true): string {
    if (offset === undefined) return undefined;
    if (offset + 8 > data.length) return undefined;
    const seconds = littleEndian
      ? data.readBigInt64LE(offset)
      : data.readBigInt64BE(offset);

    if (seconds < 0) return undefined;
    if (seconds >  253402300799) return undefined; // 9999-12-31T23:59:59

    try {
      const m = moment.unix(Number.parseInt(seconds.toString()));
      return m.format("YYYY/MM/DD HH:mm:ss UTCZZ");
    } catch {
      return undefined;
    }
  }

  function asString(data: Buffer, offset: number, _littleEndian: boolean = true): string {
    if (offset === undefined) return undefined;
    if (offset + 1 > data.length) return undefined;
    const length = data.readUInt8(offset);
    return toAsciiString(data.slice(offset, offset+32));
  }

  function asPubkey(data: Buffer, offset: number, _littleEndian: boolean = true): PublicKey {
    if (offset === undefined) return undefined;
    if (offset + 32 > data.length) return undefined;
    
    try {
      return new PublicKey(data.slice(offset, offset+32));
    } catch {
      return undefined;
    }
  }
</script>

<h2>🪣HexDump</h2>
<form on:submit|preventDefault={onSubmit} style="margin-bottom: 1em;">
  <input style="margin: 0.5em 0em;" bind:value={account} type="text" size="64" placeholder="account address" />
  <input type="submit" value="Dump!" />
</form>

{#await genericAccountInfoPromise}
  loading...
  {account}
{:then genericAccountInfo}
<MetaData accountType="generic" meta={genericAccountInfo.meta} />

<div style="font-size: smaller; display: flex; flex-direction: row; column-gap: 12px; font-family: Consolas, ui-monospace, SFMono-Regular, Menlo, Monaco, 'Liberation Mono', 'Courier New', monospace;">

  <div style="display: flex; flex-direction: column; row-gap: 2px;">
    {#each new Array(Math.ceil(genericAccountInfo.data.length / 16)) as _, i}
    <div>{(16*i).toString(16).padStart(4, "0")}:</div>
    {/each}
  </div>

  <div style="display: flex; flex-direction: column; row-gap: 0px;">
    {#each new Array(Math.ceil(genericAccountInfo.data.length / 16)) as _, i}
    <div style="display: flex; flex-direction: row; column-gap: 12px;">
      {#each new Array(4) as _, j}
        <div style="display: flex; flex-direction: row; column-gap: 5px;">
        {#each new Array(4) as _, k}
          <div
            class={getClass(offset, 16*i+4*j+k)}
            on:click={() => setOffset(16*i+4*j+k)}
            on:mouseenter={() => {hover = 16*i+4*j+k}}
            on:mouseleave={() => {}}
          >{genericAccountInfo.data.toString("hex", 16*i+4*j+k, 16*i+4*j+k+1)}</div>
        {/each}
        </div>
      {/each}
    </div>
    {/each}
  </div>

  <div style="display: flex; flex-direction: column; row-gap: 2px;">
    {#each new Array(Math.ceil(genericAccountInfo.data.length / 16)) as _, i}
    <div>{toAsciiString(genericAccountInfo.data.slice((16*i), (16*i+16)))}</div>
    {/each}
  </div>

  <div>
  <div style="border-left: 5px solid black; position: fixed; padding: 2px 0px;">
    <table style="border-spacing: 0;">
      <thead><th>cursor</th><td>{hover ?? ""}</td></thead>
      <thead><th>selected</th><td>{offset}</td></thead>
      <thead><th>&nbsp;</th><td></td></thead>
      <thead><th>type</th><th>value</th></thead>
      <tbody>
      <tr><td>pubkey</td><td>
        {#if !asPubkey(genericAccountInfo.data, offset, littleEndian)}
          undefined
        {:else}
          <Pubkey address={asPubkey(genericAccountInfo.data, offset, littleEndian)} />
        {/if}
      </td></tr>
      <tr><td>u8</td><td>{asU8(genericAccountInfo.data, offset, littleEndian)}</td></tr>
      <tr><td>i8</td><td>{asI8(genericAccountInfo.data, offset, littleEndian)}</td></tr>
      <tr><td>u16</td><td>{asU16(genericAccountInfo.data, offset, littleEndian)}</td></tr>
      <tr><td>i16</td><td>{asI16(genericAccountInfo.data, offset, littleEndian)}</td></tr>
      <tr><td>u32</td><td>{asU32(genericAccountInfo.data, offset, littleEndian)}</td></tr>
      <tr><td>i32</td><td>{asI32(genericAccountInfo.data, offset, littleEndian)}</td></tr>
      <tr><td>u64</td><td>{asU64(genericAccountInfo.data, offset, littleEndian)}</td></tr>
      <tr><td>i64</td><td>{asI64(genericAccountInfo.data, offset, littleEndian)}</td></tr>
      <tr><td>u128</td><td>{asU128(genericAccountInfo.data, offset, littleEndian)}</td></tr>
      <tr><td>datetime</td><td>{asDatetime(genericAccountInfo.data, offset, littleEndian)}</td></tr>
      <tr><td>string</td><td>{asString(genericAccountInfo.data, offset, littleEndian)}</td></tr>
      <tr><td colspan="2"><div style="display: flex; flex-direction: row; align-items: center"><input type="checkbox" bind:checked={littleEndian} style="background-color: green;" /> LittleEndian</div></td></tr>
      </tbody>
    </table>  
  </div>
  </div>

</div>


{/await}

<style>
th, td {
  padding: 0.1em 0.5em;
  white-space: nowrap;
}

div.byte { border: 1px solid white; }
div.byte:hover { border: 1px solid black; }
div.none {  }
div.selected { background-color: #f86368; }
div.within8 { background-color: #ffabaf; }
div.within16 { background-color: #f2d675; }
div.within32 { background-color: #c3c4c7; }
</style>