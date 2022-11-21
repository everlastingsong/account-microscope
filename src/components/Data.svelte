<script lang="ts">
  export let name: string;
  export let type: string = "";
</script>

<dt><b>{name}</b> <sub style="color: #666;">{type}</sub></dt><dd><slot></slot></dd>
