import { useMemo } from 'react'
import { useConnection, useAnchorWallet } from '@solana/wallet-adapter-react'
import { AnchorProvider, Program } from '@coral-xyz/anchor'
import { FAVORITES_IDL, type Favorites } from './favorites'

/**
 * 自定义 Hook: 用于创建 Favorites 程序实例
 * 复用 AnchorProvider 和 Program 的创建逻辑
 */
export function useFavoritesProgram() {
  const { connection } = useConnection()
  const anchorWallet = useAnchorWallet()
  
  return useMemo(() => {
    if (!anchorWallet) {
      return null
    }
    
    try {
      // 创建 AnchorProvider
      const provider = new AnchorProvider(connection, anchorWallet, {
        commitment: 'confirmed',
      })
      
      // 创建 Program 实例
      const program = new Program<Favorites>(FAVORITES_IDL as Favorites, provider)
      
      return { provider, program }
    } catch (error) {
      console.error('创建 Favorites 程序失败:', error)
      return null
    }
  }, [connection, anchorWallet])
} 