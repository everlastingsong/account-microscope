import { PublicKey } from "@solana/web3.js";
import fetch from "node-fetch";
import { u64 } from "@solana/spl-token";
import { DecimalUtil } from "@orca-so/common-sdk";
import Decimal from "decimal.js";

const TOKEN_HOLDERS = "https://public-api.solscan.io/token/holders?limit=10&offset=0&tokenAddress=";

export type TokenHolderEntry = {
  rank: number,
  address: PublicKey,
  amount: u64,
  decimalAmount: Decimal,
  decimals: number,
  owner: PublicKey,
}

export async function getTokenHolders(mint: PublicKey): Promise<TokenHolderEntry[]> {
  const api = TOKEN_HOLDERS + mint.toBase58();
  const response = await (await fetch(api)).json();

  const list: TokenHolderEntry[] = [];
  response.data.forEach((data) => {
    const amount = new u64(data.amount);
    const decimals = Number.parseInt(data.decimals);
    const decimalAmount = DecimalUtil.fromU64(amount, decimals);
  
    list.push({
      rank: Number.parseInt(data.rank),
      address: new PublicKey(data.address),
      amount,
      decimalAmount,
      decimals,
      owner: new PublicKey(data.owner),
    });
  });

  return list;
}
