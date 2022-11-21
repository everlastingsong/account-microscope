import { Connection } from "@solana/web3.js";

let _connection: Connection;

export function setRPC(rpc: string) {
  _connection = new Connection(rpc, "confirmed");
}

export function getConnection(): Connection {
  return _connection;
}
