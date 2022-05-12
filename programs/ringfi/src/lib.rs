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
mod error;

const SMALL: usize = 128;
const MEDIUM: usize = 256;

#[program]
pub mod Ringfi {
    use crate::error::FarmError;
    use super::*;

    const PDA_SEED: &[u8] = b"Staking";
    #[state]
    pub struct PoolConfig {
        pub reward_per_block: u64,
        pub mint: Pubkey,
        pub vault: Pubkey,
        pub authority: Pubkey,
        pub admin: Pubkey,
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

            // Transfer Mint Authority
            let cpi_accounts = SetAuthority {
                account_or_mint: ctx.accounts.mint.to_account_info().clone(),
                current_authority: ctx.accounts.authority.clone(),
            };
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_ctx = CpiContext::new(cpi_program.clone(), cpi_accounts);
            token::set_authority(cpi_ctx, AuthorityType::MintTokens, Some(pda))?;

            // transfer freeze authority
            let cpi_accounts_freeze = SetAuthority {
                account_or_mint: ctx.accounts.mint.to_account_info().clone(),
                current_authority: ctx.accounts.authority.clone(),
            };
            let cpi_ctx_freeze = CpiContext::new(cpi_program, cpi_accounts_freeze);
            token::set_authority(cpi_ctx_freeze, AuthorityType::FreezeAccount, Some(pda))?;

