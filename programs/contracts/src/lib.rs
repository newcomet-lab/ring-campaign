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
    pub fn init_pool(ctx: Context<initPool>) -> ProgramResult {
        let pool = &mut ctx.accounts.pool_account.load_init()?;
        pool.sns_mint = *ctx.accounts.sns.key;
        pool.distribution_authority =*ctx.accounts.pool_authority.key;
        Ok(())
    }
    pub fn update_pool(ctx: Context<updatePool>) -> ProgramResult {
        let pool = &mut ctx.accounts.pool_account.load_mut()?;
        pool.distribution_authority = ctx.accounts.new_authority.key();
        Ok(())
    }
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
/// Pool Initialization accounts and set authority
#[derive(Accounts)]
pub struct initPool<'info> {
    #[account(zero)]
    pub pool_account: Loader<'info, PoolAccount>,
    pub pool_authority: AccountInfo<'info>,
    #[account(mut, constraint = sns.owner == pool_authority.key)]
    pub sns: AccountInfo<'info>,
}
/// Account to update pool authority
#[derive(Accounts)]
pub struct updatePool<'info> {
    pub new_authority: AccountInfo<'info>,
    #[account(mut,signer)]
    pub pool_account: Loader<'info, PoolAccount>,
}
/// Structure of pool initialization
#[account(zero_copy)]
pub struct PoolAccount {
    pub sns_mint: Pubkey,
    pub distribution_authority: Pubkey,
    pub architect_stake:u64,
    pub builder_stake:u64,
    pub validator_stake:u64,
    pub reward_apy : u8,
    pub pool_cap : u64,
    pub penalty : u64
}

/// Structure for access list checking
#[derive(Accounts)]
pub struct Auth<'info> {
    #[account(signer)]
    authority: AccountInfo<'info>,
}
/// Fully Campaign Initialization
#[derive(Accounts)]
pub struct InitCampaign<'info>  {
    #[account(zero)]
    pub campaign: Loader<'info, Campaign>,
    #[account(zero)]
    pub architect: Loader<'info, Ontology>,
}
/// Campaign Structure
#[account(zero_copy)]
pub struct Campaign {
    refID : u64,
    title: [u8; 280],
    description: [u8; 280],
    utterances: [Utterance; 33607],
    minimum_builder : u64,
    minimum_validation :u64,
    time_limit : u64,
    reward_per_utterance : u64,
    mining_reward : u64,
    validation_quorum : u8,
    fixed_reward_apy : u64
}
#[zero_copy]
pub struct Utterance {
    pub from: Pubkey,
    pub data: [u8; 280],
}
#[zero_copy]
pub struct Validate {
    pub from: Pubkey,
    pub status: bool,
}

impl Campaign {
    fn build(&mut self, msg: Utterance) {}
    fn validate(&mut self, builder: Pubkey) {}
}
/// Account to be initialized by architect
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


