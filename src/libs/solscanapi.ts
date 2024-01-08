import { PublicKey } from "@solana/web3.js";
import fetch from "node-fetch";
import { DecimalUtil } from "@orca-so/common-sdk";
import Decimal from "decimal.js";
import BN from "bn.js";

const TOKEN_HOLDERS = "https://public-api.solscan.io/token/holders?limit=10&offset=0&tokenAddress=";

export type TokenHolderEntry = {
  rank: number,
  address: PublicKey,
  amount: BN,
  decimalAmount: Decimal,
  decimals: number,
  owner: PublicKey,
}

export async function getTokenHolders(mint: PublicKey): Promise<TokenHolderEntry[]> {
  try {
    const api = TOKEN_HOLDERS + mint.toBase58();
    const response = await (await fetch(api)).json();

    const list: TokenHolderEntry[] = [];
    response.data.forEach((data) => {
      const amount = new BN(data.amount);
      const decimals = Number.parseInt(data.decimals);
      const decimalAmount = DecimalUtil.fromBN(amount, decimals);
    
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
  } catch (e) {
    return [];
  }
}
