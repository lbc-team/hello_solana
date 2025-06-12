use anchor_lang::prelude::*;

declare_id!("BqVNxB4bggMbrAkiV6v5cyREqS4VFjD2d8i1ZAV8C9v5");

#[program]
mod Adder {
    use super::*;
    pub fn add(ctx: Context<Add>, d1: u64, d2: u64) -> Result<()> {
        msg!("Sum is: {}!", d1 + d2);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Add {}
