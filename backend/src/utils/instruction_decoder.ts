/**
 * 指令解码工具模块
 *
 * 使用 Anchor 的 BorshInstructionCoder 自动解码指令数据
 */

import { BorshInstructionCoder } from "@coral-xyz/anchor";
import bs58 from "bs58";

/**
 * 解码指令数据
 *
 * @param idl - IDL 对象
 * @param instructionData - 指令数据 Buffer（包含 discriminator）
 * @returns { instructionName: string, data: any } 或 null
 */
export function decodeInstruction(
  idl: any,
  instructionData: Buffer
): { instructionName: string; data: any } | null {
  try {
    const coder = new BorshInstructionCoder(idl);

    // decode 方法会返回指令名称和解码后的数据
    const decoded = coder.decode(instructionData);

    if (!decoded) {
      return null;
    }

    return {
      instructionName: decoded.name,
      data: decoded.data,
    };
  } catch (error) {
    console.error("解码指令失败:", error);
    return null;
  }
}

/**
 * 从 base58 编码的字符串解码指令
 *
 * @param idl - IDL 对象
 * @param base58Data - base58 编码的指令数据
 * @returns 解码结果或 null
 */
export function decodeInstructionFromBase58(
  idl: any,
  base58Data: string
): { instructionName: string; data: any } | null {
  try {
    const instructionData = Buffer.from(bs58.decode(base58Data));
    return decodeInstruction(idl, instructionData);
  } catch (error) {
    console.error("从 base58 解码失败:", error);
    return null;
  }
}

/**
 * 检查指令是否匹配指定的名称
 *
 * @param idl - IDL 对象
 * @param instructionData - 指令数据
 * @param expectedName - 期望的指令名称（snake_case）
 * @returns boolean
 */
export function isInstructionType(
  idl: any,
  instructionData: Buffer,
  expectedName: string
): boolean {
  const decoded = decodeInstruction(idl, instructionData);
  return decoded?.instructionName === expectedName;
}

/**
 * 编码指令数据（用于测试）
 *
 * @param idl - IDL 对象
 * @param instructionName - 指令名称（camelCase）
 * @param args - 指令参数
 * @returns Buffer
 */
export function encodeInstruction(
  idl: any,
  instructionName: string,
  args: any
): Buffer {
  const coder = new BorshInstructionCoder(idl);
  return coder.encode(instructionName, args);
}

/**
 * 批量解码多个指令
 *
 * @param idl - IDL 对象
 * @param instructions - 指令数据数组
 * @returns 解码结果数组
 */
export function decodeInstructions(
  idl: any,
  instructions: Buffer[]
): Array<{ instructionName: string; data: any } | null> {
  return instructions.map(ix => decodeInstruction(idl, ix));
}
