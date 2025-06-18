import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Bank } from "../target/types/bank";
import { PublicKey, Keypair } from "@solana/web3.js";
import { assert } from "chai";

describe("bank", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Bank as Program<Bank>;

  it("创建银行账户", async () => {
    const [bankPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("bank")],
      program.programId
    );

    const tx = await program.methods
      .initialize()
      .accounts({
        bank: bankPDA,
        authority: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const bankAccount = await program.account.bank.fetch(bankPDA);
    assert.equal(bankAccount.authority.toBase58(), provider.wallet.publicKey.toBase58());
  });

  it("创建用户账户", async () => {
    const [userPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), provider.wallet.publicKey.toBuffer()],
      program.programId
    );

    const tx = await program.methods
      .createUserAccount()
      .accounts({
        userAccount: userPDA,
        owner: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const userAccount = await program.account.userAccount.fetch(userPDA);
    assert.equal(userAccount.depositAmount.toNumber(), 0);
  });

  it("存款", async () => {
    const [bankPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("bank")],
      program.programId
    );

    const [userPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), provider.wallet.publicKey.toBuffer()],
      program.programId
    );

    const initialBalance = await provider.connection.getBalance(bankPDA);
    const depositAmount = new anchor.BN(1_000_000_000); // 1 SOL

    const tx = await program.methods
      .deposit(depositAmount)
      .accounts({
        bank: bankPDA,
        userAccount: userPDA,
        depositor: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const finalBalance = await provider.connection.getBalance(bankPDA);
    const userAccount = await program.account.userAccount.fetch(userPDA);

    assert.equal(finalBalance - initialBalance, depositAmount.toNumber());
    assert.equal(userAccount.depositAmount.toNumber(), depositAmount.toNumber());
  });

  it("提取到指定账户", async () => {
    const [bankPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("bank")],
      program.programId
    );

    const [userPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), provider.wallet.publicKey.toBuffer()],
      program.programId
    );

    const withdrawAmount = new anchor.BN(500_000_000); // 0.5 SOL

    const initialBankBalance = await provider.connection.getBalance(bankPDA);
    const initialUserBalance = await provider.connection.getBalance(provider.wallet.publicKey);

    const tx = await program.methods
      .withdraw(withdrawAmount)
      .accounts({
        bank: bankPDA,
        userAccount: userPDA,
        receiver: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const finalBankBalance = await provider.connection.getBalance(bankPDA);
    const finalUserBalance = await provider.connection.getBalance(provider.wallet.publicKey);
    const userAccount = await program.account.userAccount.fetch(userPDA);

    assert.equal(initialBankBalance - finalBankBalance, withdrawAmount.toNumber());
    assert.isAbove(finalUserBalance, initialUserBalance); // 考虑到交易费用，最终余额会略低于预期
    assert.equal(userAccount.depositAmount.toNumber(), 500_000_000); // 剩余 0.5 SOL
  });
}); 