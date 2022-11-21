<script lang="ts">
	let selected;
</script>

<div>
  <div>
    <select bind:value={selected}>
      <option value="solana">Mainnet Solana (https://api.mainnet-beta.solana.com)</option>
      <option value="serum">Mainnet Serum (https://solana-api.projectserum.com)</option>
      <option value="anker">Mainnet Anker (https://rpc.ankr.com/solana)</option>
      <option value="devnet">Devnet Solana (https://api.devnet.solana.com)</option>
      <option value="localnet">Test Validator (http://localhost:8899)</option>
      <option value="custom">Custom</option>
    </select>
    <div>
    {#if selected == "custom"}
    <input type="text" placeholder="http://localhost:8899" />
    {/if}
    </div>
  </div>
</div>