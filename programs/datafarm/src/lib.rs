#![feature(use_extern_macros)]

use std::fmt::{self, Debug, Display};
use std::io::Write;
use anchor_lang::solana_program::program_option::COption;
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Burn, Mint, MintTo,SetAuthority, TokenAccount, Transfer, ID};
use serde::{Deserialize, Serialize};
use serde_json::{json, Deserializer, Serializer};
use spl_token::instruction::AuthorityType;
use Datafarm::PoolConfig as PoolState;
use crate::Datafarm::PoolConfig;

const SMALL: usize = 256;
const MEDIUM: usize = 512;

#[program]
pub mod Datafarm {
    use super::*;
    const PDA_SEED: &[u8] = b"Staking";
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
        pub fn new(
            ctx: Context<InitPool>,
            architect_stake: u64,
            builder_stake: u64,
            validator_stake: u64,
            reward_apy: u8,
            pool_cap: u64,
            penalty: u64,
            reward_per_block: u64,
        ) -> Result<Self, ProgramError> {
            let (pda, _bump_seed) = Pubkey::find_program_address(&[PDA_SEED], ctx.accounts.staking_program.key);
            token::set_authority(ctx.accounts.into(), AuthorityType::AccountOwner, Some(pda))?;

            let cpi_accounts = SetAuthority {
                account_or_mint: ctx.accounts
                    .mint
                    .to_account_info()
                    .clone(),
                current_authority: ctx.accounts.authority.clone(),
            };
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
            token::set_authority(cpi_ctx, AuthorityType::MintTokens, Some(pda))?;

            Ok(Self {
                authority: pda.key(),
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
        pub fn create_campaign(
            &mut self,
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
            let pool = &mut ctx.accounts.pool;
            let campaign = &mut ctx.accounts.CampaignAccount.load_init()?;
            self.campaigns[self.head as usize] = ctx.accounts.CampaignAccount.key();
            self.head +=1;
            campaign.reward_token = pool.mint;
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
            campaign.set_architect(ctx.accounts.CampaignAccount.key());
            /// later should change to emit
            msg!("{{ \"event\" : \"create_campaign\",\"refrence_id\" : \"{:?}\", \"architect\" : \"{:?}\" }}",
            campaign.refID,campaign.architect );
            Ok(())
        }

        pub fn update_reward(&mut self, ctx: Context<UpdatePool>, reward: u64) -> ProgramResult {
            self.reward_per_block = reward;
            Ok(())
        }
    }


    pub fn stake(ctx: Context<InitStake>) -> ProgramResult {
        let stake = &mut ctx.accounts.stake_account.load_init()?;
        let state = &mut ctx.accounts.cpi_state;
        let cpi_accounts = Transfer {
            from: ctx.accounts.user_token.to_account_info(),
            to: ctx.accounts.pool_vault.to_account_info(),
            authority: ctx.accounts.user.clone(),
        };
        let cpi_program = ctx.accounts.token_program.clone();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        let stake_amount = state.architect_stake.checked_mul(1000_000_000).unwrap();
        match token::transfer(cpi_ctx, stake_amount) {
            Ok(res) => {}
            Err(e) => {
                msg!("error is {:?}", e);
            }
        }
        stake.token_amount += stake_amount;
        stake.start_block = ctx.accounts.clock.slot;
        stake.lock_in_time = ctx.accounts.clock.unix_timestamp;
        stake.pending_reward = 0;
        stake.token_address = ctx.accounts.user_token.key();
        stake.user_address = ctx.accounts.user.key();
        stake.
        stake.status = true;
         let mut camp = ctx.accounts.campaign.load_mut()?;
         camp.stake_status = true ;

        msg!(
            "{{ \"event\" : \"stake\",\
            \"amount\" : \"{}\",\
            \"start_block\" : \"{}\",\
            \"start_time\" : \"{}\"\
          }}",
            stake.token_amount,
            stake.start_block,
            stake.lock_in_time
        );
        Ok(())
    }

    pub fn unstake(ctx: Context<CloseStake>) -> ProgramResult {
        let stake = &mut ctx.accounts.stake_account.load_mut()?;
        let state = &mut ctx.accounts.cpi_state;
        let (_pda, bump_seed) = Pubkey::find_program_address(&[PDA_SEED], ctx.program_id);
        let seeds = &[&PDA_SEED[..], &[bump_seed]];

        stake.end_block = ctx.accounts.clock.slot;
        stake.lock_out_time = ctx.accounts.clock.unix_timestamp;
        stake.pending_reward = stake
            .end_block
            .checked_sub(stake.start_block).unwrap()
            .checked_mul(state.reward_per_block).unwrap()
            .checked_mul(1_000_000_000).unwrap();
        stake.status = false;
        token::transfer(
            ctx.accounts.to_taker().with_signer(&[&seeds[..]]),
            stake.token_amount,
        )?;
        token::mint_to(
            ctx.accounts.to_minter().with_signer(&[&seeds[..]]),
            stake.pending_reward,
        )?;
        stake.token_amount = stake.token_amount.checked_sub(stake.token_amount).unwrap();
        let mut camp = ctx.accounts.campaign.load_mut()?;
        camp.stake_status = false ;
        Ok(())
    }
    //#[access_control(CreateCampaign::accounts(&ctx, nonce))]
    pub fn utterance(ctx: Context<OnBuilder>, msg: String) -> ProgramResult {
        let campaign = &mut ctx.accounts.campaign_account.load_mut()?;
        let pool = &mut ctx.accounts.pool;
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
        /// later should change to emit
        msg!(
            "{{ \"event\" : \"submit_utterance\",\
            \"utterance_id\" : \"{}\",\
            \"builder\" : \"{}\",\
            \"architect\" : \"{}\"\
            }}",
            last_id,
            ctx.accounts.builder.key(),
            campaign.architect
        );
        Ok(())
    }

    pub fn validate(ctx: Context<OnValidator>, utterance_id: u64, status: bool) -> ProgramResult {
        let campaign = &mut ctx.accounts.campaign_account.load_mut()?;
        let pool = &mut ctx.accounts.pool;
        let validator = *ctx.accounts.validator.key;
        campaign.update_utterance(utterance_id, status, validator);
        let utter = campaign.get_utterance(utterance_id);
        /// later should change to emit

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Empty {}

#[derive(Accounts)]
pub struct InitPool<'info> {
    #[account(signer)]
    authority: AccountInfo<'info>,
    staking_program: AccountInfo<'info>,
    #[account(mut,
    constraint = vault.owner == *authority.key)]
    vault: CpiAccount<'info, TokenAccount>,
    #[account(mut)]
    mint: CpiAccount<'info, Mint>,
    #[account("token_program.key == &token::ID")]
    token_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct UpdatePool<'info> {
    authority: AccountInfo<'info>,
}
impl<'info> From<&mut InitPool<'info>>
for CpiContext<'_, '_, '_, 'info, SetAuthority<'info>>
{
    fn from(accounts: &mut InitPool<'info>) -> Self {
        let cpi_accounts = SetAuthority {
            account_or_mint: accounts
                .vault
                .to_account_info()
                .clone(),
            current_authority: accounts.authority.clone(),
        };
        let cpi_program = accounts.token_program.to_account_info();
        CpiContext::new(cpi_program, cpi_accounts)
    }

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

/// Structure for access list checking
#[derive(Accounts)]
pub struct Auth<'info> {
    #[account(signer)]
    authority: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct CreateCampaign<'info> {
    #[account(zero)]
    CampaignAccount: Loader<'info, CampaignAccount>,
    #[account(signer)]
    architect: AccountInfo<'info>,
    #[account(mut, state = datafarm)]
    pub pool: CpiState<'info, PoolConfig>,
    #[account(executable)]
    pub datafarm: AccountInfo<'info>,
    #[account("token_program.key == &token::ID")]
    token_program: AccountInfo<'info>,
}
#[derive(Accounts)]
pub struct StakeCampaign<'info> {
    #[account(mut)]
    pub campaign_account: Loader<'info, CampaignAccount>,
    #[account(signer)]
    pub architect: AccountInfo<'info>,
    #[account("token_program.key == &token::ID")]
    pub token_program: AccountInfo<'info>,
}

/// Campaign Structure
#[account(zero_copy)]
pub struct CampaignAccount {
    pub refID: u64,
    pub head: u64,
    pub tail: u64,
    pub architect: Pubkey,
    pub stake_status: bool,
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
            stake_status: false,
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
#[derive(Debug)]
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
                self.utterances[utterance_id as usize].correct = self.utterances
                    [utterance_id as usize]
                    .correct
                    .checked_add(1)
                    .unwrap();
            }
            false => {
                self.utterances[utterance_id as usize].incorrect = self.utterances
                    [utterance_id as usize]
                    .incorrect
                    .checked_add(1)
                    .unwrap();
            }
        }

        if self.utterances[utterance_id as usize].correct > self.min_validator  {
            self.utterances[utterance_id as usize].finish = true;
            msg!(
            "{{ \"event\" : \"validate_utterance\",\
            \"utterance_id\" : \"{:?}\",\
            \"data\" : \"{:?}\",\
            \"validator\" : \"{:?}\",\
            \"builder\" : \"{:?}\",\
            \"correct\" : \"{:?}\",\
            \"incorrect\" : \"{:?}\",\
            \"finish\" : \"{:?}\"\
          }}",
            utterance_id,
            self.utterances[utterance_id as usize].data,
            validator,
            self.utterances[utterance_id as usize].builder,
            self.utterances[utterance_id as usize].correct,
            self.utterances[utterance_id as usize].incorrect,
            self.utterances[utterance_id as usize].finish
        );
        }
        self.utterances[utterance_id as usize].validators
            [self.utterances[utterance_id as usize].head as usize] = validator;
        self.utterances[utterance_id as usize].head = self.utterances[utterance_id as usize]
            .head
            .checked_add(1)
            .unwrap();
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
    #[account(mut, state = datafarm)]
    pub pool: CpiState<'info, PoolConfig>,
    #[account(executable)]
    pub datafarm: AccountInfo<'info>,
    #[account(mut)]
    pub campaign_account: Loader<'info, CampaignAccount>,
}

