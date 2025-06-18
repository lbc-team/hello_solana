use anchor_lang::prelude::*;

declare_id!("GmLHkec7uKSM1ahLZvR7aiUvyzXxVTb8gZbaqdHj3kSH");

pub const ANCHOR_DISCRIMINATOR_SIZE: usize = 8;

#[program]
pub mod emit_log {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Program ID: {} will emit log", ctx.program_id);
        emit!(MyEvent { value: 12 });
        emit!(MySecondEvent { value: 3, message: "hello world".to_string() });
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}

#[event]
pub struct MyEvent {
    pub value: u64,
}

#[event]
pub struct MySecondEvent {
    pub value: u64,
    pub message: String,
}