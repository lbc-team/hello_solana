/**
 * 指令数据编码规则 
 * 
 * Solana 指令数据如何从参数转换为 data 字段
 * 包括 discriminator 和 Borsh 序列化规则
 */

import bs58 from "bs58";
import crypto from "crypto";
import favoritesIdl from "../idl/favorites.json";

// 示例：set_favorites 指令的完整编码过程
function demonstrateInstructionEncoding() {
  console.log("=== Solana 指令数据编码规则详解 ===\n");

  // 1. 原始参数
  const instructionName = "set_favorites";
  const args = {
    number: 42,         // u64
    color: "blue"       // String
  };

  console.log("1. 原始参数:");
  console.log(`   指令名称: ${instructionName}`);
  console.log(`   参数:`, args);
  console.log();

  // 2. 手动编码指令数据 (避免 Anchor Coder 兼容性问题)
  console.log("2. 手动编码指令数据:");
  
  // 从 IDL 获取 discriminator
  const instruction = favoritesIdl.instructions.find((ix: any) => ix.name === "set_favorites");
  const discriminator = Buffer.from(instruction?.discriminator || []);
  
  console.log(`   Discriminator: [${Array.from(discriminator).join(', ')}]`);
  console.log(`   Discriminator (hex): ${discriminator.toString('hex')}`);
  
  // 手动编码参数数据
  const paramsBuffer = Buffer.alloc(1024);
  let offset = 0;
  
  // 编码 number (u64, 8字节, 小端序: little-endian 低位字节在前，高位字节在后)
  paramsBuffer.writeBigUInt64LE(BigInt(args.number), offset);
  console.log(`   number (u64): ${args.number} → 8字节小端序`);
  console.log(`   number 字节: [${Array.from(paramsBuffer.slice(offset, offset + 8)).join(', ')}]`);
  offset += 8;
  
  // 编码 color (String, 4字节长度 + 字符串数据)
  const colorBytes = Buffer.from(args.color, 'utf8');
  paramsBuffer.writeUInt32LE(colorBytes.length, offset);
  console.log(`   color 长度: ${colorBytes.length} → 4字节小端序`);
  console.log(`   长度字节: [${Array.from(paramsBuffer.slice(offset, offset + 4)).join(', ')}]`);
  offset += 4;
  
  colorBytes.copy(paramsBuffer, offset);
  console.log(`   color 内容: "${args.color}" → ${colorBytes.length}字节UTF-8`);
  console.log(`   内容字节: [${Array.from(paramsBuffer.slice(offset, offset + colorBytes.length)).join(', ')}]`);
  offset += colorBytes.length;
  
  const paramsData = paramsBuffer.slice(0, offset);
  console.log(`   参数数据总长度: ${paramsData.length} 字节`);
  console.log();

  // 3. 组合完整指令数据
  const fullInstructionData = Buffer.concat([discriminator, paramsData]);
  console.log("3. 完整指令数据:");
  console.log(`   总长度: ${fullInstructionData.length} 字节`);
  console.log(`   完整字节: [${Array.from(fullInstructionData).join(', ')}]`);
  console.log();

  // 4. Base58 编码 (网络传输格式)
  const base58Data = bs58.encode(fullInstructionData);
  console.log("4. Base58 编码 (网络传输格式):");
  console.log(`   Base58 字符串: ${base58Data}`);
  console.log(`   长度: ${base58Data.length} 字符`);
  console.log();

  // 5. 验证解码
  console.log("5. 验证解码:");
  const decodedData = bs58.decode(base58Data);
  console.log(`   解码后长度: ${decodedData.length} 字节`);
  
  // 验证 discriminator
  const decodedDiscriminator = decodedData.slice(0, 8);
  console.log(`   解码的 discriminator: [${Array.from(decodedDiscriminator).join(', ')}]`);
  console.log(`   discriminator 匹配: ${discriminator.equals(decodedDiscriminator) ? '✅' : '❌'}`);
  
  // 验证参数
  const decodedParams = Buffer.from(decodedData.slice(8));
  let paramOffset = 0;
  
  const decodedNumber = decodedParams.readBigUInt64LE(paramOffset);
  paramOffset += 8;
  console.log(`   解码的 number: ${decodedNumber}`);
  console.log(`   number 匹配: ${BigInt(args.number) === decodedNumber ? '✅' : '❌'}`);
  
  const decodedColorLength = decodedParams.readUInt32LE(paramOffset);
  paramOffset += 4;
  const decodedColor = decodedParams.slice(paramOffset, paramOffset + decodedColorLength).toString('utf8');
  console.log(`   解码的 color: "${decodedColor}"`);
  console.log(`   color 匹配: ${args.color === decodedColor ? '✅' : '❌'}`);
  console.log();

  return {
    discriminator: Array.from(discriminator),
    paramsData: Array.from(paramsData),
    fullData: Array.from(fullInstructionData),
    base58Data
  };
}

