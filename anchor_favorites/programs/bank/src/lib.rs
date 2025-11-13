use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("3A7uokk2LFPCMBJmCrn4ahErYicSpvktHEZnCmhVKY4m");

// Bank 是一个空的 PDA（由 System Program 拥有），仅用于存储 SOL
// 使用 system_program::transfer 进行存取款操作
// UserAccount 记录每个用户的存款金额

#[program]
pub mod bank {
    use super::*;

    pub fn create_user_account(ctx: Context<CreateUserAccount>) -> Result<()> {
        let user_account = &mut ctx.accounts.user_account;
        user_account.deposit_amount = 0;
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        // 使用 system_program::transfer 从用户转账到 bank PDA
        // System Program 检测到目标账户不存在，自动创建：
        // - Owner: System Program (11111...1111)
        // - Lamports: amount
        // - Data: []
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.depositor.to_account_info(),
                    to: ctx.accounts.bank.to_account_info(),
                },
            ),
            amount,
        )?;

        // 更新用户存款记录
        ctx.accounts.user_account.deposit_amount = ctx
            .accounts
            .user_account
            .deposit_amount
            .checked_add(amount)
            .unwrap();

        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        // 确保用户有足够的存款
        require!(
            ctx.accounts.user_account.deposit_amount >= amount,
            BankError::InsufficientFunds
        );

        // 确保 bank 账户有足够的余额
        let bank_lamports = ctx.accounts.bank.lamports();
        require!(bank_lamports >= amount, BankError::InsufficientBankFunds);

        // 使用 system_program::transfer 配合 PDA seeds 签名进行转账
        // 这是推荐的做法
        let seeds = &[b"bank".as_ref(), &[ctx.bumps.bank]];
        let signer_seeds = &[&seeds[..]];

        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.bank.to_account_info(),
                    to: ctx.accounts.receiver.to_account_info(),
                },
                signer_seeds,
            ),
            amount,
        )?;

        // 更新用户存款记录
        ctx.accounts.user_account.deposit_amount = ctx
            .accounts
            .user_account
            .deposit_amount
            .checked_sub(amount)
            .unwrap();

        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateUserAccount<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + 8, // discriminator + u64
        seeds = [b"user", owner.key().as_ref()],
        bump
    )]
    pub user_account: Account<'info, UserAccount>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    /// CHECK: Bank 是一个空的 PDA，由 System Program 拥有，在transfer时自动创建, 仅用于存储 SOL
    #[account(
        mut,
        seeds = [b"bank"],
        bump
    )]
    pub bank: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [b"user", depositor.key().as_ref()],
        bump
    )]
    pub user_account: Account<'info, UserAccount>,

    #[account(mut)]
    pub depositor: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    /// CHECK: Bank 是一个空的 PDA，由 System Program 拥有，仅用于存储 SOL
    #[account(
        mut,
        seeds = [b"bank"],
        bump
    )]
    pub bank: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [b"user", receiver.key().as_ref()],
        bump
    )]
    pub user_account: Account<'info, UserAccount>,
    #[account(mut)]
    pub receiver: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct UserAccount {
    pub deposit_amount: u64,
}

#[error_code]
pub enum BankError {
    #[msg("用户余额不足")]
    InsufficientFunds,
    #[msg("银行资金不足")]
    InsufficientBankFunds,
}

