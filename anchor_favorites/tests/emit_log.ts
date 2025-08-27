import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { expect } from "chai";

// 这里可以根据实际生成的类型替换 any
// .only 只运行这个测试用例
describe.only("emit_log", () => {
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
            for (const log of txInfo.meta.logMessages) {
                const prefix = "Program data: ";
                if (log.startsWith(prefix)) {
                    const base64 = log.slice(prefix.length);
                    const event = program.coder.events.decode(base64);
                    if (event) {
                        console.log("Anchor Event:", event);
                    }
                }
            }
        }
    });
}); 