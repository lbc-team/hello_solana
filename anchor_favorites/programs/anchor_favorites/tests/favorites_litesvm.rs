use std::{fs, path::PathBuf};

use anchor_favorites::{
    accounts, instruction, Favorites, ID as FAVORITES_PROGRAM_ID,
};
use anchor_lang::{AccountDeserialize, InstructionData, ToAccountMetas};
use litesvm::LiteSVM;
use solana_instruction::{AccountMeta, Instruction};
use solana_keypair::Keypair;
use solana_pubkey::Pubkey;
use solana_sdk::pubkey as sdk_pubkey;
use solana_sdk_ids::system_program;
use solana_signer::Signer;
use solana_transaction::Transaction;

fn program_binary() -> PathBuf {
    let mut path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    path.push("../../target/deploy/anchor_favorites.so");
    path
}

fn favorites_pda(user: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(&[b"favorites", user.as_ref()], &FAVORITES_PROGRAM_ID).0
}

fn to_pubkey(pubkey: anchor_lang::prelude::Pubkey) -> Pubkey {
    Pubkey::from(pubkey.to_bytes())
}

fn to_account_meta(meta: anchor_lang::prelude::AccountMeta) -> AccountMeta {
    if meta.is_writable {
        AccountMeta::new(Pubkey::from(meta.pubkey.to_bytes()), meta.is_signer)
    } else {
        AccountMeta::new_readonly(Pubkey::from(meta.pubkey.to_bytes()), meta.is_signer)
    }
}

#[test]
fn set_favorites_writes_expected_pda_data() {
    let mut svm = LiteSVM::new();
    let payer = Keypair::new();
    let user = Keypair::new();
    let _sdk_user = sdk_pubkey::Pubkey::new_from_array(user.pubkey().to_bytes());

    let program_bytes = fs::read(program_binary()).expect("read anchor_favorites.so");
    svm.add_program(to_pubkey(FAVORITES_PROGRAM_ID), &program_bytes)
        .expect("load favorites program");
    svm.airdrop(&payer.pubkey(), 2_000_000_000)
        .expect("airdrop payer");
    svm.airdrop(&user.pubkey(), 2_000_000_000)
        .expect("airdrop user");

    let favorites = favorites_pda(&user.pubkey());
    let instruction = Instruction {
        program_id: to_pubkey(FAVORITES_PROGRAM_ID),
        accounts: accounts::SetFavorites {
            user: anchor_lang::prelude::Pubkey::new_from_array(user.pubkey().to_bytes()),
            favorites: anchor_lang::prelude::Pubkey::new_from_array(favorites.to_bytes()),
            system_program: system_program::ID,
        }
        .to_account_metas(None)
        .into_iter()
        .map(to_account_meta)
        .collect(),
        data: instruction::SetFavorites {
            number: 42,
            color: "blue".to_string(),
        }
        .data(),
    };

    let tx = Transaction::new_signed_with_payer(
        &[instruction],
        Some(&payer.pubkey()),
        &[&payer, &user],
        svm.latest_blockhash(),
    );

    svm.send_transaction(tx).expect("execute set_favorites");

    let favorites_account = svm
        .get_account(&favorites)
        .expect("favorites pda account should exist");
    let mut data = favorites_account.data.as_slice();
    let favorites_state =
        Favorites::try_deserialize(&mut data).expect("deserialize favorites account");

    assert_eq!(favorites_state.number, 42);
    assert_eq!(favorites_state.color, "blue");
}

#[test]
fn set_favorites_updates_existing_pda() {
    let mut svm = LiteSVM::new();
    let payer = Keypair::new();
    let user = Keypair::new();
    let _sdk_user = sdk_pubkey::Pubkey::new_from_array(user.pubkey().to_bytes());

    let program_bytes = fs::read(program_binary()).expect("read anchor_favorites.so");
    svm.add_program(to_pubkey(FAVORITES_PROGRAM_ID), &program_bytes)
        .expect("load favorites program");
    svm.airdrop(&payer.pubkey(), 2_000_000_000)
        .expect("airdrop payer");
    svm.airdrop(&user.pubkey(), 2_000_000_000)
        .expect("airdrop user");

    let favorites = favorites_pda(&user.pubkey());

    for (number, color) in [(7_u64, "red"), (99_u64, "green")] {
        let instruction = Instruction {
            program_id: to_pubkey(FAVORITES_PROGRAM_ID),
            accounts: accounts::SetFavorites {
                user: anchor_lang::prelude::Pubkey::new_from_array(user.pubkey().to_bytes()),
                favorites: anchor_lang::prelude::Pubkey::new_from_array(favorites.to_bytes()),
                system_program: system_program::ID,
            }
            .to_account_metas(None)
            .into_iter()
            .map(to_account_meta)
            .collect(),
            data: instruction::SetFavorites {
                number,
                color: color.to_string(),
            }
            .data(),
        };

        let tx = Transaction::new_signed_with_payer(
            &[instruction],
            Some(&payer.pubkey()),
            &[&payer, &user],
            svm.latest_blockhash(),
        );

        svm.send_transaction(tx)
            .expect("execute repeated set_favorites");
    }

    let favorites_account = svm
        .get_account(&favorites)
        .expect("favorites pda account should exist");
    let mut data = favorites_account.data.as_slice();
    let favorites_state =
        Favorites::try_deserialize(&mut data).expect("deserialize favorites account");

    assert_eq!(favorites_state.number, 99);
    assert_eq!(favorites_state.color, "green");
}
