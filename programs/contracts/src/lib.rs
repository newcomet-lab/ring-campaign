use anchor_lang::prelude::*;
use anchor_spl::token::{self as spl_token, Mint, TokenAccount, Transfer};

#[program]
pub mod contracts {
    use super::*;
    #[state]
    pub struct Architect {
        pub owner: Pubkey,
    }
    impl Architect{
        pub fn new(ctx : Context<InitArchitect>)-> Result<Self,ProgramError> {
            Ok(
                Architect{
                    owner : *ctx.accounts.architect.key,
                }
            )
        }
    }
    pub fn initialize(ctx: Context<InitOntology>,utterance :String,description :String) -> ProgramResult {

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
    pub my_ontology: ProgramAccount<'info, Ontology>,
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
    pub subject_ref: usize,
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
