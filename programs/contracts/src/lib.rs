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
use std::fmt::{self, Debug, Display};
declare_id!("GWzBR7znXxEVDkDVgQQu5Vpzu3a5G4e5kPXaE9MvebY2");
const SMALL: usize = 256;
const MEDIUM: usize = 1024;

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
        pool.authority =*ctx.accounts.pool_authority.key;
        pool.reward_apy = reward_apy;
        pool.penalty = penalty;
        pool.pool_cap = pool_cap;
        pool.architect_stake = architect_stake;
        pool.builder_stake = builder_stake;
        pool.validator_stake = validator_stake;
        Ok(())
    }
    pub fn update_pool(ctx: Context<updatePool>,apy : u8,authority : Pubkey) -> ProgramResult {
        let pool = &mut ctx.accounts.pool_account.load_mut()?;
        pool.authority = authority;
        pool.reward_apy = apy ;
        Ok(())
    }

    pub fn create_campaign(ctx: Context<CreateCampaign>,
                           off_chain_reference: u64,
                           period : u64,
                           min_builder : u64,
                           min_validator : u64,
                           reward_per_builder : u64,
                           reward_per_validator : u64,
                           validation_quorum : u8,
                           domain:String,
                           subject:String,
                           explain:String,
                           phrase:String
    ) -> ProgramResult {
        let pool = &mut ctx.accounts.pool.load_mut()?;
        let campaign = &mut ctx.accounts.campaign.load_init()?;
        campaign.reward_token = pool.sns_mint;
        campaign.refID = off_chain_reference;
        campaign.min_builder = min_builder;
        campaign.min_validator = min_validator;
        campaign.time_limit = period ;
        campaign.domain =  string_small(domain);
        campaign.subject = string_small(subject);
        campaign.explain = string_medium(explain);
        campaign.phrase =  string_medium(phrase);
        campaign.reward_per_builder = reward_per_builder;
        campaign.reward_per_validator = reward_per_validator;
        campaign.validation_quorum = validation_quorum;
        campaign.set_architect(*ctx.accounts.architect.key);
        pool.add_campaign(*ctx.accounts.architect.key);
       // pool.add_campaign(ctx.accounts.campaign);
        emit!( SynEvent{
            kind : Events::CmapaginCreate as u8,
            user : *ctx.accounts.architect.key
        });
        Ok(())
    }

    pub fn utterance(ctx: Context<OnBuilder>,msg :String) -> ProgramResult {
        let campaign = &mut ctx.accounts.campaign.load_mut()?;
        let pool = &mut ctx.accounts.pool.load_mut()?;
        let given_msg = msg.as_bytes();
        let mut data = [0u8; 256];
        data[..given_msg.len()].copy_from_slice(given_msg);
        let last_id = campaign.add_utterance(Utterance{
            builder :  ctx.accounts.builder.key(),
            validator : Pubkey::default(),
            validated: false,
            is_valid: false,
            data
        });
        emit!( SynEvent{
            kind : Events::UtteranceSubmit as u8,
            user : ctx.accounts.builder.key()
        });
        Ok(())
    }
    pub fn validate(ctx: Context<OnValidator>,utterance_id :u64, status : bool) -> ProgramResult
    {
        let campaign = &mut ctx.accounts.campaign.load_mut()?;
        let pool = &mut ctx.accounts.pool.load_mut()?;
        let validator = *ctx.accounts.validator.key;
        campaign.update_utterance(utterance_id,status,validator);
        emit!( SynEvent{
            kind : Events::UtteranceValidate as u8,
            user : ctx.accounts.validator.key()
        });
        Ok(())
    }
    pub fn checkpy(ctx: Context<Python>) -> ProgramResult {
        msg!("called me from python");
        Ok(())
    }
}

#[account(zero_copy)]
pub struct OntologyAccount {
    pub architect : Pubkey,
    pub stake_amount : u64,
    pub stake_period : u64,
    pub head: u64,
    pub tail: u64,
    pub utterances : [Utterance;8],
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
// Prevent duplicate ontology per campaign
fn check_campaign<'info>(
    campaign_account: &Loader<'info,Campaign>
) -> ProgramResult {
    let campaign = campaign_account.load()?;
    if campaign.architect == Pubkey::default() {
        Ok(())
    }else {
        Err(ProgramError::AccountAlreadyInitialized)
    }
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
    #[account(mut)]
    pub pool_account: Loader<'info, PoolAccount>,
    #[account(signer)]
    pub authority: AccountInfo<'info>,
}
/// Structure of pool initialization
#[account(zero_copy)]
pub struct PoolAccount {
    pub admin: Pubkey,
    pub sns_mint: Pubkey,
    pub authority: Pubkey,
    pub head: u64,
    pub tail: u64,
    pub campaigns : [Pubkey;1023],
    pub architect_stake:u64,
    pub builder_stake:u64,
    pub validator_stake:u64,
    pub reward_apy : u8,
    pub pool_cap : u64,
    pub penalty : u64
}
#[derive(BorshSerialize, BorshDeserialize,Debug)]
pub enum Events {
    PoolInit,
    PoolUpdate,
    CampaignCreate,
    UtteranceSubmit,
    UtteranceValidate
}

