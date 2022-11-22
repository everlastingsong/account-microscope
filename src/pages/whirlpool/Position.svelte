<script lang="ts">
  import MetaData from "../../components/MetaData.svelte";
  import ParsedData from "../../components/ParsedData.svelte";
  import DerivedData from "../../components/DerivedData.svelte";
  import ParsedAndDerivedData from "../../components/ParsedAndDerivedData.svelte";
  import Data from "../../components/Data.svelte";
  import Pubkey from "../../components/Pubkey.svelte";

  export let params;

  import { getPositionInfo } from "../../libs/whirlpool";
  $: positionInfoPromise = getPositionInfo(params.pubkey);
</script>

<h2>🌀Whirlpool::Position</h2>

{#await positionInfoPromise}
  loading...
  {params.pubkey}
{:then positionInfo}
<MetaData>
  <Data name="pubkey" type="PublicKey"><Pubkey type="whirlpool/position" address={positionInfo.meta.pubkey} /></Data>
  <Data name="owner program" type="PublicKey"><Pubkey address={positionInfo.meta.owner} /></Data>
  <Data name="lamports" type="u64">{positionInfo.meta.lamports}</Data>
  <Data name="data size">{positionInfo.meta.data.length}</Data>
</MetaData>

<ParsedAndDerivedData>
<ParsedData>
  <Data name="whirlpool" type="PublicKey"><Pubkey type="whirlpool/whirlpool" address={positionInfo.parsed.whirlpool} /></Data>
  <Data name="positionMint" type="PublicKey"><Pubkey type="token/mint" address={positionInfo.parsed.positionMint} /></Data>
  <Data name="liquidity" type="u128">{positionInfo.parsed.liquidity}</Data>
  <Data name="tickLowerIndex" type="i32">{positionInfo.parsed.tickLowerIndex}</Data>
  <Data name="tickUpperIndex" type="i32">{positionInfo.parsed.tickUpperIndex}</Data>
  <Data name="feeGrowthCheckpointA" type="u128">{positionInfo.parsed.feeGrowthCheckpointA}</Data>
  <Data name="feeGrowthCheckpointB" type="u128">{positionInfo.parsed.feeGrowthCheckpointB}</Data>
  <Data name="feeOwedA" type="u64">{positionInfo.parsed.feeOwedA}</Data>
  <Data name="feeOwedB" type="u64">{positionInfo.parsed.feeOwedB}</Data>
  <Data name="rewardInfos[0]">
    <Data name="amountOwed" type="u64">{positionInfo.parsed.rewardInfos[0].amountOwed}</Data>
    <Data name="growthInsideCheckpoint" type="u128">{positionInfo.parsed.rewardInfos[0].growthInsideCheckpoint}</Data>
  </Data>
  <Data name="rewardInfos[1]">
    <Data name="amountOwed" type="u64">{positionInfo.parsed.rewardInfos[1].amountOwed}</Data>
    <Data name="growthInsideCheckpoint" type="u128">{positionInfo.parsed.rewardInfos[1].growthInsideCheckpoint}</Data>
  </Data>
  <Data name="rewardInfos[2]">
    <Data name="amountOwed" type="u64">{positionInfo.parsed.rewardInfos[2].amountOwed}</Data>
    <Data name="growthInsideCheckpoint" type="u128">{positionInfo.parsed.rewardInfos[2].growthInsideCheckpoint}</Data>
  </Data>
</ParsedData>

<DerivedData>
  <Data name="lower price">{positionInfo.derived.priceLower}</Data>
  <Data name="upper price">{positionInfo.derived.priceUpper}</Data>
  <Data name="inverted lower price">{positionInfo.derived.invertedPriceLower}</Data>
  <Data name="inverted upper price">{positionInfo.derived.invertedPriceUpper}</Data>
  <Data name="token A amount">{positionInfo.derived.amountA}</Data>
  <Data name="token B amount">{positionInfo.derived.amountB}</Data>
  <Data name="fee A amount">{positionInfo.derived.feeAmountA}</Data>
  <Data name="fee B amount">{positionInfo.derived.feeAmountB}</Data>
  <Data name="reward0 amount">{positionInfo.derived.rewardAmount0}</Data>
  <Data name="reward1 amount">{positionInfo.derived.rewardAmount1}</Data>
  <Data name="reward2 amount">{positionInfo.derived.rewardAmount2}</Data>
</DerivedData>
</ParsedAndDerivedData>
{/await}

<style>
</style>