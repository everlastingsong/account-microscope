<script lang="ts">
  export let name: string;
  export let type: string = "";
  export let offset: string = undefined;
</script>

<dt><b>{name}</b> <sub style="color: #666;">{type}{#if offset !== undefined}@{offset}{/if}</sub></dt><dd><slot></slot></dd>
