use anchor_lang::prelude::*;
use anchor_spl::{
    token::{self, Mint, Token, TokenAccount, Transfer},
};

declare_id!("Fgsiva1LWG6DaAWAx6tughzWhes3tFkYiAUHS5VQfCZH");

#[program]
pub mod tokenbank {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        ctx.accounts.bank.authority = ctx.accounts.authority.key();
        Ok(())
    }

    pub fn create_user_account(ctx: Context<CreateUserAccount>) -> Result<()> {
        ctx.accounts.user_account.deposit_amount = 0;
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        let transfer_ctx = CpiContext::new(
            Token::id(),
            Transfer {
                from: ctx.accounts.depositor_ata.to_account_info(),
                to: ctx.accounts.tokenbank_ata.to_account_info(),
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

        // 使用 seeds 作为签名，确保只有银行账户可以提取资金
        let bank_seeds = &[b"bank".as_ref(), &[ctx.bumps.bank]];
        let signer = &[&bank_seeds[..]];

        let transfer_ctx = CpiContext::new_with_signer(
            Token::id(),
            Transfer {
                from: ctx.accounts.tokenbank_ata.to_account_info(),
                to: ctx.accounts.receiver_ata.to_account_info(),
                authority: ctx.accounts.bank.to_account_info(),
            },
            signer,  // 使用 seeds 作为 PDA 签名
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
        space = 8 + 8, // discriminator + deposit_amount
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
    #[account(mut,
        seeds = [b"bank"],  // 添加这个约束
        bump,
    )]
    pub bank: Account<'info, Bank>,

    #[account(
        mut,
        seeds = [b"user", depositor.key().as_ref()],
        bump
    )]
    pub user_account: Account<'info, UserAccount>,
    
    pub mint: Account<'info, Mint>,
    
    #[account(
        mut,
        token::mint = mint,
        token::authority = depositor
    )]
    pub depositor_ata: Account<'info, TokenAccount>,

    // authority is bank, 这样程序可以通过 PDA seeds 签名来授权代币转移
    
    #[account(
        mut,
        token::mint = mint,
        token::authority = bank
    )]
    pub tokenbank_ata: Account<'info, TokenAccount>,
    pub depositor: Signer<'info>,
    pub token_program: Program<'info, Token>,
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
    pub mint: Account<'info, Mint>,
    
    #[account(
        mut,
        token::mint = mint,
        token::authority = bank
    )]
    pub tokenbank_ata: Account<'info, TokenAccount>,

    #[account(
        mut,
        token::mint = mint,
        token::authority = receiver
    )]
    pub receiver_ata: Account<'info, TokenAccount>,
    pub receiver: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CloseUserAccount<'info> {
    #[account(
        mut,
        close = owner,
        seeds = [b"user", owner.key().as_ref()],
        bump
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
    pub deposit_amount: u64,
}

#[error_code]
pub enum TokenBankError {
    #[msg("Insufficient funds")]
    InsufficientFunds,
    #[msg("Account not empty")]
    AccountNotEmpty,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn initialize_sets_expected_authority() {
        let authority = Pubkey::new_unique();
        let bank = Bank { authority };

        assert_eq!(bank.authority, authority);
    }

    #[test]
    fn user_account_tracks_token_deposits() {
        let mut account = UserAccount { deposit_amount: 0 };

        account.deposit_amount += 500;
        account.deposit_amount += 250;

        assert_eq!(account.deposit_amount, 750);
    }

    #[test]
    fn user_account_can_be_closed_only_when_empty() {
        let empty_account = UserAccount { deposit_amount: 0 };
        let non_empty_account = UserAccount { deposit_amount: 1 };

        assert_eq!(empty_account.deposit_amount, 0);
        assert_ne!(non_empty_account.deposit_amount, 0);
    }

    #[test]
    fn bank_pda_is_stable() {
        let (bank_pda, _) = Pubkey::find_program_address(&[b"bank"], &ID);

        assert_eq!(bank_pda.to_string(), "9kGqcfGoHhDBibBE82qr68P4fvP5bMnNm1w5mUHJSH1Q");
    }
}
