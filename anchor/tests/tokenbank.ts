import * as anchor from "@anchor-lang/core";
import { Program } from "@anchor-lang/core";
import { expect } from "chai";
import { PublicKey } from "@solana/web3.js";

process.env.ANCHOR_PROVIDER_URL ??= "http://127.0.0.1:8899";
process.env.ANCHOR_WALLET ??= `${process.env.HOME}/.config/solana/id.json`;

describe("tokenbank", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.tokenbank;

  it("loads the tokenbank workspace program", async () => {
    expect(program.programId.toBase58()).to.equal(
      "Fgsiva1LWG6DaAWAx6tughzWhes3tFkYiAUHS5VQfCZH"
    );
  });

  it("derives the stable tokenbank PDA", async () => {
    const [bankPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("bank")],
      program.programId
    );

    expect(bankPda.toBase58()).to.equal("9kGqcfGoHhDBibBE82qr68P4fvP5bMnNm1w5mUHJSH1Q");
  });

  it("derives the user PDA from the configured wallet", async () => {
    const [userPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), provider.wallet.publicKey.toBuffer()],
      program.programId
    );

    expect(userPda.toBase58()).to.have.length(44);
  });

  it("exposes the bank and userAccount namespaces", async () => {
    expect(program.account.bank).to.not.equal(undefined);
    expect(program.account.userAccount).to.not.equal(undefined);
    expect(typeof program.methods.initialize).to.equal("function");
    expect(typeof program.methods.createUserAccount).to.equal("function");
    expect(typeof program.methods.deposit).to.equal("function");
    expect(typeof program.methods.withdraw).to.equal("function");
    expect(typeof program.methods.closeUserAccount).to.equal("function");
  });
});
