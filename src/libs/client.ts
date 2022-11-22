import { Connection } from "@solana/web3.js";

let _connection: Connection;

export function setRPC(rpc: string) {
  _connection = new Connection(rpc, "confirmed");
}

export function getConnection(): Connection {
  return _connection;
}

export type RPC = {
  id: string,
  name: string,
  url: string,
}

const _rpclist: RPC[] = [
  { id: "anker", name: "Mainnet Anker", url: "https://rpc.ankr.com/solana" },
  { id: "solana", name: "Mainnet Solana", url: "https://api.mainnet-beta.solana.com" },
  { id: "serum", name: "Mainnet Serum", url: "https://solana-api.projectserum.com" },
  { id: "devnet", name: "Devnet Solana", url: "https://api.devnet.solana.com" },
  { id: "localnet", name: "Test Validator", url: "http://localhost:8899" },
];

export function getRPCList(): RPC[] {
  return _rpclist;
}
