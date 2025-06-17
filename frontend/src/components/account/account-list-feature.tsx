'use client'

import { WalletMultiButton } from '../solana/solana-provider'
import { redirect } from 'next/navigation'
import { useWallet } from '@solana/wallet-adapter-react'

export default function AccountListFeature() {
  const { publicKey } = useWallet()

  if (publicKey) {
    return redirect(`/account/${publicKey.toString()}`)
  }

  return (
    <div className="hero py-[64px]">
      <div className="hero-content text-center">
        <WalletMultiButton />
      </div>
    </div>
  )
}
