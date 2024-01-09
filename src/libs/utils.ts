import Decimal from "decimal.js";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { DecimalUtil, U64_MAX, Address } from "@orca-so/common-sdk";
import BN from "bn.js";
import { PublicKey } from "@solana/web3.js";

export function lamports2sol(lamports: number): Decimal {
  return new Decimal(lamports).div(LAMPORTS_PER_SOL);
}

export function u64ToDecimal(u64Amount: BN, decimals: number): Decimal {
  return DecimalUtil.fromBN(u64Amount, decimals);
}

export function decimalToU64(decimalAmount: Decimal, decimals: number): BN {
  return DecimalUtil.toBN(decimalAmount, decimals);
}

export function getShortAddressNotation(address: Address, prefixSuffixLength: number = 5): string {
  if ( !address ) return `${address}`;
  const b58 = address.toString();
  return b58.substring(0, prefixSuffixLength) + "..." + b58.substring(b58.length-prefixSuffixLength);
}

const SOLANA_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
export function isValidSolanaAddress(address: string): PublicKey | undefined {
  // quick check
  if (!SOLANA_ADDRESS_REGEX.test(address)) {
    return undefined;
  }

  try {
    return new PublicKey(address);
  } catch (e) {
    return undefined;
  }
}

const MAX_TOKEN_AMOUNT_STRING_LENGTH = 2 /* 0. */ + U64_MAX.toString().length + 5 /* margin */;

export function isValidTokenAmount(amount: string, decimals: number): boolean {
  if (amount.length > MAX_TOKEN_AMOUNT_STRING_LENGTH) {
    return false;
  }

  if (countDecimals(amount) > decimals || !isValidFloat(amount)) {
    return false;
  }

  const amountBN = parseStringToBN(amount, decimals);
  return amountBN.lte(U64_MAX);
}

export function parseStringToTokenAmount(amount: string, decimals: number): BN {
  return parseStringToBN(amount, decimals);
}

const FLOAT_REGEX = /^(\d*)?(\.)?(\d*)?$/;
function isValidFloat(amount: string) {
  return FLOAT_REGEX.test(amount);
}

function countDecimals(input: string): number {
  if (input.indexOf(".") === -1) return 0;
  return (input && input.split(".")[1].length) || 0;
}

function parseStringToBN(amount: string, decimals: number): BN {
  const matches = amount.match(FLOAT_REGEX);

  if (!matches) {
    return new BN(0);
  }

  const integers = matches[1] ? new BN(matches[1]) : new BN(0);
  const fractions = matches[3]
    ? new BN(matches[3].substring(0, decimals).padEnd(decimals, "0"))
    : new BN(0);
  const base = new BN(10).pow(new BN(decimals));
  return integers.mul(base).add(fractions);
}

export function toJsonStringWithoutTopBracket(obj: any): string | null {
  if (!obj) return null;

  const result = Object.entries(obj).map(([key, value]) => {
    return `"${key}": ${JSON.stringify(value, null, 4)}`;
  }).join(",\n");

  return result;
}