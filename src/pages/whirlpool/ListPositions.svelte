<script lang="ts">
  import { listPoolPositions, PoolPositions, PositionStatusString, PositionInfoForList, ORDER_BY_TICK_LOWER_INDEX_ASC, ORDER_BY_TICK_UPPER_INDEX_DESC, ORDER_BY_TOKEN_A_DESC, ORDER_BY_TOKEN_B_DESC } from "../../libs/whirlpool";
  import Pubkey from "../../components/Pubkey.svelte";
  import { TokenInfo } from "../../libs/orcaapi";
  import InputRadioGroup from "../../components/InputRadioGroup.svelte";
  import Decimal from "decimal.js";

  export let params;

  let hideZeroLiquidityPositions = false;
  let hideOutOfRangePositions = false;

  enum OrderBy {
    LiquidityDesc = "liquidity (desc)",
    TickLowerIndexAsc = "tickLowerIndex (asc)",
    TickUpperIndexDesc = "tickUpperIndex (desc)",
    TokenADesc = "tokenA (desc)",
    TokenBDesc = "tokenB (desc)",
  }

  const orderByOptions = Object.values(OrderBy);
  let orderBy = orderByOptions.indexOf(OrderBy.TickLowerIndexAsc);

  enum RangeDisplayOptions {
    TickIndex = "tickIndex",
    Price = "price",
  }

  const rangeDisplayOptions = Object.values(RangeDisplayOptions);
  let rangeDisplay = rangeDisplayOptions.indexOf(RangeDisplayOptions.TickIndex);

  async function filterAndSort(
    promise: Promise<PoolPositions>,
    hideZeroLiq: boolean,
    hideOutOfRange: boolean,
    orderByComparator: (a: PositionInfoForList, b: PositionInfoForList) => number,
  ): Promise<PoolPositions> {
    const poolPositions = await promise;
    const positions = poolPositions.positions
      .filter((p) => !hideZeroLiq || !p.parsed.liquidity.isZero())
      .filter((p) => !hideOutOfRange || p.derived.status === PositionStatusString.PriceIsInRange)
      .sort(orderByComparator);
    return {
      ...poolPositions,
      positions,
    }
  }

  function getComparator(orderBy: number): (a: PositionInfoForList, b: PositionInfoForList) => number {
    switch (orderByOptions[orderBy]) {
      case OrderBy.LiquidityDesc:
        return (a, b) => b.parsed.liquidity.cmp(a.parsed.liquidity);
      case OrderBy.TickLowerIndexAsc:
        return ORDER_BY_TICK_LOWER_INDEX_ASC;
      case OrderBy.TickUpperIndexDesc:
        return ORDER_BY_TICK_UPPER_INDEX_DESC;
      case OrderBy.TokenADesc:
        return ORDER_BY_TOKEN_A_DESC;
      case OrderBy.TokenBDesc:
        return ORDER_BY_TOKEN_B_DESC;
      default:
        return (a, b) => 0;
    }
  }

  $: orgPoolPositionsPromise = listPoolPositions(params.pubkey);
  $: poolPositionsPromise = filterAndSort(orgPoolPositionsPromise, hideZeroLiquidityPositions, hideOutOfRangePositions, getComparator(orderBy));

  function symbol_if_not_undefined(tokenInfo: TokenInfo, symbolOnly: boolean = false): string {
    if (tokenInfo === undefined) return "";
    return symbolOnly ? tokenInfo.symbol : `(${tokenInfo.symbol})`;
  }

  function toPositionStatusDisplayString(status: PositionStatusString): string {
    switch (status) {
      case PositionStatusString.PriceIsAboveRange:
        return "🔺 Price is Above";
      case PositionStatusString.PriceIsBelowRange:
        return "🔻 Price is Below";
      default:
        return "🟢 In Range";
    }
  }

  function getRateString(num: number, denom: number): string {
    if (denom === 0) return "";

    const rate = new Decimal(Math.round(num / denom * 100 * 100)).div(100);
    return `${rate.toFixed(2)} %`;
  }
</script>

