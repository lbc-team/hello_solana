import {
    Connection,
    Keypair,
    LAMPORTS_PER_SOL,
    SystemProgram,
    Transaction,
    sendAndConfirmTransaction,
  } from "@solana/web3.js";
  import { RPC_ENDPOINT, PAYER_KEYPAIR_PATH } from "./config";
  import fs from "fs";
  
  async function main() {
    // 连接本地节点
    const connection = new Connection(RPC_ENDPOINT, "confirmed");
  

    const payer1 = Keypair.fromSecretKey(Buffer.from(JSON.parse(fs.readFileSync(PAYER_KEYPAIR_PATH, "utf8"))));
    const payer2 = Keypair.generate();
  
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  
    const balance = await connection.getBalance(payer1.publicKey);
    console.log("账户余额:", balance / LAMPORTS_PER_SOL, "SOL");
    if (balance < 10 * LAMPORTS_PER_SOL) {
      // Airdrop 一些 SOL 以便支付手续费
      const airdropSignature = await connection.requestAirdrop(
        payer1.publicKey,
        10 *LAMPORTS_PER_SOL,
      );
      await connection.confirmTransaction({
        signature: airdropSignature,
        blockhash,
        lastValidBlockHeight,
      });
      console.log("Airdrop 完成");
    }
 

    const ix = SystemProgram.transfer({
        fromPubkey: payer1.publicKey,
        toPubkey: payer2.publicKey,
        lamports: 1000000000,
    });

    const tx = new Transaction().add(ix);

    const simulation = await connection.simulateTransaction(tx, [payer1]);
    console.log("Simulation:", simulation);

    const sig = await sendAndConfirmTransaction(connection, tx, [payer1]);
    console.log("Transaction Signature", sig);
 
  }
  
  main().catch(console.error); 