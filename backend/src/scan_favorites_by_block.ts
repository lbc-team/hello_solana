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

      //  使用 `getBlock` 获取区块数据时，返回的是原始的 `compiledInstructions` 格式，而不是像 `getParsedTransaction` 那样返回已解析的 `instructions` 格式
      /**
      ### CompiledInstruction 格式
      ```typescript
      {
        programIdIndex: number,         // programId 在 accountKeys 中的索引
        accountKeyIndexes: number[],    // 账户在 accountKeys 中的索引数组
        data: Uint8Array                // 原始字节数组
      }
      ```
      
      ### Parsed Instruction 格式
      ```typescript
      {
        programId: PublicKey,           // 已解析的 PublicKey 对象
        accounts: PublicKey[],          // 已解析的账户数组
        data: string                    // base58 编码的数据字符串
      }
      ```
     */
      const compiledInstructions = message.compiledInstructions ?? [];

      // 将 compiledInstructions 转换为 parsed instructions 格式（仅转换地址，保留原始 data）
      const instructions = compiledInstructions.map((ix: any) => {
        const programId = accountKeys.get(ix.programIdIndex);
        const accounts = ix.accountKeyIndexes.map((idx: number) => accountKeys.get(idx));
        // data 保持 Buffer 格式，直接使用
        return { programId, accounts, data: ix.data };
      });

      // 处理主指令（使用和 scan_favorites_with_coder.ts 相同的方式）
      for (let i = 0; i < instructions.length; i++) {
        const instruction = instructions[i];

        // 检查是否是 Favorites 程序的指令
        if ("programId" in instruction && instruction.programId && instruction.programId.equals(FAVORITES_PROGRAM_ID)) {
          if ("data" in instruction) {
            // 直接使用 Buffer 格式的 data 解码，不需要 base58 转换
            const decoded = decodeInstruction(
              favoritesIdl as Favorites,
              instruction.data
            );

            if (decoded && decoded.instructionName === "set_favorites") {
              const { number, color } = decoded.data;

              // 获取账户信息
              const accounts = instruction.accounts;
              const user = accounts.length > 0 ? accounts[0]?.toBase58() ?? "Unknown" : "Unknown";
              const favorites = accounts.length > 1 ? accounts[1]?.toBase58() ?? "Unknown" : "Unknown";

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
      }

      // 处理内部指令（inner instructions）
      if (tx.meta.innerInstructions) {
        for (const innerInstructionSet of tx.meta.innerInstructions) {
          // 将内部指令也转换为 parsed 格式
          const parsedInnerInstructions = innerInstructionSet.instructions.map((ix: any) => {
            const programId = accountKeys.get(ix.programIdIndex);
            const accounts = ix.accounts.map((idx: number) => accountKeys.get(idx));
            // 内部指令的 data 已经是 base58 字符串格式
            return { programId, accounts, data: ix.data };
          });

          for (const innerInstruction of parsedInnerInstructions) {
            // 检查是否是 Favorites 程序
            if (innerInstruction.programId && innerInstruction.programId.equals(FAVORITES_PROGRAM_ID)) {
              // 解码指令数据
              const decoded = decodeInstruction(
                favoritesIdl as Favorites,
                innerInstruction.data
              );

              if (decoded && decoded.instructionName === "set_favorites") {
                const { number, color } = decoded.data;

                // 获取账户信息
                const accounts = innerInstruction.accounts;
                const user = accounts.length > 0 ? accounts[0]?.toBase58() ?? "Unknown" : "Unknown";
                const favorites = accounts.length > 1 ? accounts[1]?.toBase58() ?? "Unknown" : "Unknown";

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
