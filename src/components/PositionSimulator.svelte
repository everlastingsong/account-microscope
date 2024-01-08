<script lang="ts">
  import { PublicKey } from "@solana/web3.js";
  import { MathUtil, DecimalUtil } from "@orca-so/common-sdk";
  import { TICK_ARRAY_SIZE, PoolUtil, PriceMath } from "@orca-so/whirlpools-sdk";
  import { PositionInfo } from "../libs/whirlpool";
  import Data from "./Data.svelte";
  import Decimal from "decimal.js";

  export let positionInfo: PositionInfo;

  const FLOAT_REGEX = /^(-)?(\d*)?(\.)?(\d*)?$/;

  type SimulatedValue = {
    price: string;
    invertedPrice: string;
    withdrawableA: string;
    withdrawableB: string;
    ratioA: string;
    ratioB: string;
  };

  function generateSymbolFromMint(mint: PublicKey) {
    const mintStr = mint.toBase58();
    return mintStr.slice(0, 4) + "..." + mintStr.slice(-4);
  }

  const symbolA = positionInfo.derived.tokenInfoA?.symbol ?? generateSymbolFromMint(positionInfo.derived.tokenMintA);
  const symbolB = positionInfo.derived.tokenInfoB?.symbol ?? generateSymbolFromMint(positionInfo.derived.tokenMintB);

  const tickSpacing = positionInfo.derived.poolTickSpacing;
  const lowerIndex = positionInfo.parsed.tickLowerIndex;
  const upperIndex = positionInfo.parsed.tickUpperIndex;
  const currentSqrtPrice = MathUtil.fromX64(positionInfo.derived.currentSqrtPrice);
  const lowerSqrtPrice = new Decimal(1.0001).pow(lowerIndex).sqrt();
  const upperSqrtPrice = new Decimal(1.0001).pow(upperIndex).sqrt();
  const lowerSqrtPriceX64 = PriceMath.tickIndexToSqrtPriceX64(lowerIndex);
  const upperSqrtPriceX64 = PriceMath.tickIndexToSqrtPriceX64(upperIndex);
  const boundIndex = (n: number) => Math.min(Math.max(n, lowerIndex), upperIndex);
  
  const trueCurrentIndex = boundIndex(
    Decimal
      .log(currentSqrtPrice.pow(2), 1.0001)
      .toDecimalPlaces(3)
      .toNumber()
  );

  const range = upperIndex - lowerIndex;
  
  let virtualCurrentIndex = trueCurrentIndex;

  $: numberInputValue = virtualCurrentIndex;
  $: rangeInputValue = (virtualCurrentIndex - lowerIndex) / range * 1000;
  $: simulatedValue = simulate(virtualCurrentIndex);

  function simulate(tickIndex): SimulatedValue {
    const decimalsA = positionInfo.derived.decimalsA;
    const decimalsB = positionInfo.derived.decimalsB;

    const adjustDecimal = new Decimal(10).pow(decimalsA - decimalsB);
    const price = new Decimal("1.0001").pow(tickIndex).mul(adjustDecimal);
    const invertedPrice = new Decimal(1).div(price);

    const sqrtPrice = new Decimal(1.0001).pow(tickIndex).sqrt();
    const sqrtPriceX64 = MathUtil.toX64(sqrtPrice);
    const amount = PoolUtil.getTokenAmountsFromLiquidity(
      positionInfo.parsed.liquidity,
      sqrtPriceX64,
      lowerSqrtPriceX64,
      upperSqrtPriceX64,
      false,
    );

    const pA = new Decimal(1).sub(sqrtPrice.div(upperSqrtPrice));
    const B  = new Decimal(1).sub(lowerSqrtPrice.div(sqrtPrice));
    const ratioA = pA.div(pA.add(B)).mul(100).toFixed(2);
    const ratioB = B.div(pA.add(B)).mul(100).toFixed(2);

    return {
      price: price.toFixed(decimalsB),
      invertedPrice: invertedPrice.toFixed(decimalsA),
      withdrawableA: DecimalUtil.fromBN(amount.tokenA, decimalsA).toString(),
      withdrawableB: DecimalUtil.fromBN(amount.tokenB, decimalsB).toString(),
      ratioA,
      ratioB,
    };
  }

  function change(type: "inc" | "dec", unit: "tick" | "TS" | "TA") {
    const direction = type === "inc" ? +1 : -1;
    const amount = unit === "TA"
      ? tickSpacing * TICK_ARRAY_SIZE
      : unit === "TS"
        ? tickSpacing
        : 1;

    virtualCurrentIndex = boundIndex(virtualCurrentIndex + direction * amount);
  }

  function round() {
    virtualCurrentIndex = Math.round(virtualCurrentIndex);
  }

  function reset() {
    virtualCurrentIndex = trueCurrentIndex;
  }

  function round3(n: number) {
    return Math.round(n * 1000) / 1000;
  }

  function onRangeChange() {
    virtualCurrentIndex = boundIndex(
      round3(lowerIndex + range * rangeInputValue / 1000)
    );
  }
</script>

<Data name="virtual tick index">
<div>
  <div class="virtual-tick-index">
    <div>
      <button on:click={() => change("dec", "TA")}>- TA</button>
      <button on:click={() => change("dec", "TS")}>- TS</button>
      <button on:click={() => change("dec", "tick")}>- tick</button>
      <input type="text" disabled bind:value={numberInputValue} style="width: 100px; text-align: center;" />
      <button on:click={round}>round</button>
      <button on:click={() => change("inc", "tick")}>+ tick</button>
      <button on:click={() => change("inc", "TS")}>+ TS</button>
      <button on:click={() => change("inc", "TA")}>+ TA</button>
    </div>
    
    <div style="display: flex; flex-direction: row; align-item: center; margin-top: 1em;">
      <button on:click={reset}>reset</button>
      <input type="range" min="0" max="1000" bind:value={rangeInputValue} on:change={onRangeChange} style="margin-left: 1em; width: 100%;" />
    </div>
  </div>
</div>
</Data>
<Data name="simulated values">
  <table class="simulated" style="border-spacing: 0;">
    <tr><th>price</th><td>{simulatedValue.price} {symbolB}/{symbolA}</td></tr>
    <tr><th></th><td> {simulatedValue.invertedPrice} {symbolA}/{symbolB}</td></tr>
    <tr><th>ratio</th><td>{simulatedValue.ratioA} % {symbolA} + {simulatedValue.ratioB} % {symbolB}</td></tr>
    <tr><th>withdrawable</th><td>{simulatedValue.withdrawableA} {symbolA}</td></tr>
    <tr><th></th><td>{simulatedValue.withdrawableB} {symbolB}</td></tr>
  </table>  
</Data>

<style>
  div.virtual-tick-index {
    display: flex;
    flex-direction: column;
    flex-wrap: nowrap;
    margin: 0.5em 0em;
  }

  table.simulated td {
    padding-top: 0.5em;
  }

  table.simulated th {
    padding-top: 0.5em;
    padding-right: 1em;
  }
</style>