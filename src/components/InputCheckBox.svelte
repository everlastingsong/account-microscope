<script lang="ts">
  export let value: boolean;
  export let label: string;
</script>

<div style="display: flex; flex-direction: row;">
<input
  type="checkbox"
  bind:checked={value}
/>
<span style="margin-left: 5px;">{label}</span>
</div>
