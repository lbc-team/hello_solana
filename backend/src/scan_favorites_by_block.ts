/**
 * Favorites 扫描 - 通过扫描区块的方式
 *
 * 使用 getBlock 逐个区块扫描，查找 set_favorites 指令
 * 使用 Anchor Coder 自动解码指令参数
 */

import { Connection, PublicKey } from "@solana/web3.js";
import favoritesIdl from "./idl/favorites.json";
import { Favorites } from "./types/favorites";
import { decodeInstruction } from "./utils/instruction_decoder";
import bs58 from "bs58";

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

    // 遍历区块中的所有交易
    for (const tx of block.transactions) {
      if (!tx.meta || tx.meta.err) {
        continue;
      }

      const signature = tx.transaction.signatures[0];
      const message = tx.transaction.message;

      // 获取账户键 - 使用 getAccountKeys() 方法处理版本化交易
      const accountKeys = message.getAccountKeys();

      // 获取编译后的指令（处理版本化消息的不同结构）
      // @ts-ignore - VersionedMessage 可能是 MessageV0 或 Message，都有 compiledInstructions
      const compiledInstructions = message.compiledInstructions ?? [];

      // 处理主指令
      for (let i = 0; i < compiledInstructions.length; i++) {
        const instruction = compiledInstructions[i];
        const programId = accountKeys.get(instruction.programIdIndex);

        // 检查是否是 Favorites 程序
        if (programId && programId.equals(FAVORITES_PROGRAM_ID)) {
          // 将 Uint8Array 转换为 Buffer 进行解码
          const instructionData = Buffer.from(instruction.data);

          // 解码指令数据
          const decoded = decodeInstruction(
            favoritesIdl as Favorites,
            instructionData
          );

          if (decoded && decoded.instructionName === "set_favorites") {
            const { number, color } = decoded.data;

            // 获取账户信息
            const accountIndices = instruction.accountKeyIndexes;
            const user = accountIndices.length > 0 ? (accountKeys.get(accountIndices[0])?.toBase58() ?? "Unknown") : "Unknown";
            const favorites = accountIndices.length > 1 ? (accountKeys.get(accountIndices[1])?.toBase58() ?? "Unknown") : "Unknown";

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
            console.log(`  区块: ${slot}`);
            console.log(`  交易签名: ${signature}`);
            console.log(`  用户: ${user}`);
            console.log(`  Favorites PDA: ${favorites}`);
            console.log(`  Number: ${number.toString()} Color: ${color}`);
            console.log(`  时间: ${block.blockTime ? new Date(block.blockTime * 1000).toISOString() : "N/A"}`);
          }
        }
      }

      // 处理内部指令（inner instructions）
      if (tx.meta.innerInstructions) {
        for (const innerInstructionSet of tx.meta.innerInstructions) {
          for (const innerInstruction of innerInstructionSet.instructions) {
            const programIdIndex = innerInstruction.programIdIndex;
            const innerProgramId = accountKeys.get(programIdIndex);

            // 检查是否是 Favorites 程序
            if (innerProgramId && innerProgramId.equals(FAVORITES_PROGRAM_ID)) {
              // 将 Uint8Array 转换为 Buffer 进行解码
              const innerInstructionData = Buffer.from(bs58.decode(innerInstruction.data));

              // 解码指令数据
              const decoded = decodeInstruction(
                favoritesIdl as Favorites,
                innerInstructionData
              );

              if (decoded && decoded.instructionName === "set_favorites") {
                const { number, color } = decoded.data;

                // 获取账户信息
                const innerAccountIndices = innerInstruction.accounts;
                const user = innerAccountIndices.length > 0 ? (accountKeys.get(innerAccountIndices[0])?.toBase58() ?? "Unknown") : "Unknown";
                const favorites = innerAccountIndices.length > 1 ? (accountKeys.get(innerAccountIndices[1])?.toBase58() ?? "Unknown") : "Unknown";

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
