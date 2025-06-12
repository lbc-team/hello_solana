use anchor_lang::prelude::*;
declare_id!("ASY74LTn3x8Ms5L8FfRXDwnrvRnwWZuURvSLqtcHwKqd");

pub const ANCHOR_DISCRIMINATOR_SIZE: usize = 8;

#[program]
pub mod favorites {
    use super::*;

    pub fn set_favorites(
        context: Context<SetFavorites>, number: u64,  color: String,
    ) -> Result<()> {
        msg!("Greetings from {}", context.program_id);
        let user_public_key = context.accounts.user.key();
        msg!(
            "User {user_public_key}'s favorite number is {number}, favorite color is: {color}",
        );

        context.accounts.favorites.set_inner(Favorites {
            number,
            color,
        });
        Ok(())
    }
}

// What we will put inside the Favorites PDA
#[account]
#[derive(InitSpace)]
pub struct Favorites {
    pub number: u64,

    #[max_len(50)]
    pub color: String,

}

// PDA 账户， 根据用户公钥生成
#[derive(Accounts)]
pub struct SetFavorites<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        init_if_needed, 
        payer = user, 
        space = ANCHOR_DISCRIMINATOR_SIZE + Favorites::INIT_SPACE, 
        seeds=[b"favorites", user.key().as_ref()],
        bump
    )]
    pub favorites: Account<'info, Favorites>,

    pub system_program: Program<'info, System>,
}

