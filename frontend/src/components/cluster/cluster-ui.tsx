'use client'

import { useQuery } from '@tanstack/react-query'
import * as React from 'react'
import { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { AppAlert } from '@/components/app-alert'
import { useConnection } from '@solana/wallet-adapter-react'

export function getExplorerUrl(path: string, network: string = 'localhost') {
  const networkParam = network === 'localhost' ? 'custom&customUrl=http%3A%2F%2Flocalhost%3A8899' : network
  return `https://explorer.solana.com/${path}?cluster=${networkParam}`
}

export function ExplorerLink({
  className,
  label = '',
  address,
  transaction,
  block,
}: {
  className?: string
  label: string
  address?: string
  transaction?: string
  block?: string
}) {
  const { connection } = useConnection()
  
  // 获取网络信息
  const getNetworkName = () => {
    const endpoint = connection.rpcEndpoint
    if (endpoint.includes('localhost') || endpoint.includes('127.0.0.1')) {
      return 'localhost'
    } else if (endpoint.includes('devnet')) {
      return 'devnet'
    } else if (endpoint.includes('mainnet')) {
      return 'mainnet-beta'
    }
    return 'localhost'
  }

  const network = getNetworkName()
  
  let path = ''
  if (address) path = `address/${address}`
  else if (transaction) path = `tx/${transaction}`
  else if (block) path = `block/${block}`

  return (
    <a
      href={getExplorerUrl(path, network)}
      target="_blank"
      rel="noopener noreferrer"
      className={className ? className : `link font-mono`}
    >
      {label}
    </a>
  )
}

export function ClusterChecker({ children }: { children: ReactNode }) {
  const { connection } = useConnection()

  // 获取网络信息
  const getNetworkInfo = () => {
    const endpoint = connection.rpcEndpoint
    let networkName = '未知网络'
    
    if (endpoint.includes('localhost') || endpoint.includes('127.0.0.1')) {
      networkName = '本地测试网'
    } else if (endpoint.includes('devnet')) {
      networkName = '开发测试网'
    } else if (endpoint.includes('mainnet')) {
      networkName = '主网'
    }
    
    return { endpoint, networkName }
  }

  const networkInfo = getNetworkInfo()

  const query = useQuery({
    queryKey: ['version', { endpoint: networkInfo.endpoint }],
    queryFn: () => connection.getVersion(),
    retry: 1,
  })

  if (query.isLoading) {
    return null
  }
  
  if (query.isError || !query.data) {
    return (
      <AppAlert
        action={
          <Button variant="outline" onClick={() => query.refetch()}>
            刷新
          </Button>
        }
      >
        连接到集群失败 <span className="font-bold">{networkInfo.networkName}</span>
        <br />
        <span className="text-sm text-gray-500">{networkInfo.endpoint}</span>
      </AppAlert>
    )
  }
  
  return children
}
