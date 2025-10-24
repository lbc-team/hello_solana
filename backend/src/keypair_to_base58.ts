import * as fs from 'fs';
import * as path from 'path';
import bs58 from 'bs58';

/**
 * 将 keypair.json 转换为 base58 编码的私钥
 * @param keypairPath - keypair 文件的路径
 */
function convertKeypairToBase58(keypairPath: string) {
  try {
    // 检查文件是否存在
    if (!fs.existsSync(keypairPath)) {
      throw new Error(`文件不存在: ${keypairPath}`);
    }

    // 读取 keypair 文件
    const keypairData = fs.readFileSync(keypairPath, 'utf-8');

    // 解析 JSON 数据（通常是一个字节数组）
    const keypairArray: number[] = JSON.parse(keypairData);

    // 转换为 Uint8Array
    const keypairUint8 = new Uint8Array(keypairArray);

    // 转换为 base58
    const base58Key = bs58.encode(keypairUint8);

    console.log('Keypair JSON 文件路径:', keypairPath);
    console.log('\nBase58 编码的私钥:');
    console.log(base58Key);
    console.log('\n私钥长度:', keypairArray.length, '字节');

    // 保存到同目录下
    const dir = path.dirname(keypairPath);
    const basename = path.basename(keypairPath, path.extname(keypairPath));
    const outputPath = path.join(dir, `${basename}_base58.txt`);
    fs.writeFileSync(outputPath, base58Key);
    console.log('\nBase58 私钥已保存到:', outputPath);

    return base58Key;
  } catch (error) {
    console.error('转换过程中出错:', error);
    throw error;
  }
}

// 获取命令行参数
const args = process.argv.slice(2);

// 如果提供了参数，使用参数中的路径；否则使用默认路径
let keypairPath: string;
if (args.length > 0) {
  keypairPath = args[0];
  // 如果是相对路径，转换为绝对路径
  if (!path.isAbsolute(keypairPath)) {
    keypairPath = path.resolve(process.cwd(), keypairPath);
  }
} else {
  // 默认路径
  keypairPath = path.join(__dirname, '..', 'keypair.json');
}

console.log('使用方法: ts-node src/keypair_to_base58.ts [keypair文件路径]');
console.log('如果不提供路径，默认使用 backend/keypair.json\n');

// 执行转换
convertKeypairToBase58(keypairPath);
