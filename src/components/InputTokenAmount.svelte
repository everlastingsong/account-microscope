<script lang="ts">
  import BN from "bn.js";
  import { isValidTokenAmount, parseStringToTokenAmount } from "../libs/utils";

  export let value: BN | undefined;
  export let decimals: number;

  export let placeholder: string = "token amount";
  export let size: number = 32;

  let amountString: string = "";

  function handleInput(event: any) {
    const input = event.target as HTMLInputElement;
    if (!isValidTokenAmount(input.value, decimals)) {
      // revert
      input.value = amountString;
    } else {
      amountString = input.value;
      value = !["", "."].includes(amountString) ? parseStringToTokenAmount(amountString, decimals) : undefined;
    }
  }
</script>

<div style="display: flex; flex-direction: row;">
<input
  type="text"
  {placeholder}
  {size}
  value={amountString}
  on:input|preventDefault={handleInput}
/>
<span style={`margin-left: 5px; visibility: ${!!value ? "visible" : "hidden"};`}>🙆</span>
</div>
