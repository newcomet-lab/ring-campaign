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

#[derive(Accounts)]
pub struct initPool<'info> {
    #[account(zero)]
    pub pool_account: Loader<'info, PoolAccount>,
    pub pool_authority: AccountInfo<'info>,
    #[account(mut, constraint = sns.owner == pool_authority.key)]
    pub sns: AccountInfo<'info>,
}
#[account(zero_copy)]
pub struct PoolAccount {
    pub sns_mint: Pubkey,
    pub distribution_authority: Pubkey
}

#[derive(Accounts)]
pub struct updatePool<'info> {
    #[account(signer)]
    authority: AccountInfo<'info>
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

#[derive(Accounts)]
pub struct InitCampaign<'info>  {
    #[account(zero)]
    pub campaign: Loader<'info, Campaign>,
}

#[account(zero_copy)]
pub struct Campaign {
    refID : u64,
    head: u64,
    tail: u64,
    title: [u8; 280],
    utterances: [Utterance; 33607],
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

impl Campaign {
    fn build(&mut self, msg: Utterance) {

    }
    fn index_of(counter: u64) -> usize {
        std::convert::TryInto::try_into(counter % 33607).unwrap()
    }
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
#[zero_copy]
pub struct Utterance {
    pub from: Pubkey,
    pub data: [u8; 280],
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


