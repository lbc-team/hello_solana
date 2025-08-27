import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { assert } from "chai";
import {
  PublicKey,
  Keypair,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  createAccount,
  mintTo,
  getAccount,
  getAssociatedTokenAddress,
  createAssociatedTokenAccount,
} from "@solana/spl-token";
// import { Tokenbank } from "../target/types/tokenbank";

describe("tokenbank", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // const program = anchor.workspace.Tokenbank as Program<Tokenbank>;
  const program = anchor.workspace.tokenbank;

  let mint: PublicKey;
  let bankPDA: PublicKey;
  let bankTokenAccount: PublicKey;
  let userTokenAccount: PublicKey;
  let userPDA: PublicKey;

  const mintAuthority = Keypair.generate();
  const user = Keypair.generate();
  const bankTokenAccountKeypair = Keypair.generate();

  before(async () => {
    // 为用户空投 SOL
    const signature = await provider.connection.requestAirdrop(
      user.publicKey,
      2 * LAMPORTS_PER_SOL // 2 SOL
    );
    

    const blockhash = await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction({
      signature: signature,
      blockhash: blockhash.blockhash,
      lastValidBlockHeight: blockhash.lastValidBlockHeight
    }, "confirmed");

    // 创建代币
    mint = await createMint(
      provider.connection,
      provider.wallet.payer,
      mintAuthority.publicKey,
      null, // freezeAuthority: null - 禁用冻结功能
      9, // decimals
      undefined, // keypair: 让程序自动生成
      {commitment: "confirmed"}, 
      TOKEN_PROGRAM_ID
    );

    // 获取 PDA
    [bankPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("bank")],
      program.programId
    );

    // 创建银行代币账户
    bankTokenAccount = await createAccount(
      provider.connection,
      provider.wallet.payer,
      mint,
      bankPDA,
      bankTokenAccountKeypair,
      {commitment: "confirmed"}, 
      TOKEN_PROGRAM_ID
    );

    // 创建用户代币账户
    userTokenAccount = await createAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      mint,
      user.publicKey,
      {commitment: "confirmed"}, 
      TOKEN_PROGRAM_ID
    );

    // 铸造一些代币给用户
    await mintTo(
      provider.connection,
      provider.wallet.payer,
      mint,
      userTokenAccount,
      mintAuthority,
      1_000_000_000, // 1000 tokens
      [], // multiSigners: 多重签名者（空数组表示无）
      {commitment: "confirmed"}, 
      TOKEN_PROGRAM_ID
    );

    [userPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), user.publicKey.toBuffer()],
      program.programId
    );
  });

  it("初始化TokenBank", async () => {
    await program.methods
      .initialize()
      .accounts({
        bank: bankPDA,
        authority: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const bankAccount = await program.account.bank.fetch(bankPDA);
    assert.equal(
      bankAccount.authority.toBase58(),
      provider.wallet.publicKey.toBase58()
    );
  });

  it("创建用户账户", async () => {
    await program.methods
      .createUserAccount()
      .accounts({
        userAccount: userPDA,
        owner: user.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    const userAccount = await program.account.userAccount.fetch(userPDA);
    assert.equal(userAccount.depositAmount.toNumber(), 0);
  });

  it("存款", async () => {
    const depositAmount = new anchor.BN(100_000_000); // 100 tokens

    await program.methods
      .deposit(depositAmount)
      .accounts({
        bank: bankPDA,
        userAccount: userPDA,
        mint: mint,
        depositorAta: userTokenAccount,
        tokenbankAta: bankTokenAccount,
        depositor: user.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([user])
      .rpc();

    const userAccount = await program.account.userAccount.fetch(userPDA);
    const bankTokenAccountInfo = await getAccount(
      provider.connection,
      bankTokenAccount,
      "confirmed", 
      TOKEN_PROGRAM_ID
    );

    assert.equal(userAccount.depositAmount.toNumber(), depositAmount.toNumber());
    assert.equal(
      bankTokenAccountInfo.amount.toString(),
      depositAmount.toString()
    );
  });

  it("提取", async () => {
    const depositAmount = new anchor.BN(100_000_000); // 100 tokens
    const withdrawAmount = new anchor.BN(50_000_000); // 50 tokens

    const beforeBalance = (
      await getAccount(
        provider.connection,
        userTokenAccount,
        "confirmed", 
        TOKEN_PROGRAM_ID
      )
    ).amount;

    await program.methods
      .withdraw(withdrawAmount)
      .accounts({
        bank: bankPDA,
        userAccount: userPDA,
        mint: mint,
        tokenbankAta: bankTokenAccount,
        receiverAta: userTokenAccount,
        receiver: user.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([user])
      .rpc();

    const afterBalance = (
      await getAccount(
        provider.connection,
        userTokenAccount,
        "confirmed", 
        TOKEN_PROGRAM_ID
      )
    ).amount;

    const userAccount = await program.account.userAccount.fetch(userPDA);
    const bankTokenAccountInfo = await getAccount(
      provider.connection,
      bankTokenAccount,
      "confirmed", 
      TOKEN_PROGRAM_ID
    );

    assert.equal(
      userAccount.depositAmount.toNumber(),
      depositAmount.sub(withdrawAmount).toNumber()
    );
    assert.equal(
      bankTokenAccountInfo.amount.toString(),
      depositAmount.sub(withdrawAmount).toString()
    );
    assert.equal(
      afterBalance,
      beforeBalance + BigInt(withdrawAmount.toString())
    );
  });

  it("关闭用户账户", async () => {
    const withdrawAmount = new anchor.BN(50_000_000); // 50 tokens

    await program.methods
      .withdraw(withdrawAmount)
      .accounts({
        bank: bankPDA,
        userAccount: userPDA,
        mint: mint,
        tokenbankAta: bankTokenAccount,
        receiverAta: userTokenAccount,
        receiver: user.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([user])
      .rpc();

    await program.methods
      .closeUserAccount()
      .accounts({
        userAccount: userPDA,
        owner: user.publicKey,
      })
      .signers([user])
      .rpc();

    try {
      await program.account.userAccount.fetch(userPDA);
      assert.fail("Expected the account to be closed");
    } catch (err) {
      assert.include(err.toString(), "Account does not exist");
    }
  });
}); 