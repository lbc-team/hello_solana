# 常用的 RPC 方法列表

参考： https://solana.com/zh/docs/rpc/http

Solana web3.js api: https://github.com/solana-foundation/solana-web3.js


solana-kit(Solana web3.js v2) api: https://solana-kit-docs.vercel.app/api
solana-kit 所有的函数都在 gill 中导出了，并提供一个附加方法



## 账户相关
getAccountInfo() - 获取账户信息
getBalance() - 获取 SOL 余额
getTokenAccountBalance() - 获取 Token 余额
getTokenAccountsByOwner() - 获取用户的 Token 账户

## Token 相关
getTokenSupply() - 获取 Token 总发行量
getTokenLargestAccounts() - 获取 Token 最大持有者

## 交易相关
sendTransaction() - 发送交易
getTransaction() - 获取交易详情
getSignatureStatus() - 获取交易状态
confirmTransaction() - 确认交易

## 区块链信息
getLatestBlockhash() - 获取最新区块哈希
getSlot() - 获取当前 slot
getBlockHeight() - 获取区块高度
getEpochInfo() - 获取 epoch 信息

## 程序相关
getProgramAccounts() - 获取程序账户
getMultipleAccounts() - 批量获取账户