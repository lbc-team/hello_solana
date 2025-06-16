import {
  Connection,
  PublicKey,
} from "@solana/web3.js";
import { Program, AnchorProvider, setProvider } from "@coral-xyz/anchor";
import idl from "./idl/favorites.json";
import { PROGRAM_ID, RPC_ENDPOINT } from "./config";
import { Favorites } from "./types/favorites";

async function listenToFavorites() {
  console.log("🎧 开始监听 Favorites 合约日志...");
  
  // 连接到 Solana 网络
  const connection = new Connection(RPC_ENDPOINT, "confirmed");
  
  // 创建一个空的 provider（仅用于只读操作）
  const provider = new AnchorProvider(connection, {} as any, {
    commitment: "confirmed",
  });
  
  setProvider(provider);
  
  // 创建 Program 实例
  const program = new Program<Favorites>(idl as Favorites, provider);
  
  console.log(`📡 监听程序 ID: ${program.programId.toBase58()}`);
  console.log(`🌐 RPC 端点: ${RPC_ENDPOINT}`);
  
  // 监听所有与该程序相关的日志
  const listenerId = connection.onLogs(
    program.programId,
    (logs, context) => {
      console.log("\n" + "=".repeat(50));
      console.log(`📝 接收到新日志 - Slot: ${context.slot}`);
      console.log(`🔗 交易签名: ${logs.signature}`);
      if (logs.err) {
        console.log(`❌ 错误: ${JSON.stringify(logs.err)}`);
      }
      
      console.log("\n📋 日志内容:");
      logs.logs.forEach((log, index) => {
        console.log(`  ${index + 1}. ${log}`);
      });
      
      // 尝试解析程序指令
      if (logs.logs.some(log => log.includes("Instruction: SetFavorites"))) {
        console.log("🎯 检测到 SetFavorites 指令调用!");
        
        // 提取数据（如果日志中包含）
        const dataLogs = logs.logs.filter(log => log.includes("Program data:"));
        if (dataLogs.length > 0) {
          console.log("📊 程序数据:", dataLogs);
        }
      }
      
      console.log("=".repeat(50) + "\n");
    },
    "confirmed"
  );
  
  console.log(`✅ 监听已启动，listener ID: ${listenerId}`);
  console.log("🔄 持续监听中... (按 Ctrl+C 停止)");
  
  // 定期检查连接状态
  const healthCheck = setInterval(async () => {
    try {
      const slot = await connection.getSlot();
      console.log(`连接正常 - 最新 Slot: ${slot}`);
    } catch (error) {
      console.error("❌ 连接检查失败:", error);
    }
  }, 30000); // 每30秒检查一次
  

  
  // 获取所有现有的 Favorites 账户
  try {
    const accounts = await program.account.favorites.all();
    console.log(`📊 当前共有 ${accounts.length} 个 Favorites 账户:`);
    
    accounts.forEach((account, index) => {
      console.log(`  ${index + 1}. ${account.publicKey.toBase58()}`);
      console.log(`     Number: ${account.account.number.toString()}`);
      console.log(`     Color: ${account.account.color}`);
    });
    
  // 监听账户变化（可选， 这里监听最后一个）
  console.log("监听最后一个 Favorites 账户变化...");
    const lastAccount = accounts[accounts.length - 1];
    connection.onAccountChange(
        lastAccount.publicKey,
        (accountInfo, context) => {
          console.log(`📝 账户更新: ${lastAccount.publicKey.toBase58()}`);
          console.log(`📊 Slot: ${context.slot}`);
          
          // 尝试解析账户数据
          try {
            const decoded = program.coder.accounts.decode("favorites", accountInfo.data);
            console.log(`📈 新数据:`);
            console.log(`   Number: ${decoded.number.toString()}`);
            console.log(`   Color: ${decoded.color}`);
          } catch (error) {
            console.log("❌ 无法解析账户数据:", error);
          }
          
          console.log("🔄".repeat(20) + "\n");
        },
        { commitment: "confirmed" }
      );
  } catch (error) {
    console.log("⚠️  获取现有账户失败（可能是第一次运行）:", error);
  }
  
  // 关闭监听
  process.on('SIGINT', () => {
    console.log("\n🛑 正在关闭监听...");
    connection.removeOnLogsListener(listenerId);
    clearInterval(healthCheck);
    console.log("✅ 监听已关闭");
    process.exit(0);
  });
  
  // 保持进程运行
  return new Promise(() => {});
}

// 启动监听
if (require.main === module) {
  listenToFavorites().catch((error) => {
    console.error("❌ 监听启动失败:", error);
    process.exit(1);
  });
}

export { listenToFavorites };
