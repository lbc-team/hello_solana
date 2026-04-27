const { Connection } = require("@solana/web3.js");

const originalGetLatestBlockhash = Connection.prototype.getLatestBlockhash;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let lastSurfpoolBlockhash;

async function rpc(method, params = []) {
  if (typeof fetch !== "function") {
    return undefined;
  }

  const response = await fetch("http://127.0.0.1:8899", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });

  return response.json();
}

async function clearSurfpoolAccount(pubkey) {
  const account = {
    lamports: 0,
    data: [],
    owner: "11111111111111111111111111111111",
    executable: false,
    rentEpoch: 0,
  };

  const result = await rpc("surfnet_setAccount", [pubkey, account]);
  if (result && result.error && result.error.code !== -32601) {
    throw new Error(`surfnet_setAccount failed for ${pubkey}: ${result.error.message}`);
  }
}

Connection.prototype.getLatestBlockhash = async function getLatestBlockhashForSurfpool(...args) {
  const endpoint = this.rpcEndpoint || "";
  const isLocalSurfpool =
    endpoint.includes("127.0.0.1:8899") || endpoint.includes("localhost:8899");

  if (!isLocalSurfpool) {
    return originalGetLatestBlockhash.apply(this, args);
  }

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const latest = await originalGetLatestBlockhash.apply(this, args);
    if (latest.blockhash !== lastSurfpoolBlockhash) {
      lastSurfpoolBlockhash = latest.blockhash;
      return latest;
    }
    await sleep(50);
  }

  return originalGetLatestBlockhash.apply(this, args);
};

exports.mochaHooks = {
  async beforeAll() {
    await clearSurfpoolAccount("9kGqcfGoHhDBibBE82qr68P4fvP5bMnNm1w5mUHJSH1Q");
  },
};
