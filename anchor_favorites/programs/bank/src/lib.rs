use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("3A7uokk2LFPCMBJmCrn4ahErYicSpvktHEZnCmhVKY4m");

// 用户存入（deposit 指令）Bank 账户， Bank记录着所有Sol存款
// 用户从银行账户提取资金（withdraw 指令） 
// UserAccount 账户 记录记录着用户存款的金额

#[program]
pub mod bank {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let bank = &mut ctx.accounts.bank;
        bank.authority = ctx.accounts.authority.key();
        Ok(())
    }

    pub fn create_user_account(ctx: Context<CreateUserAccount>) -> Result<()> {
        let user_account = &mut ctx.accounts.user_account;
        user_account.deposit_amount = 0;
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        // 转账 SOL 到银行账户
        // CPI 调用系统程序
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
        ctx.accounts.user_account.deposit_amount = ctx.accounts.user_account.deposit_amount.checked_add(amount).unwrap();

        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        // 确保用户有足够的存款
        require!(
            ctx.accounts.user_account.deposit_amount >= amount,
            BankError::InsufficientFunds
        );

        // 确保银行账户有足够的余额
        require!(
            ctx.accounts.bank.to_account_info().lamports() >= amount,
            BankError::InsufficientBankFunds
        );

        // 从银行账户转账 SOL 到接收者
        **ctx.accounts.bank.to_account_info().try_borrow_mut_lamports()? = ctx
            .accounts.bank
            .to_account_info()
            .lamports()
            .checked_sub(amount)
            .unwrap();

        **ctx.accounts.receiver.try_borrow_mut_lamports()? = ctx
            .accounts.receiver
            .lamports()
            .checked_add(amount)
            .unwrap();

        // 更新用户存款记录
        ctx.accounts.user_account.deposit_amount = ctx.accounts.user_account.deposit_amount.checked_sub(amount).unwrap();

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    //  init 约束会自动阻止重复初始化
    #[account(
        init,
        payer = authority,
        space = 8 + 32, // discriminator + pubkey
        seeds = [b"bank"],
        bump,
    )]
    pub bank: Account<'info, Bank>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
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
    #[account(
        mut,
        seeds = [b"bank"],
        bump
    )]
    pub bank: Account<'info, Bank>,

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
    #[account(
        mut,
        seeds = [b"bank"],
        bump
    )]
    pub bank: Account<'info, Bank>,
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
pub struct Bank {
    pub authority: Pubkey,  // 未使用， 预留
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

