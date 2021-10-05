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
const MEDIUM: usize = 512;

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
            head: 0,
            validators: [Pubkey::default();128],
            data,
            correct: 0,
            incorrect: 0,
            finish: false
        });
        Ok(())
    }
    pub fn validate(ctx: Context<OnValidator>,utterance_id :u64, status : bool) -> ProgramResult
    {
        let campaign = &mut ctx.accounts.campaign.load_mut()?;
        let pool = &mut ctx.accounts.pool.load_mut()?;
        let validator = *ctx.accounts.validator.key;
        campaign.update_utterance(utterance_id,status,validator);
        let utter = campaign.get_utterance(utterance_id) ;
        emit!( ValidateEvent{
            user : ctx.accounts.validator.key(),
            data : utter
        });
        Ok(())
    }
    pub fn checkpy(ctx: Context<Python>) -> ProgramResult {
        msg!("called me from python");
        Ok(())
    }
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
pub struct PoolAccount {            // 8
    pub admin: Pubkey,              // 32
    pub sns_mint: Pubkey,           // 32
    pub authority: Pubkey,          // 32
    pub head: u64,                  // 8
    pub tail: u64,                  // 8
    pub campaigns : [Pubkey;512],  // 32x1024
    pub architect_stake:u64,        // 8
    pub builder_stake:u64,          // 8
    pub validator_stake:u64,        // 8
    pub reward_apy : u8,            // 1
    pub pool_cap : u64,             // 8
    pub penalty : u64               // 8
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

#[event]
pub struct ValidateEvent {
    pub user: Pubkey,
    pub data : Utterance

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
    utterances : [Utterance;4096],
    time_limit : u64,
    domain : [u8; 256],
    subject : [u8; 256],
    explain : [u8; 512],
    phrase : [u8; 512]

}

#[zero_copy]
#[derive(BorshSerialize, BorshDeserialize,Debug)]
pub struct Utterance {
    pub builder: Pubkey,
    pub head : u64,
    pub validators :[Pubkey;128],
    pub data: [u8; 256],
    pub correct : u64,
    pub incorrect : u64,
    pub finish : bool
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
        match status {
            true => {
                self.utterances[utterance_id as usize].correct +=1 ;
            },
            false => {
                self.utterances[utterance_id as usize].incorrect +=1 ;
            }
        }
        self.utterances[utterance_id as usize ].validators[self.utterances[utterance_id as usize ].head as usize] = validator;
        self.utterances[utterance_id as usize ].head += 1;
        match self.min_validator {
            x if x >= self.utterances[utterance_id as usize ].correct  =>  {
                self.utterances[utterance_id as usize ].finish == true;
            },
            _ => {}
        }

    }
    fn get_utterance(&mut self,utterance_id :u64) -> Utterance{
        self.utterances[utterance_id as usize].clone()
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
