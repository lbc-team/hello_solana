/**
 * 获取 Favorites 程序管理的所有 PDA 账户
 *
 * 使用 getProgramAccounts 查询所有由 Favorites 程序拥有的账户
 * 并解析账户数据
 */

import { Connection, PublicKey } from "@solana/web3.js";
import { BorshCoder } from "@coral-xyz/anchor";
import favoritesIdl from "./idl/favorites.json";
import { Favorites } from "./types/favorites";

// Favorites 合约程序 ID
const FAVORITES_PROGRAM_ID = new PublicKey("AfWzQDmP7gzMaiFPmwwQysvVTEuxPvKtDcUA5hfTwiwW");
const RPC_ENDPOINT = "http://localhost:8899";

// 定义 Favorites 账户数据结构
interface FavoritesAccount {
  number: bigint;
  color: string;
}

// 创建 Borsh Coder
const coder = new BorshCoder(favoritesIdl as Favorites);

/**
 * 解析 Favorites 账户数据
 */
function parseFavoritesAccount(data: Buffer): FavoritesAccount | null {
  try {
    // 使用 Anchor 的 BorshAccountsCoder 解码
    const decoded = coder.accounts.decode("Favorites", data);
    return {
      number: decoded.number as bigint,
      color: decoded.color as string,
    };
  } catch (error) {
    console.error("解析账户数据失败:", error);
    return null;
  }
}

/**
 * 获取所有 Favorites PDA 账户
 */
async function getAllFavoritesPDAs(): Promise<void> {
  const connection = new Connection(RPC_ENDPOINT, "confirmed");

  console.log("🔍 获取 Favorites 程序管理的所有 PDA 账户...");
  console.log(`程序 ID: ${FAVORITES_PROGRAM_ID.toBase58()}`);

  try {
    // 获取所有由 Favorites 程序拥有的账户
    const accounts = await connection.getProgramAccounts(FAVORITES_PROGRAM_ID, {
      encoding: "base64",
    });

    console.log(`✅ 找到 ${accounts.length} 个 Favorites PDA 账户\n`);

    if (accounts.length === 0) {
      console.log("没有找到任何 Favorites 账户");
      return;
    }

    // 打印表头
    console.log("=".repeat(100));
    console.log(
      `${"PDA 地址".padEnd(45)} | ${"Number".padEnd(15)} | ${"Color".padEnd(20)} | ${"数据大小"}`
    );
    console.log("=".repeat(100));

    let successCount = 0;
    let failCount = 0;

    // 遍历并解析每个账户
    for (const { pubkey, account } of accounts) {
      const pdaAddress = pubkey.toBase58();
      const dataSize = account.data.length;

      // 解析账户数据
      const favoritesData = parseFavoritesAccount(account.data);

      if (favoritesData) {
        console.log(
          `${pdaAddress.padEnd(45)} | ${favoritesData.number.toString().padEnd(15)} | ${favoritesData.color.padEnd(20)} | ${dataSize} bytes`
        );
        successCount++;
      } else {
        console.log(
          `${pdaAddress.padEnd(45)} | ${"[解析失败]".padEnd(15)} | ${"-".padEnd(20)} | ${dataSize} bytes`
        );
        failCount++;
      }
    }

    console.log("=".repeat(100));
    console.log(`\n📊 统计:`);
    console.log(`  总账户数: ${accounts.length}`);

    // 如果有解析成功的账户，显示一些统计信息
    if (successCount > 0) {
      console.log(`\n🎨 颜色分布:`);
      const colorMap = new Map<string, number>();

      for (const { account } of accounts) {
        const favoritesData = parseFavoritesAccount(account.data);
        if (favoritesData) {
          const count = colorMap.get(favoritesData.color) || 0;
          colorMap.set(favoritesData.color, count + 1);
        }
      }

      for (const [color, count] of colorMap.entries()) {
        console.log(`  ${color}: ${count} 个账户`);
      }

      // 数字范围统计
      console.log(`\n🔢 Number 统计:`);
      const numbers: bigint[] = [];
      for (const { account } of accounts) {
        const favoritesData = parseFavoritesAccount(account.data);
        if (favoritesData) {
          numbers.push(favoritesData.number);
        }
      }

    }

    // 显示详细的账户信息（前5个）
    if (accounts.length > 0 && successCount > 0) {
      console.log(`\n📝 ${accounts.length} 个账户的详细信息:`);
      let count = 0;
      for (const { pubkey, account } of accounts) {
        if (count >= 5) break;

        const favoritesData = parseFavoritesAccount(account.data);
        if (favoritesData) {
          console.log(`\n账户 ${count + 1}:`);
          console.log(`  PDA 地址: ${pubkey.toBase58()}`);
          console.log(`  Number: ${favoritesData.number}`);
          console.log(`  Color: ${favoritesData.color}`);
          console.log(`  所有者: ${account.owner.toBase58()}`);
          console.log(`  Lamports: ${account.lamports}`);
          console.log(`  数据大小: ${account.data.length} bytes`);
          console.log(`  可执行: ${account.executable}`);
          console.log(`  Rent Epoch: ${account.rentEpoch}`);
          count++;
        }
      }
    }
  } catch (error) {
    console.error("获取账户失败:", error);
    throw error;
  }
}

/**
 * 根据用户地址查找对应的 Favorites PDA
 */
async function findFavoritesPDAByUser(userAddress: string): Promise<void> {
  const connection = new Connection(RPC_ENDPOINT, "confirmed");
  const userPubkey = new PublicKey(userAddress);

  console.log(`\n🔍 查找用户的 Favorites PDA...`);
  console.log(`用户地址: ${userAddress}\n`);

  try {
    // 使用标准的 PDA 推导方式（根据实际的种子调整）
    const [pda, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("favorites"), userPubkey.toBuffer()],
      FAVORITES_PROGRAM_ID
    );

    console.log(`计算出的 PDA: ${pda.toBase58()}`);
    console.log(`Bump: ${bump}\n`);

    // 获取账户信息
    const accountInfo = await connection.getAccountInfo(pda);

    if (accountInfo) {
      console.log(`✅ 找到 PDA 账户！`);
      console.log(`  所有者: ${accountInfo.owner.toBase58()}`);
      console.log(`  Lamports: ${accountInfo.lamports}`);
      console.log(`  数据大小: ${accountInfo.data.length} bytes`);

      // 解析账户数据
      const favoritesData = parseFavoritesAccount(accountInfo.data);
      if (favoritesData) {
        console.log(`\n账户数据:`);
        console.log(`  Number: ${favoritesData.number}`);
        console.log(`  Color: ${favoritesData.color}`);
      }
    } else {
      console.log(`❌ PDA 账户不存在（用户尚未调用 set_favorites）`);
    }
  } catch (error) {
    console.error("查找 PDA 失败:", error);
    throw error;
  }
}

// 主函数
async function main() {
  const args = process.argv.slice(2);

  if (args.length > 0 && args[0] === "--user") {
    // 查找特定用户的 PDA
    if (args.length < 2) {
      console.error("❌ 错误: 请提供用户地址");
      console.log("\n使用方法:");
      console.log("  ts-node src/get_all_favorites_pdas.ts --user <用户地址>");
      process.exit(1);
    }
    await findFavoritesPDAByUser(args[1]);
  } else {
    // 获取所有 PDA
    await getAllFavoritesPDAs();
  }
}

main().catch((error) => {
  console.error("执行失败:", error);
  process.exit(1);
});
