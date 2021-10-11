#![feature(use_extern_macros)]

use std::fmt::{self, Debug, Display};
use std::io::Write;

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Burn, Mint, MintTo, TokenAccount, Transfer};

declare_id!("2bFt7FK3K8DjjeJCXrv9fqhc34SPo2mWWMNqWgANJngJ");
const SMALL: usize = 256;
const MEDIUM: usize = 512;

#[program]
pub mod Datafarm {
    use super::*;

    #[state]
    pub struct PoolConfig {
        pub reward_per_block: u64,
        pub mint: Pubkey,
        pub vault: Pubkey,
        pub authority: Pubkey,
        pub head: u64,
        pub tail: u64,
        pub campaigns: [Pubkey; 16],
        pub architect_stake: u64,
        pub builder_stake: u64,
        pub validator_stake: u64,
        pub reward_apy: u8,
        pub pool_cap: u64,
        pub penalty: u64,
    }

    impl PoolConfig {
        pub fn new(ctx: Context<Ctor>,
                   architect_stake: u64,
                   builder_stake: u64,
                   validator_stake: u64,
                   reward_apy: u8,
                   pool_cap: u64,
                   penalty: u64,
                   reward_per_block: u64) -> Result<Self, ProgramError> {
            Ok(Self {
                authority: ctx.accounts.authority.key(),
                mint: ctx.accounts.mint.key(),
                vault: ctx.accounts.vault.key(),
                head: 0,
                tail: 0,
                campaigns: [Pubkey::default(); 16],
                reward_per_block,
                architect_stake,
                builder_stake,
                validator_stake,
                reward_apy,
                pool_cap,
                penalty,
            })
        }

        pub fn update_reward(&mut self, ctx: Context<Ctor>, reward: u64) -> ProgramResult {
            self.reward_per_block = reward;
            Ok(())
        }
    }

    const CONTRACT_PDA_SEED: &[u8] = b"synesis";

    pub fn init_pool(
        ctx: Context<initPool>,
        architect_stake: u64,
        builder_stake: u64,
        validator_stake: u64,
        reward_apy: u8,
        pool_cap: u64,
        penalty: u64,
    ) -> ProgramResult {
        let pool = &mut ctx.accounts.pool_account.load_init()?;
        pool.sns_mint = *ctx.accounts.sns.key;
        pool.authority = *ctx.accounts.pool_authority.key;
        pool.reward_apy = reward_apy;
        pool.penalty = penalty;
        pool.pool_cap = pool_cap;
        pool.architect_stake = architect_stake;
        pool.builder_stake = builder_stake;
        pool.validator_stake = validator_stake;
        Ok(())
    }

    pub fn update_pool(ctx: Context<updatePool>, apy: u8, authority: Pubkey) -> ProgramResult {
        let pool = &mut ctx.accounts.pool_account.load_mut()?;
        pool.authority = authority;
        pool.reward_apy = apy;
        Ok(())
    }

    //#[access_control(CreateCampaign::accounts(&ctx, nonce))]
    pub fn create_campaign(
        ctx: Context<CreateCampaign>,
        off_chain_reference: u64,
        period: u64,
        min_builder: u64,
        min_validator: u64,
        reward_per_builder: u64,
        reward_per_validator: u64,
        validation_quorum: u8,
        domain: String,
        subject: String,
        explain: String,
        phrase: String,
    ) -> ProgramResult {
        let pool = &mut ctx.accounts.pool.load_mut()?;
        let campaign = &mut ctx.accounts.campaign_account.load_init()?;
        campaign.reward_token = pool.sns_mint;
        campaign.refID = off_chain_reference;
        campaign.min_builder = min_builder;
        campaign.min_validator = min_validator;
        campaign.time_limit = period;
        campaign.domain = string_small(domain);
        campaign.subject = string_small(subject);
        campaign.explain = string_medium(explain);
        campaign.phrase = string_medium(phrase);
        campaign.reward_per_builder = reward_per_builder;
        campaign.reward_per_validator = reward_per_validator;
        campaign.validation_quorum = validation_quorum;
        campaign.set_architect(*ctx.accounts.architect.key);
        pool.add_campaign(*ctx.accounts.architect.key);
        Ok(())
    }

