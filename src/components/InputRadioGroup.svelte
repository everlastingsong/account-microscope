<script lang="ts">
  export let group: string;
  export let values: string[];
  export let selected: number | undefined = undefined;
  export let direction: "row" | "column" = "row";
</script>

<div style={`display: flex; flex-direction: ${direction}; gap: 5px;`}>
{#each values as value, i}
  <label>
    <input type="radio" name={group} bind:group={selected} value={i}/>
    {value}
  </label>
{/each}
</div>
