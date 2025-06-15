import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { expect } from "chai";

// 这里可以根据实际生成的类型替换 any

describe("emit_log", () => {
    anchor.setProvider(anchor.AnchorProvider.env());
    const program = anchor.workspace.EmitLog as Program<any>;

    it("emit_log!", async () => {
        // 调用 initialize 方法
        const tx = await program.methods.initialize().rpc();
        console.log("Your transaction signature", tx);

        // 获取并打印日志
        const txInfo = await anchor.getProvider().connection.getParsedTransaction(tx, "confirmed");
        if (txInfo && txInfo.meta && txInfo.meta.logMessages) {
        console.log("Transaction logs:", txInfo.meta.logMessages);
        }
        // 也可以根据需要断言日志内容
        // expect(txInfo.meta.logMessages.some(log => log.includes("will emit log"))).to.be.true;
    });
}); 