'use client'

import { RefreshCw } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { ExplorerLink } from '../cluster/cluster-ui'
import {
  useGetBalance,
  useGetSignatures,
  useGetTokenAccounts,
  useRequestAirdrop,
  useTransferSol,
} from './account-data-access'
import { ellipsify } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { AppAlert } from '@/components/app-alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AppModal } from '@/components/app-modal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
// 自定义类型和工具函数替代 gill
type Address = string
type Lamports = number

const lamportsToSol = (lamports: number) => (lamports / 1_000_000_000).toFixed(9)
const address = (addressString: string) => addressString
import { ErrorBoundary } from 'next/dist/client/components/error-boundary'
import { PublicKey } from '@solana/web3.js'

export function AccountBalance({ address }: { address: Address }) {
  const query = useGetBalance({ address })

  return (
    <h1 className="text-5xl font-bold cursor-pointer" onClick={() => query.refetch()}>
      {query.data ? <BalanceSol balance={query.data} /> : '...'} SOL
    </h1>
  )
}

export function AccountChecker() {
  const { publicKey } = useWallet()
  if (!publicKey) {
    return null
  }
  return <AccountBalanceCheck address={address(publicKey.toString())} />
}

export function AccountBalanceCheck({ address }: { address: Address }) {
  const { connection } = useConnection()
  const mutation = useRequestAirdrop({ address })
  const query = useGetBalance({ address })

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

  if (query.isLoading) {
    return null
  }
  if (query.isError || !query.data) {
    return (
      <AppAlert
        action={
          <Button variant="outline" onClick={() => mutation.mutateAsync(1).catch((err) => console.log(err))}>
            申请空投
          </Button>
        }
      >
        您已连接到 <strong>{networkInfo.networkName}</strong>，但在此集群上找不到您的账户。
      </AppAlert>
    )
  }
  return null
}

export function AccountButtons({ address }: { address: Address }) {
  const { connection } = useConnection()
  const { publicKey } = useWallet()
  
  // 获取网络信息  
  const getNetworkInfo = () => {
    const endpoint = connection.rpcEndpoint
    return endpoint.includes('mainnet')
  }

  const isMainnet = getNetworkInfo()

  return (
    <div>
      <div className="space-x-2">
        {isMainnet ? null : <ModalAirdrop address={address} />}
        <ErrorBoundary errorComponent={() => null}>
          {publicKey ? <ModalSend address={address} publicKey={publicKey} /> : null}
        </ErrorBoundary>
        <ModalReceive address={address} />
      </div>
    </div>
  )
}

