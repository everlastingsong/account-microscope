import { PublicKey, AccountInfo } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Address } from "@coral-xyz/anchor";
import { ORCA_WHIRLPOOL_PROGRAM_ID } from "@orca-so/whirlpools-sdk";
import { AddressUtil } from "@orca-so/common-sdk";
import { getConnection } from "./client";

const ORCA_TOKEN_SWAP_V1_ID = new PublicKey("DjVE6JNiYqPL2QXyCUUh8rNjHrbz9hXHNYt99MQ59qw1");
const ORCA_TOKEN_SWAP_V2_ID = new PublicKey("9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP");
const ORCA_TOKEN_SWAP_V2_DEVNET_ID = new PublicKey("3xQ8SWv2GaFXXpHZNqkXsdxq5DZciHBz6ZFoPPfbFd7U");
const ORCA_AQUAFARM_ID = new PublicKey("82yxjeMsvaURa4MbZZ7WZZHfobirZYkH1zF8fmeGtyaQ");

export type ResolvedAccount = {
  pubkey: PublicKey,
  path: string,
}

export async function resolveAccountType(addr: Address): Promise<ResolvedAccount> {
  const pubkey = AddressUtil.toPubKey(addr);
  const connection = getConnection();
  const accountInfo = await connection.getAccountInfo(pubkey);

  if (accountInfo.owner.equals(ORCA_WHIRLPOOL_PROGRAM_ID)) {
    switch (accountInfo.data.length) {
      case 9988: return { pubkey, path: "/whirlpool/tickarray" };
      case 653: return { pubkey, path: "/whirlpool/whirlpool" };
      case 216: return { pubkey, path: "/whirlpool/position" };
      case 136: return { pubkey, path: "/whirlpool/positionbundle" };
      case 108: return { pubkey, path: "/whirlpool/config" };
      case 44: return { pubkey, path: "/whirlpool/feetier" };
    }
  }

  if (accountInfo.owner.equals(TOKEN_PROGRAM_ID)) {
    switch (accountInfo.data.length) {
      case 165: return { pubkey, path: "/token/account" };
      case 82: return { pubkey, path: "/token/mint" };
    }
  }

  if (
    accountInfo.owner.equals(ORCA_TOKEN_SWAP_V1_ID) ||
    accountInfo.owner.equals(ORCA_TOKEN_SWAP_V2_ID) ||
    accountInfo.owner.equals(ORCA_TOKEN_SWAP_V2_DEVNET_ID)
  ) {
    switch (accountInfo.data.length) {
      case 324: return { pubkey, path: "/tokenswap/swapstate" };
    }
  }

  if (accountInfo.owner.equals(ORCA_AQUAFARM_ID)) {
    switch (accountInfo.data.length){
      case 283: return { pubkey, path: "/aquafarm/globalfarm" };
      case 106: return { pubkey, path: "/aquafarm/userfarm" };
    }
  }

  return { pubkey, path: "/generic" };
}