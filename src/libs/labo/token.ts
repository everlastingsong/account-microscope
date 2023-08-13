import { PublicKey } from "@solana/web3.js";
import { utils } from "@coral-xyz/anchor";
import BN from "bn.js";
import { AccountJSON } from "../account";
import { MintInfo } from "../token";

const ATA_JSON_TEMPLATE = '{"account":{"data":["bSzl7WjOignQep8J48sLWXRN+yidilz09ipUuZGo1wAMjph4T4MwT0YUgNeGtHvaBFkU0iG0rHd0ApevtnFTNQEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA","base64"],"executable":false,"lamports":2039280,"owner":"TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA","rentEpoch":0},"pubkey":"GbMB98t6YfVxn3Pbu54EyUkuLqdaERLANvyghtrzSf6e"}';
export async function createATAJSON(mint: PublicKey, owner: PublicKey, amount: BN): Promise<AccountJSON> {
  const ataPubkey = await utils.token.associatedAddress({ mint, owner }); // TODO: async to sync
  const ataJson = JSON.parse(ATA_JSON_TEMPLATE);
  const ataBuffer = Buffer.from(ataJson.account.data[0], "base64");
  ataBuffer.set(mint.toBuffer(), 0);
  ataBuffer.set(owner.toBuffer(), 32);
  ataBuffer.set(amount.toArrayLike(Buffer, "le", 8), 64);

  return {
    pubkey: ataPubkey.toBase58(),
    account: {
      owner: ataJson.account.owner,
      executable: ataJson.account.executable,
      lamports: ataJson.account.lamports,
      rentEpoch: ataJson.account.rentEpoch,
      data: [ataBuffer.toString("base64"), "base64"],
    },
  };
}

export function createRewrittenMintAuthorityJSON(mintInfo: MintInfo, newMintAuthority: PublicKey): AccountJSON {
  const mintBuffer = Buffer.from(mintInfo.meta.data);

  // rewrite COption (null to non null)
  mintBuffer.set(new BN(1).toArrayLike(Buffer, "le", 4), 0);
  // rewrite mint authority
  mintBuffer.set(newMintAuthority.toBuffer(), 4);

  return {
    pubkey: mintInfo.meta.pubkey.toBase58(),
    account: {
      owner: mintInfo.meta.owner.toBase58(),
      executable: mintInfo.meta.executable,
      lamports: mintInfo.meta.lamports,
      rentEpoch: mintInfo.meta.rentEpoch ?? 0,
      data: [mintBuffer.toString("base64"), "base64"],
    },
  };
}