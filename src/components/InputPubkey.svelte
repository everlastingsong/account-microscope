<script lang="ts">
  import { PublicKey } from "@solana/web3.js";
  import { isValidSolanaAddress } from "../libs/utils";

  export let value: PublicKey | undefined;

  export let placeholder: string = "address";
  export let size: number = 32;

  let addressString: string = "";

  function handleInput(event: any) {
    const input = event.target as HTMLInputElement;
    addressString = input.value;
    value = isValidSolanaAddress(input.value);
  }
</script>

<div style="display: flex; flex-direction: row;">
<input
  type="text"
  {placeholder}
  {size}
  value={addressString}
  on:input|preventDefault={handleInput}
/>
<span style={`margin-left: 5px; visibility: ${!!value ? "visible" : "hidden"};`}>🙆</span>
</div>
