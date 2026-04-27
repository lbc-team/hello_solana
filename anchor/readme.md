# Anchor 工程

## 环境与版本

参考： https://www.anchor-lang.com/docs/installation

```
> rustup --version
rustup 1.28.2 (e4f3ad6f8 2025-04-28)
info: This is the version for the rustup toolchain manager, not the rustc compiler.
info: The currently active `rustc` version is `rustc 1.79.0 (129f3b996 2024-06-10)`

> rustup toolchain list
stable-aarch64-apple-darwin
stable-x86_64-apple-darwin
nightly-aarch64-apple-darwin
nightly-x86_64-apple-darwin
1.79.0-aarch64-apple-darwin (active, default)
solana

> solana --version
solana-cli 3.1.13 (src:437252fc; feat:534737035, client:Agave)

> anchor --version
anchor-cli 1.0.1

```

## 初始化

```
anchor init <project name>
```

## 测试

### 单元测试

单元测试用例直接在源文件一起编写
在 `programs/anchor_favorites` 运行 `cargo test`

### 集成测试

```
> anchor test
> anchor test --validator legacy      # 强制使用 solana-test-validator
> anchor test --skip-local-validator  # 不启动 solana-test-validator
> anchor test --skip-build   # 使用之前的构建
> anchor test --skip-deploy  # 使用之前的部署 
> anchor test --skip-local-validator --skip-deploy --skip-build
```

运行 `Anchor.toml` 中定义在 `scripts` 下的 test 脚本。

注意：`anchor-cli 1.0.1` 默认使用 `surfpool` 作为本地测试 validator。
如果工程测试依赖 `requestAirdrop`、`getLatestBlockhash` 等常规本地 RPC，建议在 `Anchor.toml` 中设置：

```toml
[test]
validator = "legacy"
```