#[derive(Accounts)]
pub struct OnValidator<'info> {
    #[account(signer)]
    pub validator: AccountInfo<'info>,
    #[account(mut, state = datafarm)]
    pub pool: CpiState<'info, PoolConfig>,
    #[account(executable)]
    pub datafarm: AccountInfo<'info>,
    #[account(mut)]
    pub campaign_account: Loader<'info, CampaignAccount>,
}

impl<'info> CloseStake<'info> {
    fn to_taker(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        let cpi_accounts = Transfer {
            from: self.pool_vault.to_account_info().clone(),
            to: self.user_token.to_account_info().clone(),
            authority: self.pda_account.clone(),
        };
        let cpi_program = self.token_program.to_account_info();
        CpiContext::new(cpi_program, cpi_accounts)
    }
    fn to_minter(&self) -> CpiContext<'_, '_, '_, 'info, MintTo<'info>> {
        let cpi_accounts = MintTo {
            mint: self.token_mint.to_account_info().clone(),
            to: self.user_token.to_account_info().clone(),
            authority: self.pda_account.clone(),
        };
        let cpi_program = self.token_program.to_account_info();
        CpiContext::new(cpi_program, cpi_accounts)
    }
}

#[derive(Accounts)]
pub struct InitStake<'info> {
    #[account(zero)]
    stake_account: Loader<'info, stakeAccount>,
    #[account(signer)]
    user: AccountInfo<'info>,
    #[account(mut,
    constraint = user_token.amount >= cpi_state.architect_stake,
    constraint = user_token.owner == *user.key
    )]
    user_token: CpiAccount<'info, TokenAccount>,
    #[account(mut, state = datafarm)]
    pub cpi_state: CpiState<'info, PoolConfig>,
    #[account(executable)]
    pub datafarm: AccountInfo<'info>,
    #[account(mut)]
    pub campaign: Loader<'info,CampaignAccount>,
    #[account(mut)]
    pool_vault: CpiAccount<'info, TokenAccount>,
    #[account(constraint = token_program.key == & token::ID)]
    token_program: AccountInfo<'info>,
    clock: Sysvar<'info, Clock>,
}

#[derive(Accounts)]
pub struct CloseStake<'info> {
    #[account(mut)]
    stake_account: Loader<'info, stakeAccount>,
    user: AccountInfo<'info>,
    #[account(mut,
    constraint = user_token.amount >= cpi_state.architect_stake)]
    user_token: CpiAccount<'info, TokenAccount>,
    #[account(mut)]
    pool_vault: CpiAccount<'info, TokenAccount>,
    #[account(mut)]
    token_mint: CpiAccount<'info, Mint>,
    pda_account: AccountInfo<'info>,
    #[account(mut, state = datafarm)]
    cpi_state: CpiState<'info, PoolConfig>,
    #[account(mut)]
    pub campaign: Loader<'info,CampaignAccount>,
    #[account(executable)]
    datafarm: AccountInfo<'info>,
    system_program: AccountInfo<'info>,
    token_program: AccountInfo<'info>,
    clock: Sysvar<'info, Clock>,
}

#[account(zero_copy)]
pub struct stakeAccount {
    pub token_amount: u64,
    pub lock_in_time: i64,
    pub start_block: u64,
    pub lock_out_time: i64,
    pub end_block: u64,
    pub weight: u64,
    pub pending_reward: u64,
    pub status: bool,
    pub token_address: Pubkey,
    pub user_address: Pubkey,
}

impl<'a, 'b, 'c, 'info> From<&InitStake<'info>> for CpiContext<'a, 'b, 'c, 'info, Transfer<'info>> {
    fn from(accounts: &InitStake<'info>) -> CpiContext<'a, 'b, 'c, 'info, Transfer<'info>> {
        let cpi_accounts = Transfer {
            from: accounts.user_token.to_account_info(),
            to: accounts.pool_vault.to_account_info(),
            authority: accounts.user.to_account_info(),
        };
        let cpi_program = accounts.token_program.to_account_info();
        CpiContext::new(cpi_program, cpi_accounts)
    }
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
pub fn pindex_of(counter: u64) -> usize {
    std::convert::TryInto::try_into(counter % 256).unwrap()
}