use anchor_lang::prelude::*;
use anchor_lang::Account;
use anchor_spl::token::{self, Burn, Mint, MintTo, TokenAccount, Transfer};
use datafarm::{PoolAccount,Ctor,self};
use datafarm::Datafarm::PoolConfig as Pool;
declare_id!("HgaSDFf4Vc9gWajXhNCFaAC1epszwqS2zzbAhuJpA5Ev");

#[program]
pub mod Staking {
    use super::*;


    pub fn stake(ctx: Context<InitStake>) -> ProgramResult {
        let stake = &mut ctx.accounts.stake_account.load_init()?;
        let state = &mut ctx.accounts.cpi_state ;
        let cpi_accounts = Transfer {
            from: ctx.accounts.user_token.to_account_info(),
            to: ctx.accounts.pool_vault.to_account_info(),
            authority: ctx.accounts.user.clone(),
        };
        let cpi_program = ctx.accounts.token_program.clone();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        let stake_amount = state.stake.checked_mul(1000_000_000).unwrap();
        match token::transfer(cpi_ctx, stake_amount) {
            Ok(res) => {},
            Err(e) => {
                msg!("error is {:?}",e);
            }
        }
        stake.token_amount += stake_amount;
        stake.start_block = ctx.accounts.clock.slot;
        stake.lock_in_time = ctx.accounts.clock.unix_timestamp;
        stake.pending_reward = 0 ;
        stake.user_address = ctx.accounts.user_token.key() ;
        stake.status= true ;
        Ok(())
    }
    pub fn unstake(ctx: Context<CloseStake>, nonce: u8) -> ProgramResult {
        let stake = &mut ctx.accounts.stake_account.load_mut()?;
        let state = &mut ctx.accounts.cpi_state ;
        let cpi_accounts = Transfer {
            from: ctx.accounts.pool_vault.to_account_info(),
            to: ctx.accounts.user_token.to_account_info(),
            authority: ctx.accounts.system_program.clone(),
        };
        let cpi_program = ctx.accounts.token_program.clone();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        token::transfer(cpi_ctx, stake.token_amount)?;
        stake.token_amount = stake.token_amount.checked_sub(stake.token_amount).unwrap();
        stake.end_block = ctx.accounts.clock.slot;
        stake.lock_out_time = ctx.accounts.clock.unix_timestamp;
        stake.pending_reward = stake.end_block.checked_sub(stake.start_block).unwrap().checked_mul(state.reward_per_block).unwrap();
        stake.status = false ;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitStake<'info> {
    #[account(zero)]
    stake_account: Loader<'info, stakeAccount>,
    system_program: AccountInfo<'info>,
    #[account(signer)]
    user: AccountInfo<'info>,
    #[account(mut)]
    user_token: CpiAccount<'info, TokenAccount>,
    #[account(mut, state = datafarm)]
    pub cpi_state: CpiState<'info, Pool>,
    #[account(executable)]
    pub datafarm: AccountInfo<'info>,
    pub campaign: AccountInfo<'info>,
    #[account(mut)]
    pool_vault: CpiAccount<'info, TokenAccount>,
    #[account(constraint = token_program.key == &token::ID)]
    token_program: AccountInfo<'info>,
    clock: Sysvar<'info, Clock>
}

#[derive(Accounts)]
pub struct CloseStake<'info> {
    #[account(mut)]
    stake_account: Loader<'info, stakeAccount>,
    #[account(signer)]
    user: AccountInfo<'info>,
    #[account(mut)]
    user_token: CpiAccount<'info, TokenAccount>,
    #[account(mut)]
    pool_vault: CpiAccount<'info, TokenAccount>,
    #[account(mut, state = datafarm)]
    cpi_state: CpiState<'info, Pool>,
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
