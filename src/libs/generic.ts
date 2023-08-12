import { Address } from "@coral-xyz/anchor";
import { AddressUtil } from "@orca-so/common-sdk";
import { AccountMetaInfo, getAccountInfo, toMeta } from "./account";
import { getConnection } from "./client";

type GenericAccountDerivedInfo = {}

export type GenericAccountInfo = {
  meta: AccountMetaInfo,
  parsed: {},
  derived: GenericAccountDerivedInfo,
}

export async function getGenericAccountInfo(addr: Address): Promise<GenericAccountInfo> {
  const pubkey = AddressUtil.toPubKey(addr);
  const connection = getConnection();

  const { accountInfo, slotContext } = await getAccountInfo(connection, pubkey);

  return {
    meta: toMeta(pubkey, accountInfo, slotContext),
    parsed: {},
    derived: {}
  };
}