#[event]
pub struct SynEvent {
    pub kind: u8,
    pub user: Pubkey,
}
impl fmt::Display for Events {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{:?}", self)
    }
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
    pub architect: AccountInfo<'info>,
    #[account(zero,signer)]
    pub campaign: Loader<'info, Campaign>,
    #[account(mut)]
    pub pool: Loader<'info, PoolAccount>
}

/// Campaign Structure
#[account(zero_copy)]
pub struct Campaign {
    refID : u64,
    head: u64,
    tail: u64,
    architect : Pubkey,
    architect_stake_amount : u64,
    architect_stake_period : u64,
    min_builder : u64,
    min_validator :u64,
    reward_per_builder : u64,
    reward_per_validator : u64,
    validation_quorum : u8,
    reward_token : Pubkey,
    utterances : [Utterance;256],
    time_limit : u64,
    domain : [u8; 256],
    subject : [u8; 256],
    explain : [u8; 1024],
    phrase : [u8; 1024]

}
#[zero_copy]
pub struct Utterance {
    pub builder: Pubkey,
    pub validator :Pubkey,
    pub data: [u8; 256],
    pub validated :bool,
    pub is_valid : bool
}

#[zero_copy]
pub struct Validate {
    pub from: Pubkey,
    pub status: bool,
}
impl PoolAccount {
    fn add_campaign(&mut self,campaign :Pubkey) -> u64 {
        self.campaigns[Campaign::index_of(self.head)] = campaign;
        if PoolAccount::index_of(self.head + 1) == PoolAccount::index_of(self.tail) {
            self.tail += 1;
        }
        self.head += 1;
        self.head
    }
    fn index_of(counter: u64) -> usize {
        std::convert::TryInto::try_into(counter % 1023).unwrap()
    }
}
impl Campaign {
    fn set_architect(&mut self,architect :  Pubkey )  {
        self.architect = architect;
    }
    fn add_utterance(&mut self,utterance :Utterance) -> u64 {
        self.utterances[Campaign::index_of(self.head)] = utterance;
        if Campaign::index_of(self.head + 1) == Campaign::index_of(self.tail) {
            self.tail += 1;
        }
        self.head += 1;
        self.head
    }
    fn update_utterance(&mut self,utterance_id :u64,status:bool,validator: Pubkey) {
        self.utterances[utterance_id as usize].validated = true;
        self.utterances[utterance_id as usize].is_valid = status;
        self.utterances[utterance_id as usize ].validator = validator;
    }
    fn stake(&mut self, user :  Pubkey )  {

    }
    fn unstake(&mut self, user :  Pubkey )  {

    }
    fn distribute_reward(&mut self, builder: Pubkey) {}
    fn index_of(counter: u64) -> usize {
        std::convert::TryInto::try_into(counter % 1023).unwrap()
    }
}

#[derive(Accounts)]
pub struct OnBuilder<'info>{
    #[account(signer)]
    pub builder: AccountInfo<'info>,
    #[account(mut)]
    pub pool: Loader<'info, PoolAccount>,
   #[account(mut)]
    pub campaign: Loader<'info, Campaign>,
}
#[derive(Accounts)]
pub struct OnValidator<'info>{
    #[account(signer)]
    pub validator: AccountInfo<'info>,
    #[account(mut)]
    pub pool: Loader<'info, PoolAccount>,
    #[account(mut)]
    pub campaign: Loader<'info, Campaign>,
}

#[derive(Accounts)]
pub struct Python<'info>{
    pub user: AccountInfo<'info>,
}

pub fn string_small(input :String ) -> [u8;SMALL] {
    let given_input = input.as_bytes();
    let mut out = [0u8; SMALL];
    out[..given_input.len()].copy_from_slice(given_input);
    out
}

pub fn string_medium(input :String ) -> [u8;MEDIUM] {
    let given_input = input.as_bytes();
    let mut out = [0u8; MEDIUM];
    out[..given_input.len()].copy_from_slice(given_input);
    out
}
