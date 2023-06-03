import Decimal from "decimal.js";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

export function lamports2sol(lamports: number): Decimal {
  return new Decimal(lamports).div(LAMPORTS_PER_SOL);
}
