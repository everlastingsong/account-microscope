<script lang="ts">
  import AccountDefinition from "./AccountDefinition.svelte";

  export let name: string;
  export let desc: string;
  export let href: string;
</script>

<dt><b title={desc}>{name}</b> <AccountDefinition href={href} /></dt><dd style="margin-left: 0px;"><slot></slot></dd>
