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
  { id: "helius", name: "Mainnet HELIUS", network: "mainnet", url: "https://rpc-proxy.yugure-crypto.workers.dev" },
  { id: "everstake", name: "Mainnet Everstake", network: "mainnet", url: "https://solana-mainnet.rpc.extrnode.com" },
  { id: "anker", name: "Mainnet Anker", network: "mainnet", url: "https://rpc.ankr.com/solana" },
  { id: "solana", name: "Mainnet Solana", network: "mainnet", url: "https://api.mainnet-beta.solana.com" },
  // { id: "serum", name: "Mainnet Serum", network: "mainnet", url: "https://solana-api.projectserum.com" },
  { id: "devnet", name: "Devnet Solana", network: "devnet", url: "https://api.devnet.solana.com" },
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
