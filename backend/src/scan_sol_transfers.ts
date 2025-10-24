/**
 * SOL 转账记录扫描器
 *
 * 监听指定账号的所有 SOL 转账记录
 */

import { Connection, PublicKey } from "@solana/web3.js";

const RPC_ENDPOINT = "http://localhost:8899";
// 要监听的地址 
const MONITOR_ADDRESS = new PublicKey("iBSaRRAARcM6UJnFuuMXRJHEfjXXe7qXfp7prvxyWpz");

interface TransferRecord {
  slot: number;
  signature: string;
  blockTime: number | null;
  type: "send" | "receive";
  from: string;
  to: string;
  amountSOL: string;
  status: "success" | "failed";
}

async function processTransaction(
  connection: Connection,
  signature: string,
  publicKey: PublicKey
): Promise<TransferRecord | null> {
  try {
    // 获取交易详情
    const tx = await connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });

    if (!tx || !tx.meta) {
      return null;
    }

    const status = tx.meta.err ? "failed" : "success";

    // 解析账户余额变化
    const preBalances = tx.meta.preBalances;
    const postBalances = tx.meta.postBalances;
    const accountKeys = tx.transaction.message.accountKeys;

    // 查找目标账号的索引
    let targetIndex = -1;
    for (let i = 0; i < accountKeys.length; i++) {
      const key = accountKeys[i];
      if ("pubkey" in key && key.pubkey.equals(publicKey)) {
        targetIndex = i;
        break;
      }
    }

    if (targetIndex === -1) {
      return null;
    }

    // 计算余额变化
    const preBalance = preBalances[targetIndex];
    const postBalance = postBalances[targetIndex];
    const balanceChange = postBalance - preBalance;

    // 如果余额有变化
    if (balanceChange !== 0 && Math.abs(balanceChange) > tx.meta.fee) {
      // 查找转账的对方账户
      let otherPartyAddress = "Unknown";

      for (let i = 0; i < accountKeys.length; i++) {
        if (i === targetIndex) continue;

        const otherPreBalance = preBalances[i];
        const otherPostBalance = postBalances[i];
        const otherBalanceChange = otherPostBalance - otherPreBalance;

        if (
          (balanceChange > 0 && otherBalanceChange < 0) ||
          (balanceChange < 0 && otherBalanceChange > 0)
        ) {
          const key = accountKeys[i];
          if ("pubkey" in key) {
            otherPartyAddress = key.pubkey.toBase58();
            break;
          }
        }
      }

      const type = balanceChange > 0 ? "receive" : "send";
      const amount = Math.abs(balanceChange);

      return {
        slot: tx.slot,
        signature,
        blockTime: tx.blockTime ?? null,
        type,
        from: type === "send" ? publicKey.toBase58() : otherPartyAddress,
        to: type === "send" ? otherPartyAddress : publicKey.toBase58(),
        amountSOL: (amount / 1e9).toFixed(9),
        status,
      };
    }
  } catch (error) {
    console.error(`处理交易 ${signature} 时出错:`, error);
  }

  return null;
}

async function continuousScan(): Promise<void> {
  const connection = new Connection(RPC_ENDPOINT, "confirmed");

  console.log(`\n🔍 开始监听 SOL 转账记录...`);
  console.log(`监听地址: ${MONITOR_ADDRESS.toBase58()}`);
  console.log(`RPC 端点: ${RPC_ENDPOINT}\n`);

  // 设置优雅退出处理
  let isRunning = true;
  process.on("SIGINT", () => {
    console.log("\n\n收到退出信号，停止监听...");
    isRunning = false;
  });

  // 获取当前最新的签名作为起点
  const initialSignatures = await connection.getSignaturesForAddress(
    MONITOR_ADDRESS,
    { limit: 1 }
  );

  let untilSignature: string | undefined =
    initialSignatures.length > 0 ? initialSignatures[0].signature : undefined;

  if (untilSignature) {
    console.log(`✅ 从当前位置开始监控`);
  } else {
    console.log(`✅ 开始监控 (暂无历史交易)`);
  }
  console.log(`\n等待新的转账...\n`);

  // 持续扫描
  while (isRunning) {
    try {
      // 获取最新的交易
      const signatures = await connection.getSignaturesForAddress(
        MONITOR_ADDRESS,
        {
          limit: 10,
          until: untilSignature,
        }
      );

      if (signatures.length > 0) {
        console.log(`\n检测到 ${signatures.length} 个新交易`);

        // 反向处理（从旧到新）
        for (let i = signatures.length - 1; i >= 0; i--) {
          const sig = signatures[i];

          const record = await processTransaction(
            connection,
            sig.signature,
            MONITOR_ADDRESS
          );

          if (record) {
            // 打印转账记录
            const emoji = record.type === "send" ? "📤" : "📥";
            const statusEmoji = record.status === "success" ? "✅" : "❌";
            const otherParty = record.type === "send" ? record.to : record.from;

            console.log(`\n${emoji} ${statusEmoji} ${record.type.toUpperCase()} 转账`);
            console.log(`  金额: ${record.amountSOL} SOL`);
            console.log(`  ${record.type === "send" ? "接收方" : "发送方"}: ${otherParty}`);
            console.log(`  签名: ${record.signature}`);
            console.log(
              `  时间: ${
                record.blockTime
                  ? new Date(record.blockTime * 1000).toISOString()
                  : "N/A"
              }`
            );
          }
        }

        // 更新 until 为最新的签名
        untilSignature = signatures[0].signature;
      } else {
        // 没有新交易，等待
        process.stdout.write(`\r⏳ 等待新转账...`);
      }

      // 等待一段时间再检查
      await new Promise((resolve) => setTimeout(resolve, 400));
    } catch (error) {
      console.error("\n扫描过程中出错:", error);
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
  }

  console.log("\n=== 监听已停止 ===");
}

// 主函数
async function main() {
  await continuousScan();
}

main().catch((error) => {
  console.error("监听失败:", error);
  process.exit(1);
});
