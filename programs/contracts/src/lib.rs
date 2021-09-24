#![feature(trivial_bounds)]
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
use anchor_lang::prelude::borsh::{BorshSerialize,BorshDeserialize};
use std::io::Write;

declare_id!("GWzBR7znXxEVDkDVgQQu5Vpzu3a5G4e5kPXaE9MvebY2");

#[program]
pub mod contracts {
    use super::*;
    pub fn init_pool(ctx: Context<initPool>,
                     architect_stake:u64,
                     builder_stake:u64,
                     validator_stake:u64,
                     reward_apy:u8,
                     pool_cap:u64,
                     penalty:u64
    ) -> ProgramResult {
        let pool = &mut ctx.accounts.pool_account.load_init()?;
        pool.sns_mint = *ctx.accounts.sns.key;
        pool.distribution_authority =*ctx.accounts.pool_authority.key;
        pool.reward_apy = reward_apy;
        pool.penalty = penalty;
        pool.pool_cap = pool_cap;
        pool.architect_stake = architect_stake;
        pool.builder_stake = builder_stake;
        pool.validator_stake = validator_stake;
        Ok(())
    }
    pub fn update_pool(ctx: Context<updatePool>,apy : u8) -> ProgramResult {
        let pool = &mut ctx.accounts.pool_account.load_mut()?;
        pool.distribution_authority = ctx.accounts.new_authority.key();
        pool.reward_apy = apy ;
        Ok(())
    }

    pub fn create_campaign(ctx: Context<CreateCampaign>,
                           off_chain_reference: u64,
                           period : u64,
                           min_builder : u64,
                           min_validator : u64,
                           title : String,
                           description : String,
                           reward_per_utterance : u64,
                           validation_quorum : u8
    ) -> ProgramResult {
        let pool = &mut ctx.accounts.pool.load_mut()?;
        let campaign = &mut ctx.accounts.campaign.load_init()?;
        campaign.reward_token = pool.sns_mint;
        campaign.refID = off_chain_reference;
        campaign.fixed_reward_apy =pool.reward_apy ;
        campaign.minimum_builder = min_builder;
        campaign.minimum_validation = min_validator;
        campaign.time_limit = period ;
        let given_title = title.as_bytes();
        let mut title = [0u8; 280];
        title[..given_title.len()].copy_from_slice(given_title);
        campaign.title = title ;

        let given_description = description.as_bytes();
        let mut description = [0u8; 280];
        description[..given_description.len()].copy_from_slice(given_description);
        campaign.description = description ;
        campaign.reward_per_utterance = reward_per_utterance;
        campaign.validation_quorum = validation_quorum;

        emit!( SynEvent{
            kind : Events::CmapaginCreate,
            user : Pubkey::default()
        });
        Ok(())
    }
    pub fn architect_init(ctx: Context<InitOntology>,stake_amount : u64,stake_period :u64) -> ProgramResult {
        let ontology = &mut ctx.accounts.ontology_account.load_init()?;
        let campaign = &mut ctx.accounts.campaign.load_mut()?;
        let pool = &mut ctx.accounts.pool.load_mut()?;
        ontology.architect = *ctx.accounts.architect.key ;
        ontology.campaign_ref = campaign.refID;
        ontology.stake_amount = stake_amount;
        ontology.stake_period = stake_period;
        ontology.builder = [Pubkey::default();5];
        ontology.validator = [Pubkey::default();3];
        campaign.add_architect(ontology.clone());
        Ok(())
    }
    pub fn builder(ctx: Context<OnBuilder>,campaign_ref:String) -> ProgramResult {
        Ok(())
    }
    pub fn validator(ctx: Context<OnValidator>) -> ProgramResult {
        Ok(())
    }
}

#[account(zero_copy)]
pub struct OntologyAccount {
    pub architect : Pubkey,
    pub stake_amount : u64,
    pub stake_period : u64,
    pub validator : [Pubkey;3],
    pub builder : [Pubkey;5],
    pub pending_reward : u64,
    pub ontology_status : bool,
    pub campaign_ref: u64,
    pub created_ts : u64
}

/// Account to be initialized by architect
#[derive(Accounts)]
pub struct InitOntology<'info> {
    #[account(zero)]
    pub ontology_account: Loader<'info, OntologyAccount>,
    pub architect: AccountInfo<'info>,
    #[account(mut)]
    pub campaign: Loader<'info, Campaign>,
    #[account(mut)]
    pub pool: Loader<'info, PoolAccount>
}


/// Pool Initialization accounts and set authority
#[derive(Accounts)]
pub struct initPool<'info> {
    #[account(zero)]
    pub pool_account: Loader<'info, PoolAccount>,
    pub pool_authority: AccountInfo<'info>,
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
    pub admin: Pubkey,
    pub sns_mint: Pubkey,
    pub distribution_authority: Pubkey,
    pub architect_stake:u64,
    pub builder_stake:u64,
    pub validator_stake:u64,
    pub reward_apy : u8,
    pub pool_cap : u64,
    pub penalty : u64
}
#[derive(BorshSerialize, BorshDeserialize, PartialEq, Debug)]

pub enum Events {
    PoolUpdate,
    CmapaginCreate,
    OntologyCreate
}

#[event]
pub struct SynEvent {
    pub kind: Events,
    #[index]
    pub user: Pubkey,
}

/// Structure for access list checking
#[derive(Accounts)]
pub struct Auth<'info> {
    #[account(signer)]
    authority: AccountInfo<'info>,
}
/// Fully Campaign Initialization
#[derive(Accounts)]
pub struct CreateCampaign<'info>  {
    #[account(zero,signer)]
    pub campaign: Loader<'info, Campaign>,
    #[account(mut)]
    pub pool: Loader<'info, PoolAccount>,
}

/// Campaign Structure
#[account(zero_copy)]
pub struct Campaign {
    refID : u64,
    title: [u8; 280],
    description: [u8; 280],
    minimum_builder : u64,
    minimum_validation :u64,
    time_limit : u64,
    reward_per_utterance : u64,
    mining_reward : u64,
    validation_quorum : u8,
    fixed_reward_apy : u8,
    reward_token : Pubkey
}
#[zero_copy]
pub struct Utterance {
    pub builder: Pubkey,
    pub validator :Pubkey,
    pub data: [u8; 280],
    pub validated :bool
}

#[zero_copy]
pub struct Validate {
    pub from: Pubkey,
    pub status: bool,
}

impl Campaign {
    fn add_architect(&mut self,ontology :  OntologyAccount ) -> ProgramResult {
       // self.ontologies[self.ontologies.len()] = ontology;
        Ok(())
    }
    fn build(&mut self, msg: Utterance) {}
    fn validate(&mut self, builder: Pubkey) {}
    fn distribute_reward(&mut self, builder: Pubkey) {}
}



#[instruction(campaign_ref: String, bump: u8)]
#[derive(Accounts)]
pub struct OnBuilder<'info>{
    #[account(
    mut,
    seeds = [b"my-state", campaign_ref.as_bytes()],
    bump = bump,
    )]
    pub ontology_account: Loader<'info, OntologyAccount>,
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
    pub ontology_account: Loader<'info, OntologyAccount>,
    #[account(signer)]
    pub validator: AccountInfo<'info>
}


