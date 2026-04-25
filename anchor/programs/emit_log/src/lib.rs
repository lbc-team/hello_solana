use anchor_lang::prelude::*;

declare_id!("D5UcofgRSWCoGJh1ckmPpgUn6mBjRtSvY2kDyBX7vxCb");

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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn event_payloads_match_expected_values() {
        let event = MyEvent { value: 12 };
        let second_event = MySecondEvent {
            value: 3,
            message: "hello world".to_string(),
        };

        assert_eq!(event.value, 12);
        assert_eq!(second_event.value, 3);
        assert_eq!(second_event.message, "hello world");
    }
}
