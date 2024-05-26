<script lang="ts">
  import { Address } from "@coral-xyz/anchor";
  import Pubkey from "./Pubkey.svelte";
  import { TokenProgram } from "../libs/whirlpool";

  export let address: Address;
  export let type: string;
  export let program: TokenProgram;
  export let short: boolean = false;
  export let length: number = 5;

  let adjustedType = type;
  if (program === "token-2022") {
    switch (adjustedType) {
      case "token/mint":
        adjustedType = "token2022/mint";
        break;
      case "token/account":
        adjustedType = "token2022/account";
        break;
      default:
        break;
    }
  }
</script>

<Pubkey {address} {short} {length} type={adjustedType} />
