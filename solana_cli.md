

solana-keygen new --outfile 命令生成新的密钥对，后跟存储密钥对的文件路径。

```
solana-keygen new --outfile <FILE_PATH>
solana-keygen new -o my.json

# 靓号
solana-keygen grind --starts-with tiny:1

```

查看地址：
```
solana address
solana address -k ~/.config/solana/second_id.json
solana address -k my.json
```

查看网络与账号：

```
# DEVNET_RPC

solana config get

solana config set --url devnet 
solana config set --url $DEVNET_RPC
solana config set --url localhost 
solana config set  --url mainnet-beta
```




查看余额：
```
solana balance
solana balance <ACCOUNT_ADDRESS> --url https://api.devnet.solana.com
solana balance -k my.json
```


水龙头： https://faucet.solana.com/
```
solana airdrop 5
solana airdrop 1 <RECIPIENT_ACCOUNT_ADDRESS> --url https://api.devnet.solana.com
```

发送 Token：

```
solana transfer --from <KEYPAIR> <RECIPIENT_ACCOUNT_ADDRESS> <AMOUNT> --fee-payer <KEYPAIR>

solana transfer --from ~/.config/solana/id.json 8gwAbvN8t7n7PoTqWhuqPJ7s4Vgov1YNPByMBJavgHJt 1 --fee-payer ~/.config/solana/id.json 
--allow-unfunded-recipient
```