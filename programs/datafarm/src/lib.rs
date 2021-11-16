#![feature(use_extern_macros)]
use account::*;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::program_option::COption;
use anchor_spl::token::{self, Burn, Mint, MintTo, SetAuthority, TokenAccount, Transfer, ID};
use context::*;
use spl_token::instruction::AuthorityType;
use std::fmt::{self, Debug, Display};
use std::io::Write;

mod account;
mod context;

const SMALL: usize = 128;
const MEDIUM: usize = 256;

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
        pub campaigns: [Pubkey; 20],
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
            let (pda, _bump_seed) =
                Pubkey::find_program_address(&[PDA_SEED], ctx.accounts.staking_program.key);
            token::set_authority(ctx.accounts.into(), AuthorityType::AccountOwner, Some(pda))?;

            let cpi_accounts = SetAuthority {
                account_or_mint: ctx.accounts.mint.to_account_info().clone(),
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
                campaigns: [Pubkey::default(); 20],
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
            validation_quorum: u64,
            domain: String,
            subject: String,
            explain: String,
            phrase: String,
        ) -> ProgramResult {
            let pool = &mut ctx.accounts.pool;
            let campaign = &mut ctx.accounts.CampaignAccount.load_init()?;
            self.campaigns[self.head as usize] = ctx.accounts.CampaignAccount.key();
            self.head += 1;
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
            campaign.architect = ctx.accounts.architect.key();
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
    pub fn init_stake_account(ctx: Context<InitStakeAccount>, bump: u8, role: u8) -> ProgramResult {
        let mut stake = ctx.accounts.stake_account.load_init()?;
        stake.user_address = ctx.accounts.authority.key();
        stake.bump = bump;
        stake.role = role;
        Ok(())
    }

    pub fn stake(ctx: Context<Stake>) -> ProgramResult {
        let stake = &mut ctx.accounts.stake_account.load_mut()?;
        let state = &mut ctx.accounts.cpi_state;
        if stake.status {
            return Err(ProgramError::AccountAlreadyInitialized)
        }
        let mut camp = ctx.accounts.campaign.load_mut()?;
        let stake_amount = match stake.role {
            // Architect
            1 => {
                camp.stake_status = true;
                stake.pending_reward +=
                    camp.validation_quorum
                        .checked_mul(camp.reward_per_validator).unwrap()
                        .checked_div(camp.min_validator).unwrap();
                state.architect_stake.checked_mul(1000_000_000).unwrap()
            },
            // Builder
            2 => state.builder_stake.checked_mul(1000_000_000).unwrap(),
            // Validator
            3 => state.validator_stake.checked_mul(1000_000_000).unwrap(),
            _ => return Err(ProgramError::Custom(22)),
        };

        let cpi_accounts = Transfer {
            from: ctx.accounts.user_token.to_account_info(),
            to: ctx.accounts.pool_vault.to_account_info(),
            authority: ctx.accounts.user.clone(),
        };
        let cpi_program = ctx.accounts.token_program.clone();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        match token::transfer(cpi_ctx, stake_amount) {
            Ok(res) => {}
            Err(e) => {
                return Err(e)
            }
        }
        stake.token_amount += stake_amount;
        stake.start_block = ctx.accounts.clock.slot;
        stake.lock_in_time = ctx.accounts.clock.unix_timestamp;
        stake.pending_reward = 0;
        stake.token_address = ctx.accounts.user_token.key();
        stake.user_address = ctx.accounts.user.key();
        stake.status = true;

        camp.stakeAccount = ctx.accounts.stake_account.key();
        stake.campaign_address = ctx.accounts.campaign.key();
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
        let camp = &mut ctx.accounts.campaign.load_mut()?;
        let state = &mut ctx.accounts.cpi_state;
        if !stake.status {
            return Err(ProgramError::InsufficientFunds)
        }
        if !stake.rewarded {
            return Err(ProgramError::InvalidInstructionData)
        }
        if !camp.finish {
            return Err(ProgramError::InvalidInstructionData)
        }

        let (_pda, bump_seed) = Pubkey::find_program_address(&[PDA_SEED], ctx.program_id);
        let seeds = &[&PDA_SEED[..], &[bump_seed]];
        stake.end_block = ctx.accounts.clock.slot;
        stake.lock_out_time = ctx.accounts.clock.unix_timestamp;
        token::transfer(
            ctx.accounts.to_taker().with_signer(&[&seeds[..]]),
            stake.token_amount,
        )?;
        stake.status = false;

        stake.token_amount = stake.token_amount.checked_sub(stake.token_amount).unwrap();
        camp.stake_status = false;

        Ok(())
    }
    pub fn redeem_reward(ctx:Context<RedeemReward>) ->ProgramResult {
        let stake = &mut ctx.accounts.stake_account.load_mut()?;
        let camp = &mut ctx.accounts.campaign.load_mut()?;
        let state = &mut ctx.accounts.cpi_state;
        if !stake.status {
            return Err(ProgramError::InsufficientFunds)
        }
        if stake.rewarded {
            return Err(ProgramError::InvalidInstructionData)
        }
        if !camp.finish {
            return Err(ProgramError::InvalidInstructionData)
        }

        let (_pda, bump_seed) = Pubkey::find_program_address(&[PDA_SEED], ctx.program_id);
        let seeds = &[&PDA_SEED[..], &[bump_seed]];
        token::mint_to(
            ctx.accounts.to_minter().with_signer(&[&seeds[..]]),
            stake.pending_reward
                .checked_mul(1_000_000_000)
                .unwrap(),
        )?;
        stake.rewarded = true;
        Ok(())
    }
    pub fn submit_utterance(ctx: Context<InitUtteranceAccount>, msg: String) -> ProgramResult {
        let mut utterance = ctx.accounts.utterance_account.load_init()?;
        let campaign = &mut ctx.accounts.campaign_account.load_mut()?;
        let stake = &mut ctx.accounts.stake_account.load_mut()?;
        if stake.user_address != ctx.accounts.builder.key() {
            return Err(ProgramError::InvalidAccountData);
        }
        if stake.campaign_address != ctx.accounts.campaign_account.key() {
            return Err(ProgramError::InvalidAccountData);
        }
        if !stake.status {
            return Err(ProgramError::InvalidAccountData);
        }
        if stake.role != 2  {
            return Err(ProgramError::InvalidAccountData);
        }
        stake.pending_reward = stake.pending_reward.checked_add(campaign.reward_per_builder ).unwrap();
        let given_msg = msg.as_bytes();
        let mut data = [0u8; 256];
        data[..given_msg.len()].copy_from_slice(given_msg);
        utterance.data = data ;
        utterance.finish =false ;
        utterance.builder = ctx.accounts.builder.key();
        utterance.campaign = ctx.accounts.campaign_account.key();
        let head = campaign.head.clone() as usize;
        campaign.utterances[head] = ctx.accounts.utterance_account.key();
        campaign.head +=1;

        /// later should change to emit
        msg!(
            "{{ \"event\" : \"submit_utterance\",\
            \"utterance_id\" : \"{}\",\
            \"builder\" : \"{}\",\
            \"architect\" : \"{}\"\
            }}",
            campaign.head-1,
            ctx.accounts.builder.key(),
            campaign.architect
        );
        Ok(())
    }


    pub fn validate(ctx: Context<OnValidator>, status: bool) -> ProgramResult {
        let utterance = &mut ctx.accounts.utterance_account.load_mut()?;
        let campaign = &mut ctx.accounts.campaign_account.load_mut()?;
        let stake = &mut ctx.accounts.stake_account.load_mut()?;
        if stake.user_address != ctx.accounts.validator.key() {
            return Err(ProgramError::InvalidAccountData);
        }
        if stake.campaign_address != ctx.accounts.campaign_account.key() {
            return Err(ProgramError::InvalidAccountData);
        }
        if !stake.status {
            return Err(ProgramError::InvalidAccountData);
        }
        if stake.role != 3  {
            return Err(ProgramError::InvalidAccountData);
        }
        let validator = *ctx.accounts.validator.key;
        stake.pending_reward = stake.pending_reward.checked_add(campaign.reward_per_validator ).unwrap();
        match status {
            true => {
                utterance.correct = utterance
                    .correct
                    .checked_add(1)
                    .unwrap();
            }
            false => {
                utterance.incorrect = utterance
                    .incorrect
                    .checked_add(1)
                    .unwrap();
            }
        }

        if utterance.correct >= campaign.min_validator {
            utterance.finish = true;
            campaign.utterance_approved += 1;
            if campaign.utterance_approved >= campaign.validation_quorum  {
                campaign.finish = true;
            }

            msg!(
                "{{ \"event\" : \"validate_utterance\",\
            \"utterance_address\" : \"{:?}\",\
            \"data\" : \"{:?}\",\
            \"validator\" : \"{:?}\",\
            \"builder\" : \"{:?}\",\
            \"correct\" : \"{:?}\",\
            \"incorrect\" : \"{:?}\",\
            \"finish\" : \"{:?}\"\
          }}",
                ctx.accounts.utterance_account.key(),
                utterance.data,
                ctx.accounts.validator.key(),
                utterance.builder,
                utterance.correct,
                utterance.incorrect,
                utterance.finish
            );
        }
        let uhead = utterance.head as usize;
        utterance.validators
            [uhead] = validator;
        utterance.head = utterance
            .head
            .checked_add(1)
            .unwrap();
        /// later should change to emit
        Ok(())
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
