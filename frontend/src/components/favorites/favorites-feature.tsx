'use client'

import { useState, useEffect } from 'react'
import { useWalletUi, useWalletUiCluster } from '@wallet-ui/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FAVORITES_IDL } from '@/lib/favorites'

export function FavoritesFeature() {
  const { account } = useWalletUi()
  const { cluster } = useWalletUiCluster()
  
  const [number, setNumber] = useState('')
  const [color, setColor] = useState('')
  const [favoriteData, setFavoriteData] = useState<{number: number, color: string} | null>(null)
  const [loading, setLoading] = useState(false)

  const setFavorites = async () => {
    if (!account || !number || !color) {
      alert('请连接钱包并填写所有字段')
      return
    }

    setLoading(true)
    try {
      // 这里需要实现使用 gill 库的 Solana 程序调用
      // 由于 gill 库与 Anchor 的集成比较复杂，这里提供一个基础框架
      
      console.log('准备设置 favorites:', {
        programId: FAVORITES_IDL.address,
        user: account.address,
        number,
        color,
        cluster: cluster.id
      })
      
      // TODO: 实现实际的交易构建和发送逻辑
      alert(`Favorites 设置请求:\n数字: ${number}\n颜色: ${color}\n\n功能正在开发中...`)
      
      // 模拟成功后清空输入
      setNumber('')
      setColor('')
      
      // 模拟设置成功的数据
      setFavoriteData({
        number: parseInt(number),
        color: color
      })
      
    } catch (error) {
      console.error('设置 favorites 失败:', error)
      alert('设置 favorites 失败: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const fetchFavorites = async () => {
    if (!account) return

    try {
      // 这里需要实现使用 gill 库的账户数据获取
      console.log('获取 favorites 数据:', {
        programId: FAVORITES_IDL.address,
        user: account.address,
        cluster: cluster.id
      })
      
      // TODO: 实现实际的账户数据获取逻辑
      // 模拟暂时没有数据
      setFavoriteData(null)
      
    } catch (error) {
      console.error('获取 favorites 失败:', error)
      setFavoriteData(null)
    }
  }

  // 当钱包连接时自动获取数据
  useEffect(() => {
    if (account) {
      fetchFavorites()
    } else {
      setFavoriteData(null)
    }
  }, [account])

  return (
    <div className="max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-center">我的 Favorites</h2>
      
      {!account ? (
        <div className="text-center">
          <p className="mb-4">请先连接钱包</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* 当前 favorites 显示 */}
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">当前 Favorites:</h3>
            {favoriteData ? (
              <div>
                <p><strong>数字:</strong> {favoriteData.number}</p>
                <p><strong>颜色:</strong> {favoriteData.color}</p>
              </div>
            ) : (
              <p className="text-gray-500">暂无数据</p>
            )}
            <Button 
              onClick={fetchFavorites} 
              variant="outline" 
              size="sm" 
              className="mt-2"
            >
              刷新
            </Button>
          </div>

          {/* 设置 favorites 表单 */}
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
      )}
    </div>
  )
}