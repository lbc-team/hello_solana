This is a [Next.js](https://nextjs.org) project bootstrapped with [
`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions
are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use
the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme)
from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for
more details.

## 模块说明

项目基于 create-solana-dapp 脚手架，@/src 目录下，包含了 Solana 区块链和钱包相关的模块，
这些模块共同实现了 Solana 钱包的连接、账户信息获取与展示、网络切换、交易通知等功能，提升了 DApp 的开发效率和用户体验，说明如下：

### 1. components/solana/solana-provider.tsx
- 负责初始化 Solana 链接、管理网络（如 devnet、testnet、mainnet），并为全局 React 组件树提供 Solana 相关的上下文。
- 集成常用钱包适配器（如 Phantom、Solflare），支持钱包连接、获取公钥、签名交易等。

### 2. components/account/
- account-data-access.tsx：封装与 Solana 账户相关的数据获取和管理逻辑，如查询账户余额、账户信息等。
- account-detail-feature.tsx：展示单个账户的详细信息。
- account-list-feature.tsx：展示账户列表。
- account-ui.tsx：账户相关的 UI 组件。

### 3. components/cluster/cluster-ui.tsx
- 提供选择 Solana 网络集群（如 devnet、testnet、mainnet）的 UI 组件，支持网络环境切换。

### 4. components/use-transaction-toast.tsx
- 处理 Solana 交易相关的通知（toast），如交易发送、确认、失败等状态提示。

### 5. components/app-providers.tsx
- 全局 Provider 入口，统一包裹 solana-provider 等，确保全局都能访问到 Solana 钱包和链上交互的上下文。

### 6. lib/utils.ts
- 包含与 Solana 钱包、地址、金额格式化等相关的工具函数。

### 7. app/account/
- [address]/page.tsx：展示指定钱包地址的账户详情。
- page.tsx：账户相关主页面，展示当前连接的钱包信息或账户列表。

### 8. app/layout.tsx
- 全局布局，通常在此引入 app-providers.tsx，确保页面都能访问到 Solana 钱包上下文。


