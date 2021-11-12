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
        stake.status = false;
        stake.role = role;
        Ok(())
    }

    pub fn stake(ctx: Context<Stake>) -> ProgramResult {
        let stake = &mut ctx.accounts.stake_account.load_mut()?;
        let state = &mut ctx.accounts.cpi_state;
        let cpi_accounts = Transfer {
            from: ctx.accounts.user_token.to_account_info(),
            to: ctx.accounts.pool_vault.to_account_info(),
            authority: ctx.accounts.user.clone(),
        };
        let cpi_program = ctx.accounts.token_program.clone();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        let stake_amount = match stake.role {
            1 => state.architect_stake.checked_mul(1000_000_000).unwrap(),
            2 => state.builder_stake.checked_mul(1000_000_000).unwrap(),
            3 => state.validator_stake.checked_mul(1000_000_000).unwrap(),
            _ => return Err(ProgramError::InvalidAccountData),
        };
        let mut camp = ctx.accounts.campaign.load_mut()?;
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
        stake.status = true;
        camp.stake_status = true;
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
        let state = &mut ctx.accounts.cpi_state;
        let (_pda, bump_seed) = Pubkey::find_program_address(&[PDA_SEED], ctx.program_id);
        let seeds = &[&PDA_SEED[..], &[bump_seed]];

        stake.end_block = ctx.accounts.clock.slot;
        stake.lock_out_time = ctx.accounts.clock.unix_timestamp;
        stake.pending_reward = stake
            .end_block
            .checked_sub(stake.start_block)
            .unwrap()
            .checked_mul(state.reward_per_block)
            .unwrap()
            .checked_mul(1_000_000_000)
            .unwrap();
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
        camp.stake_status = false;
        Ok(())
    }
    //#[access_control(CreateCampaign::accounts(&ctx, nonce))]
    pub fn utterance(ctx: Context<OnBuilder>, msg: String) -> ProgramResult {
        let campaign = &mut ctx.accounts.campaign_account.load_mut()?;
        let stake = &mut ctx.accounts.stake_account.load()?;
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
        let stake = &mut ctx.accounts.stake_account.load()?;
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
        let pool = &mut ctx.accounts.pool;
        let validator = *ctx.accounts.validator.key;
        campaign.update_utterance(utterance_id, status, validator);
        let utter = campaign.get_utterance(utterance_id);
        /// later should change to emit
        Ok(())
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
