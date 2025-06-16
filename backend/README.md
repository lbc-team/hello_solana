# Solana Backend Script

本项目为 TypeScript 后端脚本，主要用于与 Solana Anchor 智能合约（如 anchor_favorites）进行交互。

## 主要功能
- 通过 @coral-xyz/anchor 和 @solana/web3.js 与 Solana 区块链通信
- 支持调用合约方法（如 set_favorites）、查询账户等

## 使用方法
1. 安装依赖：`pnpm install`
2. 运行脚本：`pnpm start`

请根据实际需求在 src/ 目录下编写交互逻辑。 