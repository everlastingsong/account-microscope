import { PublicKey, AccountInfo } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Address } from "@coral-xyz/anchor";
import { ORCA_WHIRLPOOL_PROGRAM_ID } from "@orca-so/whirlpools-sdk";
import { AddressUtil } from "@orca-so/common-sdk";
import { getConnection } from "./client";
import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { isDynamicTickArray } from "./whirlpool";

export type ResolvedAccount = {
  pubkey: PublicKey,
  path: string,
}

export async function resolveAccountType(addr: Address): Promise<ResolvedAccount> {
  const pubkey = AddressUtil.toPubKey(addr);
  const connection = getConnection();
  const accountInfo = await connection.getAccountInfo(pubkey);

  if (accountInfo.owner.equals(ORCA_WHIRLPOOL_PROGRAM_ID)) {
    if (isDynamicTickArray(accountInfo)) {
      return { pubkey, path: "/whirlpool/tickarray" };
    }
    switch (accountInfo.data.length) {
      case 9988: return { pubkey, path: "/whirlpool/tickarray" };
      case 653: return { pubkey, path: "/whirlpool/whirlpool" };
      case 616: return { pubkey, path: "/whirlpool/configextension" };
      case 256: return { pubkey, path: "/whirlpool/adaptivefeetier" };
      case 254: return { pubkey, path: "/whirlpool/oracle" };
      case 241: return { pubkey, path: "/whirlpool/lockconfig" };
      case 216: return { pubkey, path: "/whirlpool/position" };
      case 200: return { pubkey, path: "/whirlpool/tokenbadge" };
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

  if (accountInfo.owner.equals(TOKEN_2022_PROGRAM_ID)) {
    switch (accountInfo.data.length) {
      case 165: return { pubkey, path: "/token2022/account" };
      case 82: return { pubkey, path: "/token2022/mint" };
      default:
        // https://github.com/solana-labs/solana-program-library/blob/master/token/js/src/extensions/accountType.ts
        if (accountInfo.data.length >= 166) {
          if (accountInfo.data[165] === 1) {
            return { pubkey, path: "/token2022/mint" };
          }
          if (accountInfo.data[165] === 2) {
            return { pubkey, path: "/token2022/account" };
          }
        }
    }
  }

  return { pubkey, path: "/generic" };
}