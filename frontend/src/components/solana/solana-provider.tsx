'use client'

import dynamic from 'next/dynamic'
import { ReactNode, useMemo } from 'react'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import { 
  PhantomWalletAdapter,
  SolflareWalletAdapter
} from '@solana/wallet-adapter-wallets'
import { clusterApiUrl } from '@solana/web3.js'

// 导入钱包适配器默认样式
import '@solana/wallet-adapter-react-ui/styles.css'

// 动态导入钱包组件
export const WalletMultiButton = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
)

export const WalletDisconnectButton = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletDisconnectButton,
  { ssr: false }
)

export function SolanaProvider({ children }: { children: ReactNode }) {
  // 你也可以提供自定义 RPC 端点
  const endpoint = useMemo(() => {
    if (typeof window !== 'undefined') {
      // 客户端环境下，可以使用 localStorage 或其他方式来切换网络
      const savedNetwork = localStorage.getItem('solana-network')
      if (savedNetwork === 'localhost') {
        return 'http://localhost:8899'
      }
      if (savedNetwork === 'devnet') {
        return clusterApiUrl(WalletAdapterNetwork.Devnet)
      }
      if (savedNetwork === 'mainnet-beta') {
        return clusterApiUrl(WalletAdapterNetwork.Mainnet)
      }
    }
    // 默认使用本地网络
    return 'http://localhost:8899'
  }, [])

  // 配置钱包适配器
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter()
    ],
    []
  )

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}

// 网络切换器组件
export function NetworkSwitcher() {
  const handleNetworkChange = (network: string) => {
    localStorage.setItem('solana-network', network)
    window.location.reload() // 简单的重新加载来应用新网络
  }

  return (
    <div className="flex gap-2">
      <button 
        onClick={() => handleNetworkChange('localhost')}
        className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        本地
      </button>
      <button 
        onClick={() => handleNetworkChange('devnet')}
        className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
      >
        测试网
      </button>
      <button 
        onClick={() => handleNetworkChange('mainnet-beta')}
        className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
      >
        主网
      </button>
    </div>
  )
}