// 演示不同参数类型的编码
function demonstrateDifferentTypes() {
  console.log("=== 不同参数类型的编码规则 ===\n");

  // 测试不同的参数组合
  const testCases = [
    { number: 255, color: "red" },
    { number: Number.MAX_SAFE_INTEGER, color: "very_long_color_name_that_exceeds_normal_length" }
  ];

  testCases.forEach((args, index) => {
    console.log(`测试用例 ${index + 1}: number=${args.number}, color="${args.color}"`);
    
    // 手动编码参数
    const paramsBuffer = Buffer.alloc(1024);
    let offset = 0;
    
    // 编码 number
    paramsBuffer.writeBigUInt64LE(BigInt(args.number), offset);
    offset += 8;
    
    // 编码 color
    const colorBytes = Buffer.from(args.color, 'utf8');
    paramsBuffer.writeUInt32LE(colorBytes.length, offset);
    offset += 4;
    colorBytes.copy(paramsBuffer, offset);
    offset += colorBytes.length;
    
    const paramsData = paramsBuffer.slice(0, offset);
    console.log(`   参数数据长度: ${paramsData.length} 字节`);
    console.log(`   参数字节: [${Array.from(paramsData).join(', ')}]`);
    
    // 手动解析验证
    const parseBuffer = Buffer.from(paramsData);
    let parseOffset = 0;
    const parsedNumber = parseBuffer.readBigUInt64LE(parseOffset);
    parseOffset += 8;
    const parsedColorLength = parseBuffer.readUInt32LE(parseOffset);
    parseOffset += 4;
    const parsedColor = parseBuffer.slice(parseOffset, parseOffset + parsedColorLength).toString('utf8');
    
    console.log(`   解析结果: number=${parsedNumber}, color="${parsedColor}"`);
    console.log(`   验证: ${BigInt(args.number) === parsedNumber && args.color === parsedColor ? '✅' : '❌'}`);
    console.log();
  });
}

// 演示 discriminator 的生成规则
function demonstrateDiscriminator() {
  console.log("=== Discriminator 生成规则 ===\n");

  // 从 IDL 获取 discriminator
  const instruction = favoritesIdl.instructions.find((ix: any) => ix.name === "set_favorites");
  const idlDiscriminator = instruction?.discriminator;
  
  console.log("1. IDL 中的 discriminator:");
  console.log(`   数组形式: [${idlDiscriminator?.join(', ')}]`);
  console.log(`   十六进制: ${Buffer.from(idlDiscriminator || []).toString('hex')}`);
  console.log();

  // 2. 验证 discriminator 生成规则: sha256("global:set_favorites")[0..8]
  console.log("2. Discriminator 生成规则验证:");
  const namespace = "global";  // 指令：global， 账户：account，事件：event ， 类型：state 
  const instructionName = "set_favorites";
  const discriminatorSeed = `${namespace}:${instructionName}`;
  
  console.log(`   指令命名空间和名称字符串: "${discriminatorSeed}"`);
  
  // 计算 SHA256 哈希
  const hash = crypto.createHash('sha256');
  hash.update(discriminatorSeed);
  const sha256Hash = hash.digest();
  
  console.log(`   SHA256 完整哈希: ${sha256Hash.toString('hex')}`);
  
  // 取前8字节作为 discriminator
  const calculatedDiscriminator = sha256Hash.slice(0, 8);
  console.log(`   前8字节 (discriminator): [${Array.from(calculatedDiscriminator).join(', ')}]`);
  console.log(`   前8字节 (hex): ${calculatedDiscriminator.toString('hex')}`);
  console.log();

  // 3. 对比验证
  console.log("3. 对比验证:");
  const idlDiscriminatorBuffer = Buffer.from(idlDiscriminator || []);
  const isMatch = idlDiscriminatorBuffer.equals(calculatedDiscriminator);
  
  console.log(`   IDL discriminator:     [${Array.from(idlDiscriminatorBuffer).join(', ')}]`);
  console.log(`   计算 discriminator:   [${Array.from(calculatedDiscriminator).join(', ')}]`);
  console.log(`   匹配结果: ${isMatch ? '✅ 完全匹配' : '❌ 不匹配'}`);
  console.log();
 
}

// 主函数
function main() {
  console.log("🚀 演示 Solana 指令数据编码规则\n");
  
  // 演示基本编码过程
  const result = demonstrateInstructionEncoding();
  
  if (result) {
    console.log("\n" + "=".repeat(50) + "\n");
    
    // 演示不同参数类型
    demonstrateDifferentTypes();
    
    console.log("\n" + "=".repeat(50) + "\n");
    
    // 演示 discriminator 规则
    demonstrateDiscriminator();
  }
}

// 运行演示
if (require.main === module) {
  main();
}

export {
  demonstrateInstructionEncoding,
  demonstrateDifferentTypes,
  demonstrateDiscriminator
};