            Ok(Self {
                authority: pda.key(),
                admin :ctx.accounts.authority.key(),
                mint: ctx.accounts.mint.key(),
                vault: ctx.accounts.vault.key(),
                head: 0 as u64,
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
            reward_per_sentence: u64,
            validation_quorum: u64,
            domain: String,
            subject: String,
            explain: String,
            phrase: String,
        ) -> ProgramResult {
            let pool = &mut ctx.accounts.pool;
            let campaign = &mut ctx.accounts.CampaignAccount.load_init()?;
            let (pda, _bump_seed) =
                Pubkey::find_program_address(&[PDA_SEED], ctx.accounts.ringfi.key);
            if pool.authority != pda {
                return Err(FarmError::InvalidPDA.into())
            }
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
            campaign.reward_per_sentence = reward_per_sentence;
            campaign.validation_quorum = validation_quorum;
            campaign.architect = ctx.accounts.architect.key();
            /// later should change to emit
            msg!("{{ \"event\" : \"create_campaign\",\"refrence_id\" : \"{:?}\", \"architect\" : \"{:?}\" }}",
            campaign.refID,campaign.architect );
            Ok(())
        }

        pub fn update_reward(&mut self, ctx: Context<UpdatePool>, reward: u64) -> ProgramResult {
            if ctx.accounts.authority.key() != self.authority {
                return Err(FarmError::InvalidAuthority.into())
            }
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

    pub fn freeze(ctx: Context<Freeze>) -> ProgramResult {
        let (_pda, bump_seed) = Pubkey::find_program_address(&[PDA_SEED], ctx.program_id);
        let seeds = &[&PDA_SEED[..], &[bump_seed]];
        token::freeze_account(
            ctx.accounts.to_freezer().with_signer(&[&seeds[..]]),
        )?;
        Ok(())
    }
    pub fn thaw(ctx: Context<Thaw>) -> ProgramResult {
        let (_pda, bump_seed) = Pubkey::find_program_address(&[PDA_SEED], ctx.program_id);
        let seeds = &[&PDA_SEED[..], &[bump_seed]];
        token::thaw_account(
            ctx.accounts.to_warmer().with_signer(&[&seeds[..]]),
        )?;
        Ok(())
    }
    pub fn airdrop(ctx: Context<Airdrop>, amount:u64) -> ProgramResult {
        let (_pda, bump_seed) = Pubkey::find_program_address(&[PDA_SEED], ctx.program_id);
        let seeds = &[&PDA_SEED[..], &[bump_seed]];
        let total = amount.checked_mul(1_000_000_000).unwrap();
        token::mint_to(
            ctx.accounts.to_minter().with_signer(&[&seeds[..]]),
            total
        )?;
        Ok(())
    }
    pub fn stake(ctx: Context<Stake>) -> ProgramResult {
        let stake = &mut ctx.accounts.stake_account.load_mut()?;
        let state = &mut ctx.accounts.cpi_state;
        if stake.status {
            return Err(FarmError::UserAlreadyStakes.into())
        }

        let mut camp = ctx.accounts.campaign.load_mut()?;
        let stake_amount = match stake.role {
            // Architect
            1 => {
                camp.stake_status = true;
                stake.pending_reward +=
                    camp.validation_quorum
                        .checked_mul(camp.reward_per_sentence).unwrap()
                        .checked_div(camp.min_validator).unwrap();
                state.architect_stake.checked_mul(1000_000_000).unwrap()
            },
            // Builder
            2 => state.builder_stake.checked_mul(1000_000_000).unwrap(),
            // Validator
            3 => state.validator_stake.checked_mul(1000_000_000).unwrap(),
            _ => return Err(FarmError::InvalidRole.into()),
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
        if stake.user_address != ctx.accounts.user.key(){
            return Err(FarmError::InvalidStakeOwner.into())
        }
        if stake.campaign_address != ctx.accounts.campaign.key(){
            return Err(FarmError::InvalidStakeCampaign.into())
        }
        if ctx.accounts.user.key() != ctx.accounts.user_token.owner.key() {
            return Err(FarmError::InvalidTokenOwner.into())
        }
        if ctx.accounts.user_token.mint.key() != camp.reward_token {
            return Err(FarmError::InvalidTokenMint.into())
        }
        if !stake.status {
            return Err(FarmError::InvalidStakeAccount.into())
        }
        if !stake.rewarded {
            return Err(FarmError::InvalidOrder.into())
        }
        /*if !camp.finish {
            return Err(FarmError::UnstakeProhibted.into())
        }*/


        let (_pda, bump_seed) = Pubkey::find_program_address(&[PDA_SEED], ctx.program_id);
        let seeds = &[&PDA_SEED[..], &[bump_seed]];
        stake.end_block = ctx.accounts.clock.slot;
        stake.lock_out_time = ctx.accounts.clock.unix_timestamp;
        token::transfer(
            ctx.accounts.to_taker().with_signer(&[&seeds[..]]),
            stake.token_amount,
        )?;
        stake.status = false;

        stake.token_amount = 0 ;

        Ok(())
    }
    pub fn redeem_reward(ctx:Context<RedeemReward>) ->ProgramResult {
        let stake = &mut ctx.accounts.stake_account.load_mut()?;
        let camp = &mut ctx.accounts.campaign.load_mut()?;
        let state = &mut ctx.accounts.cpi_state;
        if !stake.status {
            return Err(FarmError::InvalidStakeAccount.into())
        }
        if stake.rewarded {
            return Err(FarmError::RewardReedemedBefore.into())
        }
     /*   if !camp.finish {
            return Err(FarmError::UnstakeProhibted.into())
        }*/
        // calculate reward for architect
        if stake.role == 1 {
            stake.pending_reward = camp.reward_per_sentence
                .checked_mul(camp.sentence_approved).unwrap();
        }
        let (_pda, bump_seed) = Pubkey::find_program_address(&[PDA_SEED], ctx.program_id);
        let seeds = &[&PDA_SEED[..], &[bump_seed]];
        token::mint_to(
            ctx.accounts.to_minter().with_signer(&[&seeds[..]]),
            stake.pending_reward
                .checked_mul(1_000_000_000).unwrap(),
        )?;
        stake.rewarded = true;
        Ok(())
    }
    pub fn submit_sentence(ctx: Context<InitSentenceAccount>, msg: String) -> ProgramResult {
        let mut sentence = ctx.accounts.sentence_account.load_init()?;
        let campaign = &mut ctx.accounts.campaign_account.load_mut()?;
        let stake = &mut ctx.accounts.stake_account.load_mut()?;
        if stake.user_address != ctx.accounts.builder.key() {
            return Err(FarmError::InvalidRole.into());
        }
        if stake.campaign_address != ctx.accounts.campaign_account.key() {
            return Err(FarmError::InvalidStakeCampaign.into())
        }
        if !stake.status {
            return Err(FarmError::InvalidStakeAccount.into())
        }
        if stake.role != 2  {
            return Err(FarmError::WrongBuilderRole.into());
        }
        stake.pending_reward = stake.pending_reward.checked_add(campaign.reward_per_sentence ).unwrap();
        let given_msg = msg.as_bytes();
        let mut data = [0u8; 256];
        data[..given_msg.len()].copy_from_slice(given_msg);
        sentence.data = data ;
        sentence.finish =false ;
        sentence.builder = ctx.accounts.builder.key();
        sentence.campaign = ctx.accounts.campaign_account.key();
        let head = campaign.head.clone() as usize;
        campaign.sentences[head] = ctx.accounts.sentence_account.key();
        campaign.head +=1;

        /// later should change to emit
        msg!(
            "{{ \"event\" : \"submit_sentence\",\
            \"sentence_id\" : \"{}\",\
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
        let sentence = &mut ctx.accounts.sentence_account.load_mut()?;
        let campaign = &mut ctx.accounts.campaign_account.load_mut()?;
        let stake = &mut ctx.accounts.stake_account.load_mut()?;
        if stake.user_address != ctx.accounts.validator.key() {
            return Err(FarmError::InvalidRole.into());
        }
        if stake.campaign_address != ctx.accounts.campaign_account.key() {
            return Err(FarmError::InvalidStakeCampaign.into())
        }
        if !stake.status {
            return Err(FarmError::InvalidStakeAccount.into())
        }
        if stake.role != 3  {
            return Err(FarmError::WrongValidatorRole.into());
        }
        let validator = *ctx.accounts.validator.key;
        stake.pending_reward = stake.pending_reward.checked_add(campaign.reward_per_sentence ).unwrap();
        match status {
            true => {
                sentence.correct = sentence
                    .correct
                    .checked_add(1)
                    .unwrap();
            }
            false => {
                sentence.incorrect = sentence
                    .incorrect
                    .checked_add(1)
                    .unwrap();
            }
        }

        if sentence.correct >= campaign.min_validator {
            sentence.finish = true;
            campaign.sentence_approved += 1;
            if campaign.sentence_approved >= campaign.validation_quorum  {
                campaign.finish = true;
            }

            msg!(
                "{{ \"event\" : \"validate_sentence\",\
            \"sentence_address\" : \"{:?}\",\
            \"data\" : \"{:?}\",\
            \"campaign_topic\" : \"{:?}\",\
            \"campaign_subject\" : \"{:?}\",\
            \"validator\" : \"{:?}\",\
            \"builder\" : \"{:?}\",\
            \"correct\" : \"{:?}\",\
            \"incorrect\" : \"{:?}\",\
            \"finish\" : \"{:?}\"\
          }}",
                ctx.accounts.sentence_account.key(),
                sentence.data,
                campaign.domain,
                campaign.subject,
                ctx.accounts.validator.key(),
                sentence.builder,
                sentence.correct,
                sentence.incorrect,
                sentence.finish
            );
        }
        let uhead = sentence.head as usize;
        sentence.validators
            [uhead] = validator;
        sentence.head = sentence
            .head
            .checked_add(1)
            .unwrap();
        /// later should change to emit
        Ok(())
    }
}


#[derive(Accounts)]
pub struct Airdrop<'info> {
    #[account(mut)]
    user_token: CpiAccount<'info, TokenAccount>,
    #[account(mut)]
    token_mint: CpiAccount<'info, Mint>,
    pda_account: AccountInfo<'info>,
    token_program: AccountInfo<'info>,
    pub(crate) clock: Sysvar<'info, Clock>,
}
impl<'info> Airdrop<'info> {

    pub(crate) fn to_minter(&self) -> CpiContext<'_, '_, '_, 'info, MintTo<'info>> {
        let cpi_accounts = MintTo {
            mint: self.token_mint.to_account_info().clone(),
            to: self.user_token.to_account_info().clone(),
            authority: self.pda_account.clone(),
        };
        let cpi_program = self.token_program.to_account_info();
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