    pub fn utterance(ctx: Context<OnBuilder>, msg: String) -> ProgramResult {
        let campaign = &mut ctx.accounts.campaign_account.load_mut()?;
        let pool = &mut ctx.accounts.pool.load_mut()?;
        let given_msg = msg.as_bytes();
        let mut data = [0u8; 256];
        data[..given_msg.len()].copy_from_slice(given_msg);
        let last_id = campaign.add_utterance(Utterance {
            builder: ctx.accounts.builder.key(),
            head: 0,
            validators: [Pubkey::default(); 32],
            data,
            correct: 0,
            incorrect: 0,
            finish: false,
        });
        Ok(())
    }

    pub fn validate(ctx: Context<OnValidator>, utterance_id: u64, status: bool) -> ProgramResult {
        let campaign = &mut ctx.accounts.campaign_account.load_mut()?;
        let pool = &mut ctx.accounts.pool.load_mut()?;
        let validator = *ctx.accounts.validator.key;
        campaign.update_utterance(utterance_id, status, validator);
        let utter = campaign.get_utterance(utterance_id);
        emit!(ValidateEvent {
            user: ctx.accounts.validator.key(),
            data: utter
        });
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Ctor<'info> {
    authority: AccountInfo<'info>,
    vault: CpiAccount<'info, TokenAccount>,
    mint: CpiAccount<'info, Mint>,
}

// Prevent duplicate ontology per campaign
fn check_campaign<'info>(campaign_account: &Loader<'info, CampaignAccount>) -> ProgramResult {
    let campaign = campaign_account.load()?;
    if campaign.architect == Pubkey::default() {
        Ok(())
    } else {
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
    pub token_vault: Pubkey,
    pub authority: Pubkey,
    pub head: u64,
    pub tail: u64,
    pub campaigns: [Pubkey; 128],
    pub architect_stake: u64,
    pub builder_stake: u64,
    pub validator_stake: u64,
    pub reward_apy: u8,
    pub pool_cap: u64,
    pub penalty: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Debug)]
pub enum Events {
    PoolInit,
    PoolUpdate,
    CampaignCreate,
    UtteranceSubmit,
    UtteranceValidate,
}

#[event]
pub struct SynEvent {
    pub kind: u8,
    pub user: Pubkey,
}

#[event]
pub struct ValidateEvent {
    pub user: Pubkey,
    pub data: Utterance,
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

#[derive(Accounts)]
pub struct CreateCampaign<'info> {
    #[account(zero)]
    campaign_account: Loader<'info, CampaignAccount>,
    #[account(signer)]
    architect: AccountInfo<'info>,
    #[account(mut)]
    pool: Loader<'info, PoolAccount>,
    #[account("token_program.key == &token::ID")]
    token_program: AccountInfo<'info>,
}

/// Campaign Structure
#[account(zero_copy)]
pub struct CampaignAccount {
    pub refID: u64,
    pub head: u64,
    pub tail: u64,
    pub architect: Pubkey,
    pub architect_stake_amount: u64,
    pub architect_stake_period: u64,
    pub min_builder: u64,
    pub min_validator: u64,
    pub reward_per_builder: u64,
    pub reward_per_validator: u64,
    pub validation_quorum: u8,
    pub reward_token: Pubkey,
    pub utterances: [Utterance; 256],
    pub time_limit: u64,
    pub init_limit: u64,
    pub domain: [u8; 256],
    pub subject: [u8; 256],
    pub explain: [u8; 512],
    pub phrase: [u8; 512],
    pub nonce: u8,
}

impl Default for CampaignAccount {
    fn default() -> Self {
        CampaignAccount {
            refID: 0,
            head: 0,
            tail: 0,
            architect: Pubkey::default(),
            architect_stake_amount: 0,
            architect_stake_period: 0,
            min_builder: 0,
            min_validator: 0,
            reward_per_builder: 0,
            reward_per_validator: 0,
            validation_quorum: 0,
            reward_token: Pubkey::default(),
            utterances: [Utterance::default(); 256],
            time_limit: 0,
            init_limit: 0,
            domain: [0; 256],
            subject: [0; 256],
            explain: [0; 512],
            phrase: [0; 512],
            nonce: 0,
        }
    }
}

