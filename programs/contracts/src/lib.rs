use anchor_lang::prelude::*;
use anchor_spl::token::{self as spl_token, Mint,MintTo,Burn, TokenAccount, Transfer};
use anchor_lang::solana_program;
use anchor_lang::solana_program::account_info::Account;
use anchor_lang::solana_program::instruction::Instruction;
use anchor_lang::solana_program::program;
use anchor_lang::solana_program::program_option::COption;
use anchor_lang::solana_program::pubkey::{
    ParsePubkeyError, Pubkey, PubkeyError, MAX_SEEDS, MAX_SEED_LEN, PUBKEY_BYTES,
};
//use anchor_spl::token::ID;
use anchor_lang::Loader;
use anchor_lang::ZeroCopy;

declare_id!("GWzBR7znXxEVDkDVgQQu5Vpzu3a5G4e5kPXaE9MvebY2");

#[program]
pub mod contracts {
    use super::*;

    pub fn initialize(ctx: Context<InitOntology>,stake_amount : u64,stake_period :u64,campaign_ref :String) -> ProgramResult {
        let ontology = &mut ctx.accounts.ontology.load_init()?;
        ontology.architect = *ctx.accounts.architect.key ;
        ontology.campaign_ref = campaign_ref.parse().unwrap();
        ontology.stake_amount = stake_amount;
        ontology.stake_period = stake_period;
        Ok(())
    }
    pub fn builder(ctx: Context<OnBuilder>,campaign_ref:String) -> ProgramResult {
        Ok(())
    }
    pub fn validator(ctx: Context<OnValidator>) -> ProgramResult {
        Ok(())
    }
}

#[error]
pub enum ErrorCode {
    #[msg("Vesting end must be greater than the current unix timestamp.")]
    InvalidTimestamp,
    #[msg("The number of vesting periods must be greater than zero.")]
    InvalidPeriod,
    #[msg("The vesting deposit amount must be greater than zero.")]
    InvalidDepositAmount,
    #[msg("The Whitelist entry is not a valid program address.")]
    InvalidProgramAddress,
    #[msg("Invalid vault owner.")]
    InvalidVaultOwner,
    #[msg("Vault amount must be zero.")]
    InvalidVaultAmount,
    #[msg("Insufficient withdrawal balance.")]
    InsufficientWithdrawalBalance,
    #[msg("You do not have sufficient permissions to perform this action.")]
    Unauthorized,
}

#[derive(Accounts)]
pub struct InitArchitect<'info> {
    authority: AccountInfo<'info>,
    sns: CpiAccount<'info, Mint>,
}
#[derive(Accounts)]
pub struct Auth<'info> {
    #[account(signer)]
    authority: AccountInfo<'info>,
}

#[derive(Accounts)]
#[instruction(campaign_ref: String, bump: u8)]
pub struct InitOntology<'info> {
    #[account(signer)]
    pub architect: AccountInfo<'info>,
    #[account(zero)]
    pub ontology: Loader<'info, Ontology>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: AccountInfo<'info>,
}



#[account(zero_copy)]
#[derive(Default)]
pub struct Ontology {
    pub architect : Pubkey,
    pub stake_amount : u64,
    pub stake_period : u64,
    pub validator : [Pubkey;3],
    pub builder : [Pubkey;5],
    pub token_vault : Pubkey,
    pub pending_reward : u64,
    pub ontology_status : bool,
    pub campaign_ref: u64,
    pub created_ts : u64
}

#[instruction(campaign_ref: String, bump: u8)]
#[derive(Accounts)]
pub struct OnBuilder<'info>{
    #[account(
    mut,
    seeds = [b"my-state", campaign_ref.as_bytes()],
    bump = bump,
    )]
    pub ontology: Loader<'info, Ontology>,
    #[account(signer)]
    pub builder: AccountInfo<'info>
}

#[instruction(campaign_ref: String, bump: u8)]
#[derive(Accounts)]
pub struct OnValidator<'info>{
    #[account(
    mut,
    seeds = [b"my-state", campaign_ref.as_bytes()],
    bump = bump,
    )]
    pub ontology_account: Loader<'info, Ontology>,
    #[account(signer)]
    pub validator: AccountInfo<'info>
}