export function AccountTokens({ address }: { address: Address }) {
  const [showAll, setShowAll] = useState(false)
  const query = useGetTokenAccounts({ address })
  const client = useQueryClient()
  const items = useMemo(() => {
    if (showAll) return query.data
    return query.data?.slice(0, 5)
  }, [query.data, showAll])

  return (
    <div className="space-y-2">
      <div className="justify-between">
        <div className="flex justify-between">
          <h2 className="text-2xl font-bold">代币账户</h2>
          <div className="space-x-2">
            {query.isLoading ? (
              <span className="loading loading-spinner"></span>
            ) : (
              <Button
                variant="outline"
                onClick={async () => {
                  await query.refetch()
                  await client.invalidateQueries({
                    queryKey: ['getTokenAccountBalance'],
                  })
                }}
              >
                <RefreshCw size={16} />
              </Button>
            )}
          </div>
        </div>
      </div>
      {query.isError && <pre className="alert alert-error">错误: {query.error?.message.toString()}</pre>}
      {query.isSuccess && (
        <div>
          {query.data.length === 0 ? (
            <div>未找到代币账户。</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>公钥</TableHead>
                  <TableHead>铸币厂</TableHead>
                  <TableHead className="text-right">余额</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items?.map(({ account, pubkey }) => (
                  <TableRow key={pubkey.toString()}>
                    <TableCell>
                      <div className="flex space-x-2">
                        <span className="font-mono">
                          <ExplorerLink label={ellipsify(pubkey.toString())} address={pubkey.toString()} />
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <span className="font-mono">
                          <ExplorerLink
                            label={ellipsify(account.data.parsed.info.mint)}
                            address={account.data.parsed.info.mint.toString()}
                          />
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-mono">{account.data.parsed.info.tokenAmount.uiAmount}</span>
                    </TableCell>
                  </TableRow>
                ))}

                {(query.data?.length ?? 0) > 5 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">
                      <Button variant="outline" onClick={() => setShowAll(!showAll)}>
                        {showAll ? '显示更少' : '显示全部'}
                      </Button>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      )}
    </div>
  )
}

export function AccountTransactions({ address }: { address: Address }) {
  const query = useGetSignatures({ address })
  const [showAll, setShowAll] = useState(false)

  const items = useMemo(() => {
    if (showAll) return query.data
    return query.data?.slice(0, 5)
  }, [query.data, showAll])

  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <h2 className="text-2xl font-bold">交易历史</h2>
        <div className="space-x-2">
          {query.isLoading ? (
            <span className="loading loading-spinner"></span>
          ) : (
            <Button variant="outline" onClick={() => query.refetch()}>
              <RefreshCw size={16} />
            </Button>
          )}
        </div>
      </div>
      {query.isError && <pre className="alert alert-error">错误: {query.error?.message.toString()}</pre>}
      {query.isSuccess && (
        <div>
          {query.data.length === 0 ? (
            <div>未找到交易。</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>签名</TableHead>
                  <TableHead className="text-right">槽位</TableHead>
                  <TableHead>区块时间</TableHead>
                  <TableHead className="text-right">状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items?.map((item) => (
                  <TableRow key={item.signature}>
                    <TableHead className="font-mono">
                      <ExplorerLink transaction={item.signature} label={ellipsify(item.signature, 8)} />
                    </TableHead>
                    <TableCell className="font-mono text-right">
                      <ExplorerLink block={item.slot.toString()} label={item.slot.toString()} />
                    </TableCell>
                    <TableCell>{new Date((Number(item.blockTime) ?? 0) * 1000).toISOString()}</TableCell>
                    <TableCell className="text-right">
                      {item.err ? (
                        <span className="text-red-500" title={item.err.toString()}>
                          失败
                        </span>
                      ) : (
                        <span className="text-green-500">成功</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {(query.data?.length ?? 0) > 5 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">
                      <Button variant="outline" onClick={() => setShowAll(!showAll)}>
                        {showAll ? '显示更少' : '显示全部'}
                      </Button>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      )}
    </div>
  )
}

function BalanceSol({ balance }: { balance: Lamports }) {
  return <span>{lamportsToSol(balance)}</span>
}

function ModalReceive({ address }: { address: Address }) {
  return (
    <AppModal title="接收">
      <p>通过将资产发送到您的公钥来接收资产：</p>
      <code>{address.toString()}</code>
    </AppModal>
  )
}

function ModalAirdrop({ address }: { address: Address }) {
  const mutation = useRequestAirdrop({ address })
  const [amount, setAmount] = useState('2')

  return (
    <AppModal
      title="申请空投"
      submitDisabled={!amount || mutation.isPending}
      submitLabel="申请空投"
      submit={() => mutation.mutateAsync(parseFloat(amount))}
    >
      <Label htmlFor="amount">数量</Label>
      <Input
        disabled={mutation.isPending}
        id="amount"
        min="1"
        onChange={(e) => setAmount(e.target.value)}
        placeholder="数量"
        step="any"
        type="number"
        value={amount}
      />
    </AppModal>
  )
}

function ModalSend(props: { address: Address; publicKey: PublicKey }) {
  const mutation = useTransferSol({ address: props.address, publicKey: props.publicKey })
  const [destination, setDestination] = useState('')
  const [amount, setAmount] = useState('1')

  if (!props.address || !props.publicKey) {
    return <div>钱包未连接</div>
  }

  return (
    <AppModal
      title="发送"
      submitDisabled={!destination || !amount || mutation.isPending}
      submitLabel="发送"
      submit={() => {
        mutation.mutateAsync({
          destination: address(destination),
          amount: parseFloat(amount),
        })
      }}
    >
      <Label htmlFor="destination">目标地址</Label>
      <Input
        disabled={mutation.isPending}
        id="destination"
        onChange={(e) => setDestination(e.target.value)}
        placeholder="目标地址"
        type="text"
        value={destination}
      />
      <Label htmlFor="amount">数量</Label>
      <Input
        disabled={mutation.isPending}
        id="amount"
        min="1"
        onChange={(e) => setAmount(e.target.value)}
        placeholder="数量"
        step="any"
        type="number"
        value={amount}
      />
    </AppModal>
  )
}
