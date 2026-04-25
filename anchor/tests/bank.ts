import * as anchor from "@anchor-lang/core";
import { Program } from "@anchor-lang/core";
import { Bank } from "../target/types/bank";
import { PublicKey } from "@solana/web3.js";
import { expect } from "chai";

process.env.ANCHOR_PROVIDER_URL ??= "http://127.0.0.1:8899";
process.env.ANCHOR_WALLET ??= `${process.env.HOME}/.config/solana/id.json`;

describe("bank", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Bank as Program<Bank>;

  it("loads the bank workspace program", async () => {
    expect(program.programId.toBase58()).to.equal(
      "3d6TUS2v5bmZ9489ii1dsasfPossE2zUGhaWjr2gFBKW"
    );
  });

  it("derives the stable bank PDA", async () => {
    const [bankPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("bank")],
      program.programId
    );

    expect(bankPda.toBase58()).to.equal("HKnkrF4yK2XZZC3kEPddVSPc5pLPq8BM14wfJGNJQGWk");
  });

  it("derives the user PDA from the configured wallet", async () => {
    const [userPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), provider.wallet.publicKey.toBuffer()],
      program.programId
    );

    expect(userPda.toBase58()).to.have.length(44);
  });

  it("exposes the userAccount namespace and instructions", async () => {
    expect(program.account.userAccount).to.not.equal(undefined);
    expect(typeof program.methods.createUserAccount).to.equal("function");
    expect(typeof program.methods.deposit).to.equal("function");
    expect(typeof program.methods.withdraw).to.equal("function");
  });
});
