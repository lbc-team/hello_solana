use anchor_lang::prelude::*;
use anchor_spl::{
    token::{self, Mint, Token, TokenAccount, Transfer},
    associated_token::AssociatedToken,
};

declare_id!("3wUr8uJzXTX6dT9PaHiM4sjgohfK1DUvRBGJaW7hBKF9");

#[program]
pub mod tokenbank {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        ctx.accounts.bank.authority = ctx.accounts.authority.key();
        Ok(())
    }

    pub fn create_user_account(ctx: Context<CreateUserAccount>) -> Result<()> {
        ctx.accounts.user_account.owner = ctx.accounts.owner.key();
        ctx.accounts.user_account.deposit_amount = 0;
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.depositor_token.to_account_info(),
                to: ctx.accounts.bank_token.to_account_info(),
                authority: ctx.accounts.depositor.to_account_info(),
            },
        );

        token::transfer(transfer_ctx, amount)?;

        ctx.accounts.user_account.deposit_amount += amount;

        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        require!(
            ctx.accounts.user_account.deposit_amount >= amount,
            TokenBankError::InsufficientFunds
        );

        let bank_seeds = &[b"bank".as_ref(), &[ctx.bumps.bank]];
        let signer = &[&bank_seeds[..]];

        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.bank_token.to_account_info(),
                to: ctx.accounts.receiver_token.to_account_info(),
                authority: ctx.accounts.bank.to_account_info(),
            },
            signer,
        );

        token::transfer(transfer_ctx, amount)?;

        ctx.accounts.user_account.deposit_amount -= amount;

        Ok(())
    }

    pub fn close_user_account(ctx: Context<CloseUserAccount>) -> Result<()> {
        require!(
            ctx.accounts.user_account.deposit_amount == 0,
            TokenBankError::AccountNotEmpty
        );

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32,
        seeds = [b"bank"],
        bump
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
        space = 8 + 32 + 8,
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
    #[account(mut)]
    pub bank: Account<'info, Bank>,
    #[account(
        mut,
        seeds = [b"user", depositor.key().as_ref()],
        bump,
        constraint = user_account.owner == depositor.key() @ TokenBankError::InvalidOwner
    )]
    pub user_account: Account<'info, UserAccount>,
    pub mint: Account<'info, Mint>,
    #[account(
        mut,
        token::mint = mint,
        token::authority = depositor
    )]
    pub depositor_token: Account<'info, TokenAccount>,
    #[account(
        mut,
        token::mint = mint,
        token::authority = bank
    )]
    pub bank_token: Account<'info, TokenAccount>,
    pub depositor: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
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
        bump,
        constraint = user_account.owner == receiver.key() @ TokenBankError::InvalidOwner
    )]
    pub user_account: Account<'info, UserAccount>,
    pub mint: Account<'info, Mint>,
    #[account(
        mut,
        token::mint = mint,
        token::authority = bank
    )]
    pub bank_token: Account<'info, TokenAccount>,
    #[account(
        mut,
        token::mint = mint,
        token::authority = receiver
    )]
    pub receiver_token: Account<'info, TokenAccount>,
    pub receiver: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[derive(Accounts)]
pub struct CloseUserAccount<'info> {
    #[account(
        mut,
        close = owner,
        seeds = [b"user", owner.key().as_ref()],
        bump,
        constraint = user_account.owner == owner.key() @ TokenBankError::InvalidOwner
    )]
    pub user_account: Account<'info, UserAccount>,
    #[account(mut)]
    pub owner: Signer<'info>,
}

#[account]
pub struct Bank {
    pub authority: Pubkey,
}

#[account]
pub struct UserAccount {
    pub owner: Pubkey,
    pub deposit_amount: u64,
}

#[error_code]
pub enum TokenBankError {
    #[msg("Insufficient funds")]
    InsufficientFunds,
    #[msg("Invalid owner")]
    InvalidOwner,
    #[msg("Account not empty")]
    AccountNotEmpty,
}
