<script lang="ts">
  export let download: () => void;
  export let disabled: boolean = false;
  export let label: string = "Download JSON!";
  export let width: number = undefined;

  $: style = width ? `width: ${width}px;` : "";
</script>

<button {disabled} on:click={download} {style}>{label}</button>
