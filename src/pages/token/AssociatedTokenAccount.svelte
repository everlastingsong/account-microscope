<script lang="ts">
  import { utils, translateAddress } from "@project-serum/anchor";

  import { getTokenList, TokenInfo } from "../../libs/orcaapi";
  import Pubkey from "../../components/Pubkey.svelte";

  const NUM_ATAS = 10;
  const WELL_KNOWN_TOKENS = [
    "So11111111111111111111111111111111111111112",  // WSOL
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
    "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", // USDT
    "orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE",  // ORCA
    "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",  // mSOL
    "MNDEFzGvMt87ueuHvVU9VcTqsAP5b3fTGPsHuuPA5ey",  // MNDE
    "7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj", // stSOL
    "SLNDpmoWTVADgEdndyvWzroNL7zSi1dF9PC3xHGtPwp",  // SLND
    "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU", // SAMO
    "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", // BONK
    "USDH1SM1ojwWUga67PGrgFWUHibbjqMvuMaDkRJTgkX",  // USDH
    "SHDWyBxihqiCj6YekG2GUr7wqKLeLAMK1gHZck9pL6y",  // SHDW
    "DUSTawucrTsGU8hcqRdHDCbuYhCPADMLM2VcCb8VnFnQ", // DUST
  ];

  let wallet;
  let selected = [
    ...WELL_KNOWN_TOKENS.slice(0, 8),  // top 8
    ...new Array(NUM_ATAS).fill(undefined)
  ].slice(0, NUM_ATAS);

  $: atas = new Array(NUM_ATAS).fill(undefined);

  $: tokenListPromise = (async () => {
    const tokens = await getTokenList();
    const tokenList = tokens.tokenList.slice();

    // WELL_KNOWN_TOKENS + ordered by symbol
    const orderedMints = [...WELL_KNOWN_TOKENS, ...tokenList.map((t) => t.mint.toBase58())];
    tokenList.sort((a, b) => {
      const aOrder = orderedMints.indexOf(a.mint.toBase58());
      const bOrder = orderedMints.indexOf(b.mint.toBase58());
      return aOrder - bOrder;
    });

    return tokenList;
  })();

  async function onSubmit() {
    atas = new Array(NUM_ATAS).fill(undefined); // to reset Pubkey component
    for (let i=0; i<NUM_ATAS; i++) {
      try {
        atas[i] = await utils.token.associatedAddress({
          mint: translateAddress(selected[i]),
          owner: translateAddress(wallet),
        });
      } catch (e) { /* nop */}
    }
  }
</script>

<h2>🪙Token::deriveATA</h2>
{#await tokenListPromise}
  loading...
{:then tokenList}

<form on:submit|preventDefault={onSubmit} style="margin-bottom: 1em;">
  <input style="margin: 0.5em 0em;" bind:value={wallet} type="text" size="64" placeholder="wallet address" />
  <input type="submit" value="Derive ATA!" />

  {#each atas as ata, i}
  <div class="ata">

    <select bind:value={selected[i]}>
      <option value=""></option>
      {#each tokenList.filter((t) => !t.poolToken) as token}
        <option value="{token.mint.toBase58()}">
          {token.symbol} ({token.name})
        </option>
      {/each}
    </select>

    {#if ata !== undefined}
    <Pubkey type="token/account" address={ata} />
    {/if}

  </div>
  {/each}
</form>

{/await}

<style>
  a {
    color: #39f;
    text-decoration: none;
  }

  div.ata {
    margin-top: 1em;
  }
</style>