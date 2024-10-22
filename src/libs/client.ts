import { Connection } from "@solana/web3.js";


let _connection: Connection;

export function setRPC(rpc: string) {
  _connection = new Connection(rpc, "confirmed");
}

export function getConnection(): Connection {
  return _connection;
}

export type Network = "mainnet" | "devnet" | "localnet" | "custom";
export type RPC = {
  id: string,
  name: string,
  network: Network,
  url: string,
}

const _rpclist: RPC[] = [
  { id: "public-mainnet", name: "Eclipse Mainnet Eclipse", network: "mainnet", url: "https://mainnetbeta-rpc.eclipse.xyz" },
  { id: "public-helius", name: "Eclipse Mainnet Helius", network: "mainnet", url: "https://eclipse.helius-rpc.com"},
  { id: "localnet", name: "Test Validator", network: "localnet", url: "http://localhost:8899" },
];

export function getRPCList(): RPC[] {
  return _rpclist;
}

export function getRPC(): RPC {
  for(const rpc of _rpclist) {
    if (rpc.url === _connection.rpcEndpoint) {
      return rpc;
    }
  }
  return { id: "custom", name: "custom", network: "custom", url: _connection.rpcEndpoint };
}
