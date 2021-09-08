use anchor_lang::prelude::*;
use anchor_spl::token::{self as spl_token, Mint, TokenAccount, Transfer};

#[program]
pub mod contracts {
    use super::*;
    #[state]
    pub struct Architect {
        pub owner: Pubkey,
        pub builders : u8,
        pub validators : u8,
        pub reward_token : Pubkey
    }
    impl Architect{
        pub fn new(ctx : Context<InitArchitect>,builders : u8,validators : u8)-> Result<Self,ProgramError> {
            Ok(
                Architect{
                    owner : *ctx.accounts.architect.key,
                    builders,
                    validators,
                    reward_token : ctx.accounts.reward.key()
                }
            )
        }
    }
    pub fn initialize(ctx: Context<InitOntology>) -> ProgramResult {

        Ok(())
    }
    pub fn builder(ctx: Context<OnBuilder>) -> ProgramResult {
        Ok(())
    }
    pub fn validator(ctx: Context<OnValidator>) -> ProgramResult {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitArchitect<'info> {
    architect: AccountInfo<'info>,
    reward: CpiAccount<'info, Mint>,
}

#[derive(Accounts)]
pub struct InitOntology<'info> {
    #[account(init, payer = user)]
    pub myOntology: ProgramAccount<'info, Ontology>,
    pub user: AccountInfo<'info>,
    rent: Sysvar<'info, Rent>,
    clock: Sysvar<'info, Clock>,
    pub system_program: AccountInfo<'info>,
}

#[account]
pub struct Ontology {
    pub architect : Pubkey,
    pub utterance: String,
    pub description: String,
    pub builders : [Pubkey;5],
    pub validators : [Pubkey;3],
    pub created : u64,
    pub subject_ref: u64,
}

impl Default for Ontology {
    fn default() -> Self {
        Ontology{
            architect : Pubkey::default() ,
            utterance : "".into(),
            description : "".into(),
            builders : [Pubkey::default();5],
            validators : [Pubkey::default();3],
            created : 0,
            subject_ref: 0
        }
    }
}

#[derive(Accounts)]
pub struct OnValidator{

}

#[derive(Accounts)]
pub struct OnBuilder{

}
