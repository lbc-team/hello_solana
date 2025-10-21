# Solana Backend Script

本项目为 TypeScript 后端脚本，主要用于与 Solana Anchor 智能合约（如 anchor_favorites）进行交互。

目录 idl 及 types 从anchor 工程复制过来的

## 主要功能
- 通过 @coral-xyz/anchor 和 @solana/web3.js 与 Solana 区块链通信
- 支持调用合约方法（如 set_favorites）、查询账户等

## 使用方法

1. 安装依赖：`pnpm install` （node 版本为 v22）
   
2. 运行脚本：
   * `pnpm dev` : 与Favorites 交互，获取相关账户数据
   * `pnpm listen` : 监听程序的变化，若数据更新快，需要推入到消息队列
   * `pnpm scan_favorites`: 扫描所有调用 set_favorites 的交易， 启动后，再次运行 `pnpm dev`

