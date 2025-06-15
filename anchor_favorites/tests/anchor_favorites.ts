import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Favorites } from "../target/types/favorites";
import { BN } from "@coral-xyz/anchor";

async function generateUserAndAirdropSol() {

      // 创建用户 keypair（需要作为 signer）
      const user = anchor.web3.Keypair.generate();
    
      // 给用户账户空投 SOL
      const connection = anchor.getProvider().connection;
      const airdropSignature = await connection.requestAirdrop(
        user.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL // 空投 2 SOL
      );
      await connection.confirmTransaction(airdropSignature);

      return user;
}

describe("anchor_favorites", () => {
  // 读取 Anchor.toml 配置的 provider 
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.Favorites as Program<Favorites>;

  it("favorites!", async () => {
    // 随机生成用户并空投 SOL
    // const user = await generateUserAndAirdropSol();
    
    // 使用 Anchor.toml 中配置的钱包
    const provider = anchor.getProvider();
    const user = (provider.wallet as anchor.Wallet).payer;
    
    // 计算 PDA（根据 lib.rs 中的 seeds）
    const [favoritesPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("favorites"), 
      user.publicKey.toBuffer()],
      program.programId
    );

    // 调用 setFavorites 方法
    const tx = await program.methods
      .setFavorites(new BN(42), "blue")
      .accounts({
        user: user.publicKey,
        favorites: favoritesPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([user])  // 添加 user 作为 signer
      .rpc();
      
    console.log("Your transaction signature", tx);
    
    // 验证账户数据
    const favoritesAccount = await program.account.favorites.fetch(favoritesPda);
    console.log("Favorites account:", favoritesAccount);
    console.log("Number:", favoritesAccount.number.toString());
    console.log("Color:", favoritesAccount.color);
  });
});
