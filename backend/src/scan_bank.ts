import { Connection, PublicKey } from "@solana/web3.js";
import * as fs from "fs";
import bs58 from "bs58";
import bankIdl from "./idl/bank.json";
import { getInstructionDiscriminatorFromIdl } from "./utils/discriminator";

// Bank 合约程序 ID
const BANK_PROGRAM_ID = new PublicKey("3A7uokk2LFPCMBJmCrn4ahErYicSpvktHEZnCmhVKY4m");
const RPC_ENDPOINT = "http://localhost:8899";

// 从 IDL 中获取指令的 discriminator
const DEPOSIT_DISCRIMINATOR = getInstructionDiscriminatorFromIdl(bankIdl, "deposit");
const WITHDRAW_DISCRIMINATOR = getInstructionDiscriminatorFromIdl(bankIdl, "withdraw");

// 扫描间隔（毫秒）
const SCAN_INTERVAL = 400; // 每 400ms 检查一次新区块

interface TransferRecord {
  slot: number;
  signature: string;
  instruction: string;
  from: string;
  to: string;
  amount: number;
  timestamp: number | null;
}

// 全局变量用于统计
let totalTransfers = 0;
let depositCount = 0;
let withdrawCount = 0;
let totalAmount = 0;

async function processSignature(
  connection: Connection,
  signature: string,
  slot: number
): Promise<TransferRecord[]> {
  const transfers: TransferRecord[] = [];

  try {
    // 使用 getParsedTransaction 获取解析后的交易
    const tx = await connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });

    if (!tx || !tx.meta || tx.meta.err) {
      return transfers;
    }

    const message = tx.transaction.message;
    const instructions = message.instructions;

    // 遍历所有主指令
    for (let i = 0; i < instructions.length; i++) {
      const instruction = instructions[i];

      // 检查是否是 Bank 程序的指令
      // getParsedTransaction 返回的指令可能是 parsed 或 partiallyDecoded
      if ("programId" in instruction && instruction.programId.equals(BANK_PROGRAM_ID)) {
        // 这是未解析的指令（自定义程序）
        if ("data" in instruction) {
          const instructionData = Buffer.from(bs58.decode(instruction.data));

          // 提取前 8 字节作为 discriminator
          if (instructionData.length < 8) continue;

          const discriminator = instructionData.slice(0, 8);
          let instructionType = "";

          if (discriminator.equals(DEPOSIT_DISCRIMINATOR)) {
            instructionType = "deposit";
          } else if (discriminator.equals(WITHDRAW_DISCRIMINATOR)) {
            instructionType = "withdraw";
          } else {
            continue;
          }

          console.log(`\n✅ 发现 Bank ${instructionType.toUpperCase()} 指令！`);
          console.log(`  指令索引: ${i}`);
          console.log(`  账户数量: ${instruction.accounts.length}`);

          // 查找对应的内部指令
          const innerInstructions = tx.meta.innerInstructions || [];

          for (const inner of innerInstructions) {
            if (inner.index !== i) continue; // 只处理当前主指令的内部指令

            console.log(`  内部指令数量: ${inner.instructions.length}`);

            for (const innerIx of inner.instructions) {
              // 检查内部指令是否是 System Program 的 Transfer
              if ("parsed" in innerIx && innerIx.program === "system") {
                const parsedInfo = innerIx.parsed;

                if (parsedInfo.type === "transfer") {
                  const { source, destination, lamports } = parsedInfo.info;

                  const record: TransferRecord = {
                    slot,
                    signature,
                    instruction: instructionType,
                    from: source,
                    to: destination,
                    amount: lamports,
                    timestamp: tx.blockTime ?? null,
                  };

                  transfers.push(record);

                  // 更新统计
                  totalTransfers++;
                  if (instructionType === "deposit") {
                    depositCount++;
                  } else {
                    withdrawCount++;
                  }
                  totalAmount += lamports;

                  // 打印转账记录
                  console.log(`\n🔔 发现 ${instructionType.toUpperCase()} 转账:`);
                  console.log(`  区块: ${slot}`);
                  console.log(`  交易签名: ${signature}`);
                  console.log(`  从: ${source}`);
                  console.log(`  到: ${destination}`);
                  console.log(`  金额: ${lamports / 1e9} SOL (${lamports} lamports)`);
                  console.log(`  时间: ${tx.blockTime ? new Date(tx.blockTime * 1000).toISOString() : "N/A"}`);
                }
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error(`处理交易 ${signature} 时出错:`, error);
  }

  return transfers;
}

async function continuousScan(): Promise<void> {
  const connection = new Connection(RPC_ENDPOINT, "confirmed");
  const allTransfers: TransferRecord[] = [];

  console.log("🚀 启动 Bank 合约 SOL 转账实时监控 (使用 instructions)...");
  console.log(`RPC 端点: ${RPC_ENDPOINT}`);
  console.log(`Bank 程序 ID: ${BANK_PROGRAM_ID.toBase58()}`);
  console.log(`扫描间隔: ${SCAN_INTERVAL}ms\n`);

  // 设置优雅退出处理
  let isRunning = true;
  process.on("SIGINT", () => {
    console.log("\n\n收到退出信号，正在保存数据...");
    isRunning = false;
  });

  // 获取当前最新的签名作为起点（不处理，只作为标记）
  console.log("正在获取当前最新区块位置...");
  const initialSignatures = await connection.getSignaturesForAddress(
    BANK_PROGRAM_ID,
    { limit: 1 }
  );

  let lastProcessedSignature: string | undefined =
    initialSignatures.length > 0 ? initialSignatures[0].signature : undefined;

  if (lastProcessedSignature) {
    console.log(`✅ 从当前位置开始监控 (最新交易: ${lastProcessedSignature.slice(0, 8)}...)`);
  } else {
    console.log(`✅ 开始监控 (暂无历史交易)`);
  }
  console.log(`\n开始监控新的 Bank 交易...\n`);

  // 已处理的签名集合
  const processedSignatures = new Set<string>();
  if (lastProcessedSignature) {
    processedSignatures.add(lastProcessedSignature);
  }

  // 持续扫描
  while (isRunning) {
    try {
      // 获取最新的交易（不使用 before 参数，总是获取最新的）
      const signatures = await connection.getSignaturesForAddress(
        BANK_PROGRAM_ID,
        { limit: 10 }
      );

      if (signatures.length > 0) {
        // 过滤出新的交易
        const newSignatures = signatures.filter(
          sig => !processedSignatures.has(sig.signature)
        );

        if (newSignatures.length > 0) {
          console.log(`\n检测到 ${newSignatures.length} 个新交易`);

          // 反向处理（从旧到新）
          for (let i = newSignatures.length - 1; i >= 0; i--) {
            const sig = newSignatures[i];

            const transfers = await processSignature(
              connection,
              sig.signature,
              sig.slot
            );
            allTransfers.push(...transfers);

            // 标记为已处理
            processedSignatures.add(sig.signature);
          }

          // 打印当前统计
          if (totalTransfers > 0) {
            console.log(`\n📊 当前统计: 总计 ${totalTransfers} 笔转账 | Deposit: ${depositCount} | Withdraw: ${withdrawCount} | 总金额: ${(totalAmount / 1e9).toFixed(4)} SOL`);
          }
        } else {
          // 没有新交易，等待
          process.stdout.write(`\r⏳ 等待新交易...`);
        }
      } else {
        // 没有任何交易
        process.stdout.write(`\r⏳ 等待新交易...`);
      }

      // 等待一段时间再检查
      await new Promise(resolve => setTimeout(resolve, SCAN_INTERVAL));
    } catch (error) {
      console.error("\n扫描过程中出错:", error);
      await new Promise(resolve => setTimeout(resolve, SCAN_INTERVAL));
    }
  }

  // 保存结果
  if (allTransfers.length > 0) {
    const outputFile = `bank_transfers_v2_${Date.now()}.json`;
    fs.writeFileSync(outputFile, JSON.stringify(allTransfers, null, 2));
    console.log(`\n✅ 结果已保存到: ${outputFile}`);
  }

  console.log("\n=== 扫描已停止 ===");
  console.log(`总共发现 ${totalTransfers} 笔转账记录`);
  console.log(`Deposit 数量: ${depositCount}`);
  console.log(`Withdraw 数量: ${withdrawCount}`);
  console.log(`总转账金额: ${(totalAmount / 1e9).toFixed(4)} SOL`);
}

// 主函数
async function main() {
  await continuousScan();
}

main().catch((error) => {
  console.error("扫描失败:", error);
  process.exit(1);
});
