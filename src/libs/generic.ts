import { Address } from "@project-serum/anchor";
import { AddressUtil } from "@orca-so/common-sdk";
import { AccountMetaInfo, toMeta } from "./account";
import { getConnection } from "./client";

type GenericAccountDerivedInfo = {}

type GenericAccountInfo = {
  meta: AccountMetaInfo,
  parsed: {},
  derived: GenericAccountDerivedInfo,
}

export async function getGenericAccountInfo(addr: Address): Promise<GenericAccountInfo> {
  const pubkey = AddressUtil.toPubKey(addr);
  const connection = getConnection();

  const accountInfo = await connection.getAccountInfo(pubkey);

  return {
    meta: toMeta(pubkey, accountInfo),
    parsed: {},
    derived: {}
  };
}
