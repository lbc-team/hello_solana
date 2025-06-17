'use client'

import { useState, useEffect } from 'react'
import { useWalletUi, useWalletUiCluster } from '@wallet-ui/react'
import { Connection, PublicKey, SystemProgram, Transaction } from '@solana/web3.js'
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useTransactionToast } from '@/components/use-transaction-toast'
import { FAVORITES_IDL, type Favorites } from '@/lib/favorites'

// 声明 Phantom 钱包类型
declare global {
  interface Window {
    solana?: {
      signTransaction?: (transaction: Transaction) => Promise<Transaction>
      signAllTransactions?: (transactions: Transaction[]) => Promise<Transaction[]>
      isPhantom?: boolean
    }
  }
}

export function Favorites() {
  const { account } = useWalletUi()
  const { cluster } = useWalletUiCluster()
  const transactionToast = useTransactionToast()
  
  const [number, setNumber] = useState('')
  const [color, setColor] = useState('')
  const [favoriteData, setFavoriteData] = useState<{number: number, color: string} | null>(null)
  const [loading, setLoading] = useState(false)
  const [allFavorites, setAllFavorites] = useState<Array<{publicKey: string, data: {number: number, color: string}}>>([])

  // 获取连接
  const getConnection = () => {
    // 根据集群获取 RPC 端点
    let endpoint = 'http://localhost:8899' // 默认本地
    if (cluster.id.includes('devnet')) {
      endpoint = 'https://api.devnet.solana.com'
    } else if (cluster.id.includes('mainnet')) {
      endpoint = 'https://api.mainnet-beta.solana.com'
    }
    
    return new Connection(endpoint, 'confirmed')
  }

  // 计算 PDA
  const getFavoritesPDA = (userPublicKey: PublicKey) => {
    const programId = new PublicKey(FAVORITES_IDL.address)
    return PublicKey.findProgramAddressSync(
      [Buffer.from('favorites'), userPublicKey.toBuffer()],
      programId
    )[0]
  }

  const setFavorites = async () => {
    if (!account || !number || !color) {
      alert('请连接钱包并填写所有字段')
      return
    }

    setLoading(true)
    try {
      console.log('=== 开始设置 Favorites ===')
      console.log('用户地址:', account.address)
      console.log('数字:', number)
      console.log('颜色:', color)
      console.log('集群:', cluster.id)
      console.log('程序ID:', FAVORITES_IDL.address)
      
      const connection = getConnection()
      const userPublicKey = new PublicKey(account.address)
      const favoritesPDA = getFavoritesPDA(userPublicKey)
      
      console.log('计算的 PDA:', favoritesPDA.toBase58())
      
      // 检查用户余额
      const balance = await connection.getBalance(userPublicKey)
      console.log('用户余额:', balance / 1e9, 'SOL')
      
      if (balance < 0.01 * 1e9) {
        alert('余额不足，请先获取一些 SOL')
        return
      }
      
      // 检查 Phantom 钱包是否可用
      if (!window.solana || !window.solana.signTransaction) {
        alert('请安装并连接 Phantom 钱包')
        return
      }
      
      console.log('构建 Favorites 合约交易...')
      
      // 创建 Anchor 钱包适配器
      const wallet = {
        publicKey: userPublicKey,
        signTransaction: async (tx: Transaction) => {
          if (window.solana?.signTransaction) {
            return await window.solana.signTransaction(tx)
          }
          throw new Error('钱包不支持签名')
        },
        signAllTransactions: async (txs: Transaction[]) => {
          if (window.solana?.signAllTransactions) {
            return await window.solana.signAllTransactions(txs)
          }
          throw new Error('钱包不支持批量签名')
        },
      } as any // 使用 any 绕过类型检查
      
      // 创建 AnchorProvider
      const provider = new AnchorProvider(connection, wallet, {
        commitment: 'confirmed',
      })
      
      // 创建 Program 实例
      const program = new Program<Favorites>(FAVORITES_IDL as Favorites, provider)
      
      console.log('构建 setFavorites 指令...')
      console.log('PDA:', favoritesPDA.toBase58())
      
      try {
        // 构建并发送真实的 favorites 交易
        const tx = await program.methods
          .setFavorites(new BN(number), color)
          .accountsPartial({
            user: userPublicKey,
            favorites: favoritesPDA,
            systemProgram: SystemProgram.programId,
          })
          .rpc()
        
        console.log('Favorites 交易签名:', tx)
        transactionToast(tx)
        
        alert(`🎉 Favorites 设置成功!\n\n数字: ${number}\n颜色: ${color}\n交易签名: ${tx}\nPDA: ${favoritesPDA.toBase58()}`)
        
        // 刷新数据
        await fetchFavorites()
        
        // 清空输入
        setNumber('')
        setColor('')
        
      } catch (signError) {
        console.error('签名或交易错误:', signError)
        if (signError instanceof Error) {
          if (signError.message.includes('User rejected') || signError.message.includes('User denied')) {
            alert('用户取消了交易签名')
          } else if (signError.message.includes('insufficient funds')) {
            alert('余额不足，请先获取一些 SOL')
          } else {
            alert(`交易失败: ${signError.message}`)
          }
        }
        throw signError
      }
      
    } catch (error) {
      console.error('设置 favorites 失败:', error)
      if (error instanceof Error) {
        if (error.message.includes('User rejected')) {
          alert('用户取消了交易签名')
        } else {
          alert('设置 favorites 失败: ' + error.message)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchFavorites = async () => {
    if (!account) return

    try {
      console.log('=== 获取 Favorites 数据 ===')
      const connection = getConnection()
      const userPublicKey = new PublicKey(account.address)
      const favoritesPDA = getFavoritesPDA(userPublicKey)
      
      console.log('查询 PDA:', favoritesPDA.toBase58())
      
      // 创建简单的钱包适配器用于读取数据
      const wallet = {
        publicKey: userPublicKey,
        signTransaction: async () => { throw new Error('读取数据不需要签名') },
        signAllTransactions: async () => { throw new Error('读取数据不需要签名') },
      } as any
      
      const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' })
      const program = new Program<Favorites>(FAVORITES_IDL as Favorites, provider)
      
      // 使用 Anchor 程序获取账户数据
      const favoritesAccount = await program.account.favorites.fetch(favoritesPDA)
      
      console.log('找到 Favorites 账户!')
      console.log('数字:', favoritesAccount.number.toString())
      console.log('颜色:', favoritesAccount.color)
      
      setFavoriteData({
        number: favoritesAccount.number.toNumber(),
        color: favoritesAccount.color
      })
      
    } catch (error) {
      console.error('获取 favorites 失败:', error)
      // 如果账户不存在，这是正常的
      if (error instanceof Error && error.message.includes('Account does not exist')) {
        console.log('Favorites 账户不存在')
        setFavoriteData(null)
      } else {
        setFavoriteData(null)
      }
    }
  }

  const fetchAllFavorites = async () => {
    try {
      console.log('=== 获取所有 Favorites ===')
      const connection = getConnection()
      const programId = new PublicKey(FAVORITES_IDL.address)
      
      // 创建简单的钱包适配器用于读取数据
      const wallet = {
        publicKey: new PublicKey('11111111111111111111111111111111'), // 虚拟公钥
        signTransaction: async () => { throw new Error('读取数据不需要签名') },
        signAllTransactions: async () => { throw new Error('读取数据不需要签名') },
      } as any
      
      const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' })
      const program = new Program<Favorites>(FAVORITES_IDL as Favorites, provider)
      
      const accounts = await connection.getProgramAccounts(programId)
      console.log('找到', accounts.length, '个 Favorites 账户')
      
      const favorites = []
      
      for (const account of accounts) {
        try {
          // 使用 Anchor 解码账户数据
          const decodedData = program.coder.accounts.decode('favorites', account.account.data)
          favorites.push({
            publicKey: account.pubkey.toBase58(),
            data: {
              number: decodedData.number.toNumber(),
              color: decodedData.color
            }
          })
        } catch (decodeError) {
          console.warn('无法解码账户数据:', account.pubkey.toBase58(), decodeError)
        }
      }
      
      setAllFavorites(favorites)
      
    } catch (error) {
      console.error('获取所有 favorites 失败:', error)
      setAllFavorites([])
    }
  }

  // 当钱包连接时自动获取数据
  useEffect(() => {
    if (account) {
      fetchFavorites()
      fetchAllFavorites()
    } else {
      setFavoriteData(null)
      setAllFavorites([])
    }
  }, [account])

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h2 className="text-3xl font-bold text-center">Favorites 合约调用演示</h2>
      
      {!account ? (
        <div className="text-center p-8 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <p className="text-lg mb-4">请先连接钱包</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {/* 设置 Favorites */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-semibold mb-4">设置 Favorites</h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="number">数字</Label>
                <Input
                  id="number"
                  type="number"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  placeholder="输入一个数字"
                />
              </div>
              
              <div>
                <Label htmlFor="color">颜色</Label>
                <Input
                  id="color"
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="输入一个颜色"
                />
              </div>
              
              <Button 
                onClick={setFavorites} 
                disabled={loading || !number || !color}
                className="w-full"
              >
                {loading ? '设置中...' : '设置 Favorites'}
              </Button>
            </div>
          </div>

          {/* 当前 Favorites */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-semibold mb-4">我的 Favorites</h3>
            
            {favoriteData ? (
              <div className="space-y-2">
                <p><strong>数字:</strong> {favoriteData.number}</p>
                <p><strong>颜色:</strong> {favoriteData.color}</p>
              </div>
            ) : (
              <p className="text-gray-500">暂无数据</p>
            )}
            
            <Button 
              onClick={fetchFavorites} 
              variant="outline" 
              className="mt-4 w-full"
            >
              刷新我的数据
            </Button>
          </div>
        </div>
      )}

      {/* 所有 Favorites */}
      {account && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">所有 Favorites ({allFavorites.length})</h3>
            <Button onClick={fetchAllFavorites} variant="outline" size="sm">
              刷新全部
            </Button>
          </div>
          
          {allFavorites.length > 0 ? (
            <div className="grid gap-3">
              {allFavorites.map((fav, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">
                    账户: {fav.publicKey.slice(0, 8)}...{fav.publicKey.slice(-8)}
                  </p>
                  <p><strong>数字:</strong> {fav.data.number} | <strong>颜色:</strong> {fav.data.color}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">暂无数据</p>
          )}
        </div>
      )}

      {/* 调试信息 */}
      {account && (
        <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4">
          <h4 className="font-semibold mb-2">调试信息</h4>
          <div className="text-sm space-y-1">
            <p><strong>钱包地址:</strong> {account.address}</p>
            <p><strong>集群:</strong> {cluster.id}</p>
            <p><strong>程序ID:</strong> {FAVORITES_IDL.address}</p>
            <p><strong>PDA:</strong> {account.address ? getFavoritesPDA(new PublicKey(account.address)).toBase58() : 'N/A'}</p>
          </div>
        </div>
      )}
    </div>
  )
} 