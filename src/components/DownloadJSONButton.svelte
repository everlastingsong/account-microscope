<script lang="ts">
  export let download: () => void;
  export let disabled: boolean = false;
</script>

<button {disabled} on:click={download}>Download JSON!</button>
