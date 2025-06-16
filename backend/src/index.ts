import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  Transaction,
  sendAndConfirmTransaction,
  SystemProgram,
  PublicKey,
} from "@solana/web3.js";
import { Program, BN, AnchorProvider, setProvider } from "@coral-xyz/anchor";
import idl from "./idl/favorites.json";
import { PROGRAM_ID, RPC_ENDPOINT } from "./config";
import { Favorites } from "./types/favorites";

async function main() {
  // 连接本地节点
  const connection = new Connection(RPC_ENDPOINT, "confirmed");

  // 生成钱包
  const payer = Keypair.generate();

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

  // 设置全局 provider
  setProvider(provider);

  // 创建 Program 实例 - 类型安全
  const program = new Program<Favorites>(idl as Favorites, provider);

  // 调试：查看可用的账户名
  console.log("Available accounts:", Object.keys(program.account));

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  // Airdrop 一些 SOL 以便支付手续费
  const airdropSignature = await connection.requestAirdrop(
    payer.publicKey,
    LAMPORTS_PER_SOL,
  );
  
  await connection.confirmTransaction({
    signature: airdropSignature,
    blockhash,
    lastValidBlockHeight,
  });
  console.log("Airdrop 完成");

  // 计算 PDA
  const [favoritesPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("favorites"), payer.publicKey.toBuffer()],
    program.programId
  );

  // 构建 setFavorites 指令 - 使用 accountsPartial 避免类型检查问题
  const tx = await program.methods
    .setFavorites(new BN(42), "blue")
    .accountsPartial({
      user: payer.publicKey,  
      favorites: favoritesPda,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log("Transaction Signature", tx);

  // 查询某个PDA favorites 账户
  const favoritesAccount = await program.account.favorites.fetch(favoritesPda);
  console.log("Favorites info:", favoritesAccount);
  console.log("Number:", favoritesAccount.number.toString());
  console.log("Color:", favoritesAccount.color);

  // 获取所有 PDA 账户
  const allAccounts = await connection.getParsedProgramAccounts(program.programId);
  for (const account of allAccounts) {
    console.log("Account:", account.pubkey.toBase58());
  }

  
}

main().catch(console.error); 