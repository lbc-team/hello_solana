# Solana DApp Frontend

这是一个基于 [Next.js 15](https://nextjs.org) 构建的 Solana 去中心化应用（DApp）前端，集成了标准的 Solana 钱包适配器生态系统。

## 功能特性

### 🔗 Solana 钱包适配器集成

本项目使用了官方的 `@solana/wallet-adapter-react` 生态系统，提供完整的钱包连接和管理功能：

#### 核心组件架构
```typescript
<ConnectionProvider endpoint={endpoint}>      // RPC连接管理
  <WalletProvider wallets={wallets}>         // 钱包适配器管理
    <WalletModalProvider>                     // 钱包选择UI
      <App />
    </WalletModalProvider>
  </WalletProvider>
</ConnectionProvider>
```

#### 支持的钱包
- **Phantom Wallet** - 最流行的Solana浏览器钱包
- **Solflare Wallet** - 功能丰富的多平台钱包
- **可扩展架构** - 轻松添加更多钱包适配器

#### 网络支持
- **本地网络** (`localhost:8899`) - 开发和测试
- **Devnet** - Solana测试网络
- **Mainnet Beta** - Solana主网

### 🎨 用户界面特性

#### 钱包连接对话框
- **居中显示** - 现代化的模态框设计
- **毛玻璃背景** - 优雅的视觉效果
- **主题适配** - 自动适配深色/浅色主题
- **响应式设计** - 适配各种设备屏幕
- **平滑动画** - 淡入淡出和悬停效果

#### 主要UI组件
- `WalletMultiButton` - 智能钱包连接按钮
- `WalletDisconnectButton` - 断开连接按钮
- `NetworkSwitcher` - 网络切换组件

### 🔧 核心Hooks

#### 钱包相关
```typescript
import { useConnection, useWallet, useAnchorWallet } from '@solana/wallet-adapter-react'

const { connection } = useConnection()        // RPC连接实例
const { wallet, connect, disconnect } = useWallet()  // 钱包状态管理
const anchorWallet = useAnchorWallet()       // Anchor程序钱包
```

#### 数据查询
- `useGetBalance` - 查询账户SOL余额
- `useGetTokenAccounts` - 查询代币账户
- `useGetSignatures` - 查询交易历史

#### 交易操作
- `useTransferSol` - SOL转账功能
- `useRequestAirdrop` - 测试网空投

### 🛠 技术栈

- **Next.js 15** - React框架，支持App Router
- **TypeScript** - 类型安全的JavaScript
- **Tailwind CSS** - 实用优先的CSS框架
- **Solana Web3.js** - Solana区块链交互
- **Wallet Adapter** - 官方钱包适配器生态
- **TanStack Query** - 数据获取和缓存
- **Sonner** - 优雅的通知组件

## 快速开始

### 安装依赖
```bash
npm install
# 或
pnpm install
```

### 启动开发服务器
```bash
npm run dev
# 或
pnpm dev
```

在浏览器中打开 [http://localhost:3000](http://localhost:3000) 查看应用。

### 钱包连接流程

1. **安装钱包**：确保浏览器已安装 Phantom 或 Solflare 钱包扩展
2. **选择网络**：使用右上角的网络切换器选择目标网络
3. **连接钱包**：点击"选择钱包"按钮，在弹出的对话框中选择钱包
4. **授权连接**：在钱包扩展中确认连接请求
5. **开始使用**：连接成功后即可进行各种区块链操作

## 代码结构

```
src/
├── components/
│   ├── solana/
│   │   └── solana-provider.tsx     # Solana钱包提供者
│   ├── account/                    # 账户相关组件
│   ├── favorites/                  # 收藏夹功能
│   └── ui/                        # 通用UI组件
├── lib/
│   ├── favorites.ts               # 收藏夹智能合约交互
│   └── utils.ts                   # 工具函数
└── app/
    ├── globals.css                # 全局样式（包含钱包适配器样式）
    ├── layout.tsx                 # 根布局
    └── page.tsx                   # 主页面
```

## 钱包适配器配置

### 基础配置
```typescript
// 配置支持的钱包
const wallets = useMemo(() => [
  new PhantomWalletAdapter(),
  new SolflareWalletAdapter()
], [])

// 网络端点配置
const endpoint = useMemo(() => {
  const savedNetwork = localStorage.getItem('solana-network')
  switch(savedNetwork) {
    case 'localhost': return 'http://localhost:8899'
    case 'devnet': return clusterApiUrl(WalletAdapterNetwork.Devnet)
    case 'mainnet-beta': return clusterApiUrl(WalletAdapterNetwork.Mainnet)
    default: return 'http://localhost:8899'
  }
}, [])
```
 


## 学习资源

### Solana开发
- [Solana文档](https://docs.solana.com/) - 官方开发文档
- [Solana Cookbook](https://solanacookbook.com/) - 开发实用指南
- [Anchor框架](https://www.anchor-lang.com/) - Solana程序开发框架

### 钱包适配器
- [Wallet Adapter文档](https://github.com/solana-labs/wallet-adapter) - 官方钱包适配器
- [示例项目](https://github.com/solana-labs/wallet-adapter/tree/master/packages/starter/react-ui-starter) - 官方示例

 

