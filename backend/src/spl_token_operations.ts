import {
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL
} from "@solana/web3.js";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  transfer,
  getAccount,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import * as fs from "fs";
import { RPC_ENDPOINT, PAYER_KEYPAIR_PATH } from "./config";

/**
 * 加载密钥对
 */
function loadKeypair(path: string): Keypair {
  const secretKeyString = fs.readFileSync(path, "utf8");
  const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
  return Keypair.fromSecretKey(secretKey);
}

/**
 * 主函数：演示 SPL Token 的发行与转账
 */
async function main() {
  console.log("\n=== SPL Token 发行与转账演示 ===\n");

  // 1. 建立连接
  const connection = new Connection(RPC_ENDPOINT, "confirmed");
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  console.log("✅ 连接到 Solana:", RPC_ENDPOINT);

  // 2. 加载支付者密钥对
  // const payer = Keypair.generate();
  const payer = loadKeypair(PAYER_KEYPAIR_PATH);
  console.log("✅ 支付者地址:", payer.publicKey.toBase58());

  // 检查余额
  const balance = await connection.getBalance(payer.publicKey);
  console.log(`💰 支付者余额: ${balance / 1e9} SOL\n`);

  if (balance < 0.01 * 1e9) {
    console.log("❌ 余额不足，请先充值 SOL");
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

  // 3. 创建新的 Token Mint
  console.log("📝 正在创建新的 Token Mint...");
  const mint = await createMint(
    connection,
    payer,             // 支付交易费用的账户
    payer.publicKey,   // Mint Authority（铸币权限）
    payer.publicKey,   // Freeze Authority（冻结权限），可设为 null
    9                  // 小数位数 (decimals)
  );
  console.log("✅ Token Mint 地址:", mint.toBase58());

  // 4. 为支付者创建 Token Account
  console.log("📝 正在为支付者创建 Token Account...");
  const payerTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    payer.publicKey
  );
  console.log("✅ 支付者 Token Account:", payerTokenAccount.address.toBase58());
  console.log(`   当前余额: ${payerTokenAccount.amount}\n`);

  // 5. 铸造 Token（发行）
  const mintAmount = 1000 * 1e9; // 1000 个 token (考虑 9 位小数)
  console.log(`📝 正在铸造 ${mintAmount / 1e9} 个 Token...`);
  const mintSignature = await mintTo(
    connection,
    payer,
    mint,
    payerTokenAccount.address,
    payer.publicKey,  // Mint Authority
    mintAmount
  );
  console.log("✅ 铸造成功！");
  console.log("   交易签名:", mintSignature);

  // 查询更新后的余额
  const updatedAccount = await getAccount(connection, payerTokenAccount.address);
  console.log(`   新余额: ${Number(updatedAccount.amount) / 1e9} tokens\n`);

  // 6. 创建接收者账户并转账
  console.log("📝 创建接收者账户...");
  const receiver = Keypair.generate();
  console.log("✅ 接收者地址:", receiver.publicKey.toBase58());

  // 为接收者充值一些 SOL（用于支付 rent）
  console.log("📝 为接收者充值 SOL 以支付账户租金...");
  const airdropSignature = await connection.requestAirdrop(
    receiver.publicKey,
    0.1 * 1e9
  );
  await connection.confirmTransaction(airdropSignature);
  console.log("✅ 充值完成\n");

  // 为接收者创建 Token Account
  console.log("📝 为接收者创建 Token Account...");
  const receiverTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    receiver.publicKey
  );
  console.log("✅ 接收者 Token Account:", receiverTokenAccount.address.toBase58());
  console.log(`   当前余额: ${receiverTokenAccount.amount}\n`);

  // 7. 转账 Token
  const transferAmount = 100 * 1e9; // 转账 100 个 token
  console.log(`📝 正在转账 ${transferAmount / 1e9} 个 Token...`);
  const transferSignature = await transfer(
    connection,
    payer,
    payerTokenAccount.address,
    receiverTokenAccount.address,
    payer.publicKey,
    transferAmount
  );
  console.log("✅ 转账成功！");
  console.log("   交易签名:", transferSignature);

  // 8. 查询最终余额
  console.log("\n📊 转账后余额:");
  const finalPayerAccount = await getAccount(connection, payerTokenAccount.address);
  const finalReceiverAccount = await getAccount(connection, receiverTokenAccount.address);

  console.log(`   支付者: ${Number(finalPayerAccount.amount) / 1e9} tokens`);
  console.log(`   接收者: ${Number(finalReceiverAccount.amount) / 1e9} tokens`);
}

// 执行主函数
main()
  .then(() => {
    console.log("\n✅ 程序执行成功");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ 发生错误:", error);
    process.exit(1);
  });
