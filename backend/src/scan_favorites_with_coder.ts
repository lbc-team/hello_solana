/**
 * Favorites 扫描 - 使用 Anchor Coder 自动解码
 *
 * 使用 Anchor 的 BorshInstructionCoder
 * 自动解码指令参数，无需手动解析
 */

import { Connection, PublicKey } from "@solana/web3.js";
import * as fs from "fs";
import favoritesIdl from "./idl/favorites.json";
import { Favorites } from "./types/favorites";
import { decodeInstructionFromBase58 } from "./utils/instruction_decoder";

// Favorites 合约程序 ID
const FAVORITES_PROGRAM_ID = new PublicKey("AfWzQDmP7gzMaiFPmwwQysvVTEuxPvKtDcUA5hfTwiwW");
const RPC_ENDPOINT = "http://localhost:8899";

// 扫描间隔（毫秒）
const SCAN_INTERVAL = 400;

interface SetFavoritesRecord {
  slot: number;
  signature: string;
  user: string;
  favorites: string;
  number: string;
  color: string;
  timestamp: number | null;
}

// 全局变量用于统计
let totalRecords = 0;

async function processSignature(
  connection: Connection,
  signature: string,
  slot: number
): Promise<SetFavoritesRecord[]> {
  const records: SetFavoritesRecord[] = [];

  try {
    // 使用 getParsedTransaction 获取解析后的交易
    const tx = await connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });

    if (!tx || !tx.meta || tx.meta.err) {
      return records;
    }

    const message = tx.transaction.message;
    const instructions = message.instructions;

    // 遍历所有主指令
    for (let i = 0; i < instructions.length; i++) {
      const instruction = instructions[i];
      console.log(instruction);

      // hex: d3895787a1e0bb782b0000000000000004000000626c7565
      // base58: LHW7AG4w8ym8rq7uwSGAs8r6omyk98FJU

      // 检查是否是 Favorites 程序的指令
      if ("programId" in instruction && instruction.programId.equals(FAVORITES_PROGRAM_ID)) {
        if ("data" in instruction) {
          // 使用 Anchor Coder 自动解码
          const decoded = decodeInstructionFromBase58(
            favoritesIdl as Favorites,
            instruction.data
          );

          console.log("decoded:", decoded);

          if (!decoded) {
            console.log(`  ⚠️  无法解码指令`);
            continue;
          }

          // 检查是否是 set_favorites 指令
          if (decoded.instructionName === "set_favorites") {
            console.log(`\n✅ 发现 SET_FAVORITES 指令！`);
            console.log(`  解码方式: Anchor BorshInstructionCoder`);

            // 🎉 自动解码的参数，类型安全！
            const { number, color } = decoded.data;

            // 获取账户信息
            const accounts = instruction.accounts;
            const user = accounts.length > 0 ? accounts[0].toBase58() : "Unknown";
            const favorites = accounts.length > 1 ? accounts[1].toBase58() : "Unknown";

            const record: SetFavoritesRecord = {
              slot,
              signature,
              user,
              favorites,
              number: number.toString(),
              color: color,
              timestamp: tx.blockTime ?? null,
            };

            records.push(record);
            totalRecords++;

            // 打印记录
            console.log(`\n🔔 发现 SET_FAVORITES 调用:`);
            console.log(`  区块: ${slot}`);
            console.log(`  交易签名: ${signature}`);
            console.log(`  用户: ${user}`);
            console.log(`  Favorites PDA: ${favorites}`);
            console.log(`  Number: ${number.toString()}`);
            console.log(`  Color: ${color}`);
            console.log(`  时间: ${tx.blockTime ? new Date(tx.blockTime * 1000).toISOString() : "N/A"}`);
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
  const allRecords: SetFavoritesRecord[] = [];

  console.log("🚀  扫描 set_favorites 调用 ...");
  console.log(`Favorites 程序 ID: ${FAVORITES_PROGRAM_ID.toBase58()}`);

  // 设置优雅退出处理
  let isRunning = true;
  process.on("SIGINT", () => {
    console.log("\n\n收到退出信号，正在保存数据...");
    isRunning = false;
  });

  // 获取当前最新的签名作为起点
  console.log("正在获取当前最新区块位置...");
  const initialSignatures = await connection.getSignaturesForAddress(
    FAVORITES_PROGRAM_ID,
    { limit: 1 }
  );

  let untilSignature: string | undefined =
    initialSignatures.length > 0 ? initialSignatures[0].signature : undefined;

  if (untilSignature) {
    console.log(`✅ 从当前位置开始监控 (最新交易: ${untilSignature.slice(0, 8)}...)`);
  } else {
    console.log(`✅ 开始监控 (暂无历史交易)`);
  }
  console.log(`\n开始监控新的 Favorites 交易...\n`);

  // 持续扫描
  while (isRunning) {
    try {
      // 获取最新的交易，使用 until 参数避免重复处理

      const signatures = await connection.getSignaturesForAddress(
        FAVORITES_PROGRAM_ID,
        {
          limit: 1000,
          until: untilSignature // 返回
        }
      );

      if (signatures.length > 0) {
        console.log(`\n检测到 ${signatures.length} 个新交易`);

        // 反向处理（从旧到新）
        for (let i = signatures.length - 1; i >= 0; i--) {
          const sig = signatures[i];

          const records = await processSignature(
            connection,
            sig.signature,
            sig.slot
          );
          allRecords.push(...records);
        }

        // 更新 until 为最新的签名，下次扫描将只获取比这个更新的交易
        untilSignature = signatures[0].signature;

        // 打印当前统计
        if (totalRecords > 0) {
          console.log(`\n📊 当前统计: 总计 ${totalRecords} 次 set_favorites 调用`);
        }
      } else {
        // 没有新交易，等待
        process.stdout.write(`\r⏳ 等待新交易...`);
      }

      // 等待一段时间再检查
      await new Promise(resolve => setTimeout(resolve, SCAN_INTERVAL));
    } catch (error) {
      console.error("\n扫描过程中出错:", error);
      await new Promise(resolve => setTimeout(resolve, SCAN_INTERVAL));
    }
  }

  console.log("\n=== 扫描已停止 ===");
  console.log(`总共发现 ${totalRecords} 次 set_favorites 调用`);
}

// 主函数
async function main() {
  await continuousScan();
}

main().catch((error) => {
  console.error("扫描失败:", error);
  process.exit(1);
});
