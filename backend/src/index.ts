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

  // 创建 Provider
  const provider = new AnchorProvider(connection, payer as any, {
    commitment: "confirmed",
  });

  // 设置全局 provider
  setProvider(provider);

  // 创建 Program 实例
  const program = new Program(idl as Favorites, provider);

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

  // 构建 setFavorites 指令（注意：IDL 中是 set_favorites）
  const setFavoritesIx = await program.methods
    .setFavorites(new BN(42), "blue")
    .accounts({
      user: payer.publicKey,
      favorites: favoritesPda,
      systemProgram: SystemProgram.programId,
    })
    .instruction();

  // 构建并发送交易
  const tx = new Transaction().add(setFavoritesIx);
  const txSignature = await sendAndConfirmTransaction(
    connection,
    tx,
    [payer]
  );
  console.log("Transaction Signature", txSignature);

  // 查询 favorites 账户  
  const favoritesAccount = await (program.account as any)["favorites"].fetch(favoritesPda);
  console.log("Favorites info:", favoritesAccount);
}

main().catch(console.error); 