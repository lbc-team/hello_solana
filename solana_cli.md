

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
solana config set --url mainnet-beta
```

devnet 可使用 https://www.helius.dev/ 节点服务

https://devnet.helius-rpc.com/?api-key=4114aeed-18a7-4c53-a71c-325ed42823a4


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

发送 SOL：

```
solana transfer --from <KEYPAIR> <RECIPIENT_ACCOUNT_ADDRESS> <AMOUNT> --fee-payer <KEYPAIR>

solana transfer --from ~/.config/solana/id.json 8gwAbvN8t7n7PoTqWhuqPJ7s4Vgov1YNPByMBJavgHJt 1 --fee-payer ~/.config/solana/id.json 
--allow-unfunded-recipient
```

## SPL Token

生成靓号 mint Token address
```
solana-keygen grind --starts-with usd:1 
```

**创建Token**
```
spl-token create-token
spl-token create-token --decimals 6 mint_keypair.json 
spl-token create-token --decimals 6 keypair.json --url http://127.0.0.1:8899
```

其实是创建 mint 账户，mint 保存：
decimals: 小数位数
supply：当前总供应量
mint_authority: 铸造权限， 谁可以发行 token 
freeze_authority: 冻结权限：冻结或解冻某个账户的 Token， 防止该账户进行转账或接收 Token。

**查看发行量**
```
spl-token supply <mint account> 
```


```
spl-token account-info <mint account>
```

查看 Token mint 的账户信息


spl-token create-account <mint account> ：
为某个用户创建 ATA
spl-token create-account --owner 4cAawauobWYMVr76d8KvrMwbzL2qgg5AWaGfuVv1NH3F usdrxLChKFKAnztF9SHEKPUGNx6tvD97air6ebAKmKb --fee-payer /Users/emmett/.config/solana/id.json

spl-token create-account --owner 4sergQ8dw8CSveBQ9v7datW2gHkPbaah9SsztmoEhsib usdrxLChKFKAnztF9SHEKPUGNx6tvD97air6ebAKmKb --fee-payer /Users/emmett/.config/solana/id.json

spl-token mint  <mint account> <TOKEN_AMOUNT> ATA：发行

给指定地址发行
spl-token mint usdrxLChKFKAnztF9SHEKPUGNx6tvD97air6ebAKmKb 8 D4J7WWnxKXR6ZSwbd5jjdrW89MFPtEUJVQ5cJfX4Athq

spl-token balance <mint account> 
spl-token supply  <mint account> ：
spl-token account-info  <mint account> ： 查看 Token mint 的账户信息
spl-token authorize <mint account> mint —disable:  关闭 mint 权限  