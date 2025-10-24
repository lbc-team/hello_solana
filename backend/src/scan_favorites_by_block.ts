/**
 * Favorites 扫描 - 通过扫描区块的方式
 *
 * 使用 getBlock 逐个区块扫描，查找 set_favorites 指令
 * 使用 Anchor Coder 自动解码指令参数
 */

import { Connection, PublicKey } from "@solana/web3.js";
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
  isInnerInstruction: boolean;
}

// 全局变量用于统计
let totalRecords = 0;

/**
 * 处理单个区块，查找 set_favorites 指令
 */
async function processBlock(
  connection: Connection,
  slot: number
): Promise<SetFavoritesRecord[]> {
  const records: SetFavoritesRecord[] = [];

  try {
    // 获取区块信息，包含完整的交易数据
    const block = await connection.getBlock(slot, {
      maxSupportedTransactionVersion: 0,
      transactionDetails: "full",
      rewards: false,
    });

    if (!block || !block.transactions) {
      return records;
    }

    console.log(`\n📦 区块 ${slot}: 包含 ${block.transactions.length} 个交易`);

    // 遍历区块中的所有交易
    for (const tx of block.transactions) {
      if (!tx.meta || tx.meta.err) {
        continue;
      }

      const signature = tx.transaction.signatures[0];
      const message = tx.transaction.message;
      const accountKeys = message.accountKeys;

      // 处理主指令
      for (let i = 0; i < message.instructions.length; i++) {
        const instruction = message.instructions[i];
        const programIdIndex = instruction.programIdIndex;
        const programId = accountKeys[programIdIndex];

        // 检查是否是 Favorites 程序
        if (programId.equals(FAVORITES_PROGRAM_ID)) {
          // 解码指令数据
          const decoded = decodeInstructionFromBase58(
            favoritesIdl as Favorites,
            instruction.data
          );

          if (decoded && decoded.instructionName === "set_favorites") {
            const { number, color } = decoded.data;

            // 获取账户信息
            const accounts = instruction.accounts;
            const user = accounts.length > 0 ? accountKeys[accounts[0]].toBase58() : "Unknown";
            const favorites = accounts.length > 1 ? accountKeys[accounts[1]].toBase58() : "Unknown";

            const record: SetFavoritesRecord = {
              slot,
              signature,
              user,
              favorites,
              number: number.toString(),
              color: color,
              timestamp: block.blockTime ?? null,
              isInnerInstruction: false,
            };

            records.push(record);
            totalRecords++;

            // 打印记录
            console.log(`\n✅ 发现 SET_FAVORITES 指令！`);
            console.log(`  类型: 主指令`);
            console.log(`  区块: ${slot}`);
            console.log(`  交易签名: ${signature}`);
            console.log(`  用户: ${user}`);
            console.log(`  Favorites PDA: ${favorites}`);
            console.log(`  Number: ${number.toString()}`);
            console.log(`  Color: ${color}`);
            console.log(`  时间: ${block.blockTime ? new Date(block.blockTime * 1000).toISOString() : "N/A"}`);
          }
        }
      }

      // 处理内部指令（inner instructions）
      if (tx.meta.innerInstructions) {
        for (const innerInstructionSet of tx.meta.innerInstructions) {
          for (const innerInstruction of innerInstructionSet.instructions) {
            const programIdIndex = innerInstruction.programIdIndex;
            const programId = accountKeys[programIdIndex];

            // 检查是否是 Favorites 程序
            if (programId.equals(FAVORITES_PROGRAM_ID)) {
              // 解码指令数据
              const decoded = decodeInstructionFromBase58(
                favoritesIdl as Favorites,
                innerInstruction.data
              );

              if (decoded && decoded.instructionName === "set_favorites") {
                const { number, color } = decoded.data;

                // 获取账户信息
                const accounts = innerInstruction.accounts;
                const user = accounts.length > 0 ? accountKeys[accounts[0]].toBase58() : "Unknown";
                const favorites = accounts.length > 1 ? accountKeys[accounts[1]].toBase58() : "Unknown";

                const record: SetFavoritesRecord = {
                  slot,
                  signature,
                  user,
                  favorites,
                  number: number.toString(),
                  color: color,
                  timestamp: block.blockTime ?? null,
                  isInnerInstruction: true,
                };

                records.push(record);
                totalRecords++;

                // 打印记录
                console.log(`\n✅ 发现 SET_FAVORITES 指令！`);
                console.log(`  类型: 内部指令`);
                console.log(`  区块: ${slot}`);
                console.log(`  交易签名: ${signature}`);
                console.log(`  用户: ${user}`);
                console.log(`  Favorites PDA: ${favorites}`);
                console.log(`  Number: ${number.toString()}`);
                console.log(`  Color: ${color}`);
                console.log(`  时间: ${block.blockTime ? new Date(block.blockTime * 1000).toISOString() : "N/A"}`);
              }
            }
          }
        }
      }
    }
  } catch (error) {
    // 区块可能不存在或已被跳过
    if (error instanceof Error && error.message.includes("was skipped")) {
      // 跳过的区块，不打印错误
    } else {
      console.error(`处理区块 ${slot} 时出错:`, error);
    }
  }

  return records;
}

/**
 * 持续扫描新区块
 */
async function continuousScan(): Promise<void> {
  const connection = new Connection(RPC_ENDPOINT, "confirmed");

  console.log("🚀 通过扫描区块的方式监听 set_favorites 指令...");
  console.log(`Favorites 程序 ID: ${FAVORITES_PROGRAM_ID.toBase58()}`);
  console.log(`RPC 端点: ${RPC_ENDPOINT}\n`);

  // 设置优雅退出处理
  let isRunning = true;
  process.on("SIGINT", () => {
    console.log("\n\n收到退出信号，正在停止...");
    isRunning = false;
  });

  // 获取当前最新的 slot
  let currentSlot = await connection.getSlot("confirmed");
  console.log(`✅ 从当前 slot 开始监控: ${currentSlot}\n`);

  // 持续扫描
  while (isRunning) {
    try {
      // 获取最新的 slot
      const latestSlot = await connection.getSlot("confirmed");

      if (latestSlot > currentSlot) {
        console.log(`\n🔍 检测到新区块: ${currentSlot + 1} - ${latestSlot}`);

        // 扫描从 currentSlot + 1 到 latestSlot 的所有区块
        for (let slot = currentSlot + 1; slot <= latestSlot; slot++) {
          if (!isRunning) break;

          await processBlock(connection, slot);
        }

        currentSlot = latestSlot;

        // 打印当前统计
        if (totalRecords > 0) {
          console.log(`\n📊 当前统计: 总计 ${totalRecords} 次 set_favorites 调用`);
        }
      } else {
        // 没有新区块，等待
        process.stdout.write(`\r⏳ 等待新区块... (当前 slot: ${currentSlot})`);
      }

      // 等待一段时间再检查
      await new Promise((resolve) => setTimeout(resolve, SCAN_INTERVAL));
    } catch (error) {
      console.error("\n扫描过程中出错:", error);
      await new Promise((resolve) => setTimeout(resolve, SCAN_INTERVAL));
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