<h2>🌀Whirlpool::listPositions</h2>
<div style="margin-bottom: 1em; font-size: smaller;">
  <div><input type="checkbox" bind:checked={hideZeroLiquidityPositions} /> hide 0 liquidity positions</div>
  <div><input type="checkbox" bind:checked={hideOutOfRangePositions} /> hide Out of Range positions</div>
  <div style="margin-top: 0.5em; margin-left: 0.2em; display: flex; flex-direction: row;">
    <div>display with</div>
    <div>
    <InputRadioGroup
      group="rangeDisplay"
      bind:selected={rangeDisplay}
      values={rangeDisplayOptions}
    />
    </div>
  </div>
  <div style="margin-top: 0.5em; margin-left: 0.2em; display: flex; flex-direction: row;">
    <div>order by</div>
    <div>
    <InputRadioGroup
      group="orderBy"
      bind:selected={orderBy}
      values={orderByOptions}
    />
    </div>
  </div>
</div>  

{#await poolPositionsPromise}
  loading...
{:then poolPositions}

<h4>whirlpool</h4>
<div style="font-size: smaller;">
<Pubkey type="whirlpool/whirlpool" address={poolPositions.whirlpool.meta.pubkey} />
</div>

<h4>summary</h4>

<table style="border-spacing: 0; font-size: smaller;">
  <tr><td>all positions</td><td class="number">{poolPositions.positionSummary.numPositions}</td><td></td></tr>
  <tr><td>0 liquidity</td><td class="number">{poolPositions.positionSummary.numZeroLiquidityPositions}</td><td class="rate">{getRateString(poolPositions.positionSummary.numZeroLiquidityPositions, poolPositions.positionSummary.numPositions)}</td></tr>
  <tr><td>full range</td><td class="number">{poolPositions.positionSummary.numFullRangePositions}</td><td class="rate">{getRateString(poolPositions.positionSummary.numFullRangePositions, poolPositions.positionSummary.numPositions)}</td></tr>
  <tr><td>status: In Range</td><td class="number">{poolPositions.positionSummary.numStatusPriceIsInRangePositions}</td><td class="rate">{getRateString(poolPositions.positionSummary.numStatusPriceIsInRangePositions, poolPositions.positionSummary.numPositions)}</td></tr>
  <tr><td>status: Price is Above</td><td class="number">{poolPositions.positionSummary.numStatusPriceIsAboveRangePositions}</td><td class="rate">{getRateString(poolPositions.positionSummary.numStatusPriceIsAboveRangePositions, poolPositions.positionSummary.numPositions)}</td></tr>
  <tr><td>status: Price is Below</td><td class="number">{poolPositions.positionSummary.numStatusPriceIsBelowRangePositions}</td><td class="rate">{getRateString(poolPositions.positionSummary.numStatusPriceIsBelowRangePositions, poolPositions.positionSummary.numPositions)}</td></tr>
</table>

<h4>positions</h4>
<table style="border-spacing: 0; font-size: smaller;">
  <thead>
    <th>position</th>
    <th>status</th>
    <th>liquidity</th>
    <th>{rangeDisplayOptions[rangeDisplay] === RangeDisplayOptions.TickIndex ? "tickLowerIndex" : "lowerPrice"}</th>
    <th>{rangeDisplayOptions[rangeDisplay] === RangeDisplayOptions.TickIndex ? "tickUpperIndex" : "upperPrice"}</th>
    <th>tokenA{symbol_if_not_undefined(poolPositions.whirlpool.derived.tokenInfoA)}</th>
    <th>tokenB{symbol_if_not_undefined(poolPositions.whirlpool.derived.tokenInfoB)}</th>
  </thead>
  <tbody>
  {#each poolPositions.positions as position}
  <tr>
    <td><Pubkey type="whirlpool/position" address={position.meta.pubkey} /></td>
    <td>{toPositionStatusDisplayString(position.derived.status)}</td>
    <td class="number">{position.parsed.liquidity.toString()}</td>
    <td class="number">{rangeDisplayOptions[rangeDisplay] === RangeDisplayOptions.TickIndex ? position.parsed.tickLowerIndex : position.derived.priceLower}{position.derived.isFullRange ? "(full)" : ""}</td>
    <td class="number">{rangeDisplayOptions[rangeDisplay] === RangeDisplayOptions.TickIndex ? position.parsed.tickUpperIndex : position.derived.priceUpper}{position.derived.isFullRange ? "(full)" : ""}</td>
    <td class="number">{position.derived.amountA}</td>
    <td class="number">{position.derived.amountB}</td>
  </tr>
  {/each}
  </tbody>
</table>

{:catch error}
  {error.message}
{/await}

<style>
  th, td {
    padding: 0.1em 0.5em;
  }

  td.number {
    text-align: right;
  }

  td.rate {
    text-align: right;
  }

  h4 {
    margin-bottom: 0.5em;
  }
</style>