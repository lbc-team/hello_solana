import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  SystemProgram,
  PublicKey,
} from "@solana/web3.js";
import { Program, BN, AnchorProvider } from "@coral-xyz/anchor";
import idl from "./idl/favorites.json";
import { RPC_ENDPOINT, PAYER_KEYPAIR_PATH } from "./config";
import { Favorites } from "./types/favorites";
import fs from "fs";

async function main() {
  // 连接本地节点
  const connection = new Connection(RPC_ENDPOINT, "confirmed");

  // 生成钱包
  // const payer = Keypair.generate();
  const payer = Keypair.fromSecretKey(Buffer.from(JSON.parse(fs.readFileSync(PAYER_KEYPAIR_PATH, "utf8"))));

  // 从 Keypair 创建 AnchorWallet 
  const createAnchorWallet = (keypair: Keypair) => ({
    publicKey: keypair.publicKey,
    signTransaction: async (tx: any) => {
      tx.partialSign(keypair);
      return tx;
    },
    signAllTransactions: async (txs: any[]) => {
      txs.forEach(tx => tx.partialSign(keypair));
      return txs;
    },
    payer: keypair,
  });

  const wallet = createAnchorWallet(payer);

  // 创建 Provider
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });


  // 创建 Program 实例 - 类型安全
  const program = new Program<Favorites>(idl as Favorites, provider);

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

  const balance = await connection.getBalance(payer.publicKey);
  console.log("账户余额:", balance / LAMPORTS_PER_SOL, "SOL");
  if (balance < 10 * LAMPORTS_PER_SOL) {
    // Airdrop 一些 SOL 以便支付手续费
    const airdropSignature = await connection.requestAirdrop(
      payer.publicKey,
      10 *LAMPORTS_PER_SOL,
    );
    await connection.confirmTransaction({
      signature: airdropSignature,
      blockhash,
      lastValidBlockHeight,
    });
    console.log("Airdrop 完成");
  }

  // 计算 PDA
  const [favoritesPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("favorites"), payer.publicKey.toBuffer()],
    program.programId
  );

  // 构建 setFavorites 指令 - 使用 accountsPartial 避免类型检查问题
  const tx = await program.methods
    .setFavorites(new BN(43), "blue")
    .accountsPartial({
      user: payer.publicKey,
      favorites: favoritesPda,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log("Transaction Signature", tx);

  const txInfo = await connection.getParsedTransaction(tx);
  console.log("交易日志:", txInfo?.meta?.logMessages);

  // 获取某个PDA favorites 账户信息
  const favoritesAccount = await program.account.favorites.fetch(favoritesPda);
  console.log("Number:", favoritesAccount.number.toString());
  console.log("Color:", favoritesAccount.color);

  // 获取 accountinfo
  const accountInfo = await connection.getAccountInfo(favoritesPda);
  console.log("Account Info:", accountInfo);

  // const accounts = await connection.getMultipleAccountsInfo([favoritesPda, payer.publicKey, program.programId]);
  // console.log("Accounts:", accounts);

  // 获取所有 PDA 账户 (使用未解析版本以获得原始数据)
  const allAccounts = await connection.getProgramAccounts(program.programId);
  console.log("All Accounts:", allAccounts.length);
  
  for (const account of allAccounts) {
    console.log("Account:", account.pubkey.toBase58());
    
    // 🔍 解析 Favorites 账户数据
    try {
      // 检查数据类型，只处理 Buffer 类型的数据
      if (Buffer.isBuffer(account.account.data)) {
        // "favorites" 账户类型 对应 IDL 中的 Favorites 结构体
        const decodedData = program.coder.accounts.decode("favorites", account.account.data);
        console.log("📊 解析的账户数据:");
        console.log(`  Number: ${decodedData.number.toString()}`);
        console.log(`  Color: ${decodedData.color}`);
      }  
    } catch (error) {
      console.log("❌ 解析账户数据失败:", error);
    }
  }

  // 🔍 获取程序相关的交易签名 - 优化参数
  console.log("\n📋 获取交易历史...");
  
  // 本地节点数据会丢失
  const userSignatures = await connection.getSignaturesForAddress(payer.publicKey);
  console.log(`用户账户交易数: ${userSignatures.length}`);

  // 📊 显示用户相关的交易详情
  if (userSignatures.length > 0) {
    console.log("\n🔍 最近的用户交易:");
    for (const sig of userSignatures.slice(0, 2)) { // 只显示前 2 个
      console.log(`  签名: ${sig.signature}`);
      console.log(`  状态: ${sig.err ? '失败' : '成功'}`);
      console.log(`  Slot: ${sig.slot}`);
      
      // 获取交易详情
      const txDetail = await connection.getParsedTransaction(sig.signature);
      console.log("Transaction Info:", txDetail?.meta?.logMessages);
    }
  }

}

main().catch(console.error); 