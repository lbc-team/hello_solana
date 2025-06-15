use anchor_lang::prelude::*;

declare_id!("4Sq6MsHjGc71x4cCXXnpxqVErDptwCmrdJjZexrrnCVK");

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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_favorites_struct_creation() {
        let favorites = Favorites {
            number: 42,
            color: "blue".to_string(),
        };
        
        assert_eq!(favorites.number, 42);
        assert_eq!(favorites.color, "blue");
    }

    #[test]
    fn test_favorites_struct_space_calculation() {
        // 测试 InitSpace 计算是否正确
        // number: u64 = 8 bytes
        // color: String with max_len(50) = 4 + 50 = 54 bytes
        // Total: 8 + 54 = 62 bytes
        assert_eq!(Favorites::INIT_SPACE, 62);
    }

    #[test]
    fn test_color_max_length() {
        let long_color = "a".repeat(50);
        let favorites = Favorites {
            number: 100,
            color: long_color.clone(),
        };
        
        assert_eq!(favorites.color.len(), 50);
        assert_eq!(favorites.color, long_color);
    }

    #[test]
    fn test_program_id() {
        // 测试程序 ID 是否正确设置
        let expected_id = "HGq5ZAt1kDDHn4ZCK6tLcdnzbft5t7tFXZTvibNWYe6q";
        assert_eq!(crate::ID.to_string(), expected_id);
    }

    #[test]
    fn test_favorites_default_values() {
        let favorites = Favorites {
            number: 0,
            color: String::new(),
        };
        
        assert_eq!(favorites.number, 0);
        assert_eq!(favorites.color, "");
        assert!(favorites.color.is_empty());
    }

    #[test]
    fn test_number_edge_cases() {
        // 测试数字的边界情况
        let max_favorites = Favorites {
            number: u64::MAX,
            color: "red".to_string(),
        };
        
        let min_favorites = Favorites {
            number: u64::MIN,
            color: "green".to_string(),
        };
        
        assert_eq!(max_favorites.number, u64::MAX);
        assert_eq!(min_favorites.number, 0);
    }

    #[test]
    fn test_color_unicode_support() {
        // 测试 Unicode 字符支持
        let favorites = Favorites {
            number: 888,
            color: "红色🔴".to_string(),
        };
        
        assert_eq!(favorites.number, 888);
        assert_eq!(favorites.color, "红色🔴");
    }
}

