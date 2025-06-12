use anchor_lang::prelude::*;

declare_id!("5Q1bYLAbg91NYUfRaK8YTiHCQwPmZb5GxcKeQ58gsrFG");

#[program]
mod StoreNumber {
    use super::*;
    pub fn initialize(ctx: Context<Initialize>, data: u64) -> Result<()> {
        ctx.accounts.new_account.data = data;
        msg!("Changed data to: {}!", data); // Message will show up in the tx logs
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    // 我们必须指定空间大小以便初始化账户。
    // 前8个字节是默认的账户判别器，
    // 接下来的8个字节来自NewAccount.data的u64类型。
    // (u64 = 64位无符号整数 = 8字节)
    #[account(init, payer = signer, space = 8 + 8)]
    pub new_account: Account<'info, DataStore>,

    #[account(mut)]
    pub signer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[account]
pub struct DataStore {
    data: u64
}