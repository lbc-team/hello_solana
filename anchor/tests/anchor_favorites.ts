import * as anchor from "@anchor-lang/core";
import { Program } from "@anchor-lang/core";
import { Favorites } from "../target/types/favorites";
import { expect } from "chai";

process.env.ANCHOR_PROVIDER_URL ??= "http://127.0.0.1:8899";
process.env.ANCHOR_WALLET ??= `${process.env.HOME}/.config/solana/id.json`;

describe("anchor_favorites", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider();
  const program = anchor.workspace.Favorites as Program<Favorites>;

  it("loads the favorites workspace program", async () => {
    expect(program.programId.toBase58()).to.equal(
      "5AW6PAZ89DAt53CvW7iinQFKHjW5DZymrgn4uNY7GV1E"
    );
  });

  it("derives the expected favorites PDA for the configured wallet", async () => {
    const [favoritesPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("favorites"), provider.wallet.publicKey.toBuffer()],
      program.programId
    );

    expect(favoritesPda.toBase58()).to.have.length(44);
    expect(favoritesPda.toBuffer().length).to.equal(32);
  });

  it("exposes the favorites account namespace", async () => {
    expect(program.account.favorites).to.not.equal(undefined);
    expect(typeof program.account.favorites.fetch).to.equal("function");
  });
});
