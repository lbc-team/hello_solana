import * as anchor from "@anchor-lang/core";
import { Program } from "@anchor-lang/core";
import { expect } from "chai";

process.env.ANCHOR_PROVIDER_URL ??= "http://127.0.0.1:8899";
process.env.ANCHOR_WALLET ??= `${process.env.HOME}/.config/solana/id.json`;

describe("emit_log", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.EmitLog as Program<any>;

  it("loads the emit_log workspace program", async () => {
    expect(program.programId.toBase58()).to.equal(
      "D5UcofgRSWCoGJh1ckmPpgUn6mBjRtSvY2kDyBX7vxCb"
    );
  });

  it("exposes the initialize instruction", async () => {
    expect(typeof program.methods.initialize).to.equal("function");
  });

  it("has an event coder available", async () => {
    expect(program.coder.events).to.not.equal(undefined);
    expect(typeof program.coder.events.decode).to.equal("function");
  });
});
