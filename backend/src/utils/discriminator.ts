/**
 * Discriminator 工具模块
 *
 * Anchor 中的 discriminator 是指令或账户类型的唯一标识符（8字节）
 * 用于区分不同的指令和账户类型
 */

import { BorshInstructionCoder, BorshAccountsCoder } from "@coral-xyz/anchor";

/**
 * 方式 1: 从 IDL JSON 中获取指令的 discriminator
 *
 * 优点：
 * - 简单直接，不需要额外计算
 * - IDL 已经包含了正确的 discriminator
 * - 性能最好
 *
 * @param idl - IDL JSON 对象
 * @param instructionName - 指令名称（snake_case，如 "set_favorites"）
 * @returns discriminator Buffer
 */
export function getInstructionDiscriminatorFromIdl(
  idl: any,
  instructionName: string
): Buffer {
  const instruction = idl.instructions.find((ix: any) => ix.name === instructionName);

  if (!instruction || !instruction.discriminator) {
    throw new Error(`指令 ${instructionName} 未找到或没有 discriminator`);
  }

  return Buffer.from(instruction.discriminator);
}

/**
 * 方式 2: 从 IDL JSON 中获取账户的 discriminator
 *
 * @param idl - IDL JSON 对象
 * @param accountName - 账户名称（如 "Favorites"）
 * @returns discriminator Buffer
 */
export function getAccountDiscriminatorFromIdl(
  idl: any,
  accountName: string
): Buffer {
  const account = idl.accounts?.find((acc: any) => acc.name === accountName);

  if (!account || !account.discriminator) {
    throw new Error(`账户 ${accountName} 未找到或没有 discriminator`);
  }

  return Buffer.from(account.discriminator);
}

/**
 * 方式 3: 使用 Anchor 的 BorshInstructionCoder
 *
 * 优点：
 * - 使用 Anchor 官方方法
 * - 可以动态生成（不依赖 IDL 中的 discriminator 字段）
 *
 * 缺点：
 * - 需要提供完整的参数类型
 * - 性能稍差（需要编码整个指令）
 *
 * @param idl - IDL 对象（需要类型化）
 * @param instructionName - 指令名称（camelCase，如 "setFavorites"）
 * @param args - 指令参数（可以传空对象，只需要 discriminator）
 * @returns discriminator Buffer
 */
export function getInstructionDiscriminatorFromCoder(
  idl: any,
  instructionName: string,
  args: any = {}
): Buffer {
  const coder = new BorshInstructionCoder(idl);

  try {
    // 编码指令（可能会失败，如果参数不完整）
    const encoded = coder.encode(instructionName, args);
    // 前 8 字节就是 discriminator
    return encoded.slice(0, 8);
  } catch (error) {
    throw new Error(
      `无法从 Coder 获取 discriminator: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * 方式 4: 使用 Anchor 的 BorshAccountsCoder
 *
 * @param idl - IDL 对象（需要类型化）
 * @param accountName - 账户名称（camelCase，如 "favorites"）
 * @returns discriminator Buffer
 */
export function getAccountDiscriminatorFromCoder(
  idl: any,
  accountName: string
): Buffer {
  const coder = new BorshAccountsCoder(idl);

  // 使用内部方法获取 discriminator
  // @ts-ignore - accountLayouts 是内部属性
  const layout = coder.accountLayouts?.get(accountName);

  if (!layout) {
    throw new Error(`账户 ${accountName} 未找到`);
  }

  // Anchor 使用 SHA256("account:<AccountName>") 的前 8 字节
  // 但 Coder 已经有了，我们直接从 IDL 读取更简单
  throw new Error("建议使用 getAccountDiscriminatorFromIdl 方法");
}

/**
 * 比较两个 discriminator 是否相等
 */
export function compareDiscriminator(a: Buffer, b: Buffer): boolean {
  return a.equals(b);
}

/**
 * 格式化 discriminator 为可读字符串
 */
export function formatDiscriminator(discriminator: Buffer): string {
  return `[${Array.from(discriminator).join(", ")}]`;
}

/**
 * 从交易数据中提取 discriminator
 */
export function extractDiscriminator(data: Buffer): Buffer {
  if (data.length < 8) {
    throw new Error("数据长度不足 8 字节");
  }
  return data.slice(0, 8);
}

/**
 * 示例：批量获取所有指令的 discriminator
 */
export function getAllInstructionDiscriminators(idl: any): Map<string, Buffer> {
  const discriminators = new Map<string, Buffer>();

  if (idl.instructions) {
    for (const instruction of idl.instructions) {
      if (instruction.discriminator) {
        discriminators.set(
          instruction.name,
          Buffer.from(instruction.discriminator)
        );
      }
    }
  }

  return discriminators;
}

/**
 * 示例：批量获取所有账户的 discriminator
 */
export function getAllAccountDiscriminators(idl: any): Map<string, Buffer> {
  const discriminators = new Map<string, Buffer>();

  if (idl.accounts) {
    for (const account of idl.accounts) {
      if (account.discriminator) {
        discriminators.set(
          account.name,
          Buffer.from(account.discriminator)
        );
      }
    }
  }

  return discriminators;
}
