/**
 * SOL 转账记录扫描器
 *
 * 使用解析指令的方式监听指定账号的所有 SOL 转账记录
 */

import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";

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
  instructionType: string;
}

async function processTransaction(
  connection: Connection,
  signature: string,
  publicKey: PublicKey
): Promise<TransferRecord[]> {
  const records: TransferRecord[] = [];

  try {
    // 获取解析后的交易详情
    const tx = await connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });

    if (!tx || !tx.meta) {
      return records;
    }

    const status = tx.meta.err ? "failed" : "success";
    const message = tx.transaction.message;
    const instructions = message.instructions;

    // 遍历所有指令（包括主指令和内部指令）
    for (const instruction of instructions) {
      console.log(instruction);
      // 检查是否是解析后的指令
      if ("parsed" in instruction) {
        const parsed = instruction.parsed;

        // 检查是否是 System Program 的转账指令
        if (
          instruction.programId.equals(SystemProgram.programId) &&
          parsed.type === "transfer"
        ) {
          const info = parsed.info;
          const from = info.source;
          const to = info.destination;
          const lamports = info.lamports;

          // 检查转账是否涉及监听的地址
          if (from === publicKey.toBase58() || to === publicKey.toBase58()) {
            const type = from === publicKey.toBase58() ? "send" : "receive";

            records.push({
              slot: tx.slot,
              signature,
              blockTime: tx.blockTime ?? null,
              type,
              from,
              to,
              amountSOL: (lamports / 1e9).toFixed(9),
              status,
              instructionType: "transfer",
            });
          }
        }
        // 也可以检测其他类型，如 transferWithSeed, allocate, createAccount 等
        else if (
          instruction.programId.equals(SystemProgram.programId) &&
          (parsed.type === "createAccount" || parsed.type === "createAccountWithSeed")
        ) {
          const info = parsed.info;
          const from = info.source;
          const to = info.newAccount;
          const lamports = info.lamports;

          // 检查是否涉及监听的地址
          if (from === publicKey.toBase58() || to === publicKey.toBase58()) {
            const type = from === publicKey.toBase58() ? "send" : "receive";

            records.push({
              slot: tx.slot,
              signature,
              blockTime: tx.blockTime ?? null,
              type,
              from,
              to,
              amountSOL: (lamports / 1e9).toFixed(9),
              status,
              instructionType: parsed.type,
            });
          }
        }
      }
    }

    // 也处理内部指令（inner instructions）
    if (tx.meta.innerInstructions) {
      for (const innerInstructionSet of tx.meta.innerInstructions) {
        for (const instruction of innerInstructionSet.instructions) {
          if ("parsed" in instruction) {
            const parsed = instruction.parsed;

            if (
              instruction.programId.equals(SystemProgram.programId) &&
              parsed.type === "transfer"
            ) {
              const info = parsed.info;
              const from = info.source;
              const to = info.destination;
              const lamports = info.lamports;

              if (from === publicKey.toBase58() || to === publicKey.toBase58()) {
                const type = from === publicKey.toBase58() ? "send" : "receive";

                records.push({
                  slot: tx.slot,
                  signature,
                  blockTime: tx.blockTime ?? null,
                  type,
                  from,
                  to,
                  amountSOL: (lamports / 1e9).toFixed(9),
                  status,
                  instructionType: "transfer (inner)",
                });
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error(`处理交易 ${signature} 时出错:`, error);
  }

  return records;
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

          const txRecords = await processTransaction(
            connection,
            sig.signature,
            MONITOR_ADDRESS
          );

          // 一个交易可能包含多个转账指令
          for (const record of txRecords) {
            // 打印转账记录
            const emoji = record.type === "send" ? "📤" : "📥";
            const statusEmoji = record.status === "success" ? "✅" : "❌";
            const otherParty = record.type === "send" ? record.to : record.from;

            console.log(`\n${emoji} ${statusEmoji} ${record.type.toUpperCase()} 转账`);
            console.log(`  指令类型: ${record.instructionType}`);
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