#[zero_copy]
#[derive(AnchorSerialize, AnchorDeserialize, Debug)]
pub struct Utterance {
    pub builder: Pubkey,
    pub head: u64,
    pub validators: [Pubkey; 32],
    pub data: [u8; 256],
    pub correct: u64,
    pub incorrect: u64,
    pub finish: bool,
}

impl Default for Utterance {
    fn default() -> Self {
        Utterance {
            builder: Pubkey::default(),
            head: 0,
            validators: [Pubkey::default(); 32],
            data: [0; 256],
            correct: 0,
            incorrect: 0,
            finish: false,
        }
    }
}

#[zero_copy]
pub struct Validate {
    pub from: Pubkey,
    pub status: bool,
}

impl PoolAccount {
    fn add_campaign(&mut self, campaign: Pubkey) -> u64 {
        self.campaigns[CampaignAccount::index_of(self.head)] = campaign;
        if PoolAccount::index_of(self.head + 1) == PoolAccount::index_of(self.tail) {
            self.tail += 1;
        }
        self.head += 1;
        self.head
    }
    fn index_of(counter: u64) -> usize {
        std::convert::TryInto::try_into(counter % 256).unwrap()
    }
}

impl CampaignAccount {
    fn set_architect(&mut self, architect: Pubkey) {
        self.architect = architect;
    }
    fn add_utterance(&mut self, utterance: Utterance) -> u64 {
        self.utterances[CampaignAccount::index_of(self.head)] = utterance;
        if CampaignAccount::index_of(self.head + 1) == CampaignAccount::index_of(self.tail) {
            self.tail += 1;
        }
        self.head += 1;
        self.head
    }
    fn update_utterance(&mut self, utterance_id: u64, status: bool, validator: Pubkey) {
        match status {
            true => {
                self.utterances[utterance_id as usize].correct = self.utterances[utterance_id as usize].correct.checked_add(1).unwrap();
            }
            false => {
                self.utterances[utterance_id as usize].incorrect = self.utterances[utterance_id as usize].correct.checked_add(1).unwrap();;
            }
        }

        if self.min_validator > self.utterances[utterance_id as usize].correct {
            self.utterances[utterance_id as usize].finish = true;
        }
        self.utterances[utterance_id as usize].validators
            [self.utterances[utterance_id as usize].head as usize] = validator;
        self.utterances[utterance_id as usize].head = self.utterances[utterance_id as usize].head.checked_add(1).unwrap();;
    }
    fn get_utterance(&mut self, utterance_id: u64) -> Utterance {
        self.utterances[utterance_id as usize].clone()
    }
    fn distribute_reward(&mut self, builder: Pubkey) {}
    fn index_of(counter: u64) -> usize {
        std::convert::TryInto::try_into(counter % 512).unwrap()
    }
}

#[derive(Accounts)]
pub struct OnBuilder<'info> {
    #[account(signer)]
    pub builder: AccountInfo<'info>,
    #[account(mut)]
    pub pool: Loader<'info, PoolAccount>,
    #[account(mut)]
    pub campaign_account: Loader<'info, CampaignAccount>,
}

#[derive(Accounts)]
pub struct OnValidator<'info> {
    #[account(signer)]
    pub validator: AccountInfo<'info>,
    #[account(mut)]
    pub pool: Loader<'info, PoolAccount>,
    #[account(mut)]
    pub campaign_account: Loader<'info, CampaignAccount>,
}

#[derive(Accounts)]
pub struct Python<'info> {
    pub user: AccountInfo<'info>,
}

pub fn string_small(input: String) -> [u8; SMALL] {
    let given_input = input.as_bytes();
    let mut out = [0u8; SMALL];
    out[..given_input.len()].copy_from_slice(given_input);
    out
}

pub fn string_medium(input: String) -> [u8; MEDIUM] {
    let given_input = input.as_bytes();
    let mut out = [0u8; MEDIUM];
    out[..given_input.len()].copy_from_slice(given_input);
    out
}
