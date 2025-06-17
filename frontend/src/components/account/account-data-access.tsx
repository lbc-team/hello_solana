'use client'

import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js'


type Address = string
import { toast } from 'sonner'
import { useTransactionToast } from '../use-transaction-toast'

export function useGetBalance({ address }: { address: Address }) {
  const { connection } = useConnection()

  return useQuery({
    queryKey: ['get-balance', { endpoint: connection.rpcEndpoint, address }],
    queryFn: () => connection.getBalance(new PublicKey(address.toString())),
  })
}

export function useGetSignatures({ address }: { address: Address }) {
  const { connection } = useConnection()

  return useQuery({
    queryKey: ['get-signatures', { endpoint: connection.rpcEndpoint, address }],
    queryFn: () => connection.getSignaturesForAddress(new PublicKey(address)),
  })
}

export function useGetTokenAccounts({ address }: { address: Address }) {
  const { connection } = useConnection()

  return useQuery({
    queryKey: ['get-token-accounts', { endpoint: connection.rpcEndpoint, address }],
    queryFn: async () =>
      Promise.all([
        connection
          .getParsedTokenAccountsByOwner(
            new PublicKey(address.toString()),
            { programId: TOKEN_PROGRAM_ID },
            'confirmed',
          )
          .then((res) => res.value ?? []),
        connection
          .getParsedTokenAccountsByOwner(
            new PublicKey(address.toString()),
            { programId: TOKEN_2022_PROGRAM_ID },
            'confirmed',
          )
          .then((res) => res.value ?? []),
      ]).then(([tokenAccounts, token2022Accounts]) => [...tokenAccounts, ...token2022Accounts]),
  })
}

export function useTransferSol({ address, publicKey }: { address: Address; publicKey: PublicKey }) {
  const { connection } = useConnection()
  const { sendTransaction } = useWallet()
  const toastTransaction = useTransactionToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['transfer-sol', { endpoint: connection.rpcEndpoint, address }],
    mutationFn: async (input: { destination: Address; amount: number }) => {
      try {
        if (!sendTransaction) {
          throw new Error('钱包不支持发送交易')
        }

        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: new PublicKey(input.destination),
            lamports: input.amount * LAMPORTS_PER_SOL,
          })
        )

        const signature = await sendTransaction(transaction, connection)
        
        // 等待交易确认
        await connection.confirmTransaction(signature, 'confirmed')
        
        console.log('交易成功:', signature)
        return signature
      } catch (error: unknown) {
        console.log('交易失败:', error)
        throw error
      }
    },
    onSuccess: async (signature) => {
      if (signature?.length) {
        toastTransaction(signature)
      }
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['get-balance', { endpoint: connection.rpcEndpoint, address }],
        }),
        queryClient.invalidateQueries({
          queryKey: ['get-signatures', { endpoint: connection.rpcEndpoint, address }],
        }),
      ])
    },
    onError: (error) => {
      toast.error(`交易失败! ${error}`)
    },
  })
}

export function useRequestAirdrop({ address }: { address: Address }) {
  const { connection } = useConnection()
  const queryClient = useQueryClient()
  const toastTransaction = useTransactionToast()

  return useMutation({
    mutationKey: ['airdrop', { endpoint: connection.rpcEndpoint, address }],
    mutationFn: async (amount: number = 1) => {
      const signature = await connection.requestAirdrop(
        new PublicKey(address),
        amount * LAMPORTS_PER_SOL
      )
      
      // 等待空投确认
      await connection.confirmTransaction(signature, 'confirmed')
      
      return signature
    },
    onSuccess: async (signature) => {
      toastTransaction(signature)
      await Promise.all([
        queryClient.invalidateQueries({ 
          queryKey: ['get-balance', { endpoint: connection.rpcEndpoint, address }] 
        }),
        queryClient.invalidateQueries({ 
          queryKey: ['get-signatures', { endpoint: connection.rpcEndpoint, address }] 
        }),
      ])
    },
    onError: (error) => {
      toast.error(`空投失败! ${error}`)
    },
  })
}
