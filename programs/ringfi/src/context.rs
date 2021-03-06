use crate::account::*;
use crate::Ringfi::PoolConfig;
use anchor_lang::prelude::*;
use anchor_lang::Accounts;
use anchor_spl::token::{self, Burn, Mint, MintTo, SetAuthority, TokenAccount, Transfer, ID, FreezeAccount, ThawAccount};

#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct InitStakeAccount<'info> {
    #[account(
    init,
    seeds = [
            authority.key.as_ref(),
            campaign.key.as_ref(),
            b"staking".as_ref()
            ],
    bump = bump,
    payer = authority,
    )]
    pub stake_account: Loader<'info, stakeAccount>,
    #[account(mut, signer)]
    pub authority: AccountInfo<'info>,
    pub campaign: AccountInfo<'info>,
    pub system_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct InitSentenceAccount<'info> {
    #[account(zero)]
    pub(crate) sentence_account: Loader<'info, SentenceAccount>,
    #[account(mut, signer)]
    pub builder: AccountInfo<'info>,
    #[account(mut)]
    pub campaign_account: Loader<'info,CampaignAccount>,
    #[account(mut)]
    pub stake_account: Loader<'info,stakeAccount>,
    pub system_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(mut)]
    pub(crate) stake_account: Loader<'info, stakeAccount>,
    #[account(signer)]
    pub(crate) user: AccountInfo<'info>,
    #[account(mut,
    constraint = user_token.amount >= cpi_state.architect_stake,
    constraint = user_token.owner == *user.key
    )]
    pub(crate) user_token: CpiAccount<'info, TokenAccount>,
    #[account(mut, state = ringfi)]
    pub cpi_state: CpiState<'info, PoolConfig>,
    #[account(executable)]
    pub ringfi: AccountInfo<'info>,
    #[account(mut)]
    pub campaign: Loader<'info, CampaignAccount>,
    #[account(mut)]
    pub(crate) pool_vault: CpiAccount<'info, TokenAccount>,
    #[account(constraint = token_program.key == & token::ID)]
    pub(crate) token_program: AccountInfo<'info>,
    pub(crate) clock: Sysvar<'info, Clock>,
}

#[derive(Accounts)]
pub struct InitPool<'info> {
    #[account(signer)]
    pub authority: AccountInfo<'info>,
    pub staking_program: AccountInfo<'info>,
    #[account(mut)]
    pub pda: AccountInfo<'info>,
    #[account(mut,
    constraint = vault.owner == *authority.key)]
    pub vault: CpiAccount<'info, TokenAccount>,
    #[account(mut)]
    pub mint: CpiAccount<'info, Mint>,
    #[account("token_program.key == &token::ID")]
    pub token_program: AccountInfo<'info>,
}


#[derive(Accounts)]
pub struct Freeze<'info> {
    #[account(mut)]
    user_token: CpiAccount<'info, TokenAccount>,
    #[account(mut)]
    token_mint: CpiAccount<'info, Mint>,
    pda_account: AccountInfo<'info>,
    token_program: AccountInfo<'info>,
    pub(crate) clock: Sysvar<'info, Clock>,
}
impl<'info> Freeze<'info> {
    pub(crate) fn to_freezer(&self) -> CpiContext<'_, '_, '_, 'info, FreezeAccount<'info>> {
        let cpi_accounts = FreezeAccount {
            mint: self.token_mint.to_account_info().clone(),
            account: self.user_token.to_account_info().clone(),
            authority: self.pda_account.clone(),
        };
        let cpi_program = self.token_program.to_account_info();
        CpiContext::new(cpi_program, cpi_accounts)
    }
}
#[derive(Accounts)]
pub struct Thaw<'info> {
    #[account(mut)]
    user_token: CpiAccount<'info, TokenAccount>,
    #[account(mut)]
    token_mint: CpiAccount<'info, Mint>,
    pda_account: AccountInfo<'info>,
    token_program: AccountInfo<'info>,
    pub(crate) clock: Sysvar<'info, Clock>,
}
impl<'info> Thaw<'info> {
    pub(crate) fn to_warmer(&self) -> CpiContext<'_, '_, '_, 'info, ThawAccount<'info>> {
        let cpi_accounts = ThawAccount {
            mint: self.token_mint.to_account_info().clone(),
            account: self.user_token.to_account_info().clone(),
            authority: self.pda_account.clone(),
        };
        let cpi_program = self.token_program.to_account_info();
        CpiContext::new(cpi_program, cpi_accounts)
    }
}

impl<'info> From<&mut InitPool<'info>> for CpiContext<'_, '_, '_, 'info, SetAuthority<'info>> {
    fn from(accounts: &mut InitPool<'info>) -> Self {
        let cpi_accounts = SetAuthority {
            account_or_mint: accounts.vault.to_account_info().clone(),
            current_authority: accounts.authority.clone(),
        };
        let cpi_program = accounts.token_program.to_account_info();
        CpiContext::new(cpi_program, cpi_accounts)
    }
}

#[derive(Accounts)]
pub struct UpdatePool<'info> {
    pub authority: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct Empty<'info> {
    #[account(signer)]
    acc: AccountInfo<'info>,
    #[account(signer)]
    user: AccountInfo<'info>,
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
    pub(crate) CampaignAccount: Loader<'info, CampaignAccount>,
    #[account(signer)]
    pub architect: AccountInfo<'info>,
    #[account(mut, state = ringfi)]
    pub pool: CpiState<'info, PoolConfig>,
    #[account(executable)]
    pub ringfi: AccountInfo<'info>,
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

#[derive(Accounts)]
pub struct OnBuilder<'info> {
    #[account(signer)]
    pub builder: AccountInfo<'info>,
    #[account(mut, state = ringfi)]
    pub pool: CpiState<'info, PoolConfig>,
    #[account(executable)]
    pub ringfi: AccountInfo<'info>,
    #[account(mut)]
    pub campaign_account:  Loader<'info, CampaignAccount>,
    pub stake_account: Loader<'info, stakeAccount>,
}

#[derive(Accounts)]
pub struct OnValidator<'info> {
    #[account(signer)]
    pub validator: AccountInfo<'info>,
    #[account(mut)]
    pub sentence_account: Loader<'info, SentenceAccount>,
    #[account(mut)]
    pub campaign_account: Loader<'info, CampaignAccount>,
    #[account(mut)]
    pub stake_account: Loader<'info, stakeAccount>,
}

impl<'info> CloseStake<'info> {
    pub(crate) fn to_taker(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        let cpi_accounts = Transfer {
            from: self.pool_vault.to_account_info().clone(),
            to: self.user_token.to_account_info().clone(),
            authority: self.pda_account.clone(),
        };
        let cpi_program = self.token_program.to_account_info();
        CpiContext::new(cpi_program, cpi_accounts)
    }
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

#[derive(Accounts)]
pub struct CloseStake<'info> {
    #[account(mut)]
    pub(crate) stake_account: Loader<'info, stakeAccount>,
    #[account(signer)]
    pub(crate) user: AccountInfo<'info>,
    #[account(mut,
    constraint = user_token.owner == user.key())]
    pub(crate) user_token: CpiAccount<'info, TokenAccount>,
    #[account(mut)]
    pool_vault: CpiAccount<'info, TokenAccount>,
    #[account(mut)]
    token_mint: CpiAccount<'info, Mint>,
    pda_account: AccountInfo<'info>,
    #[account(mut, state = ringfi)]
    pub(crate) cpi_state: CpiState<'info, PoolConfig>,
    #[account(mut)]
    pub campaign: Loader<'info, CampaignAccount>,
    #[account(executable)]
    ringfi: AccountInfo<'info>,
    system_program: AccountInfo<'info>,
    token_program: AccountInfo<'info>,
    pub(crate) clock: Sysvar<'info, Clock>,
}

#[derive(Accounts)]
pub struct RedeemReward<'info> {
    #[account(mut)]
    pub(crate) stake_account: Loader<'info, stakeAccount>,
    #[account(signer)]
    user: AccountInfo<'info>,
    #[account(mut, constraint = user_token.owner == user.key())]
    user_token: CpiAccount<'info, TokenAccount>,
    #[account(mut)]
    pool_vault: CpiAccount<'info, TokenAccount>,
    #[account(mut)]
    token_mint: CpiAccount<'info, Mint>,
    pda_account: AccountInfo<'info>,
    #[account(mut, state = ringfi)]
    pub(crate) cpi_state: CpiState<'info, PoolConfig>,
    #[account(mut)]
    pub campaign: Loader<'info, CampaignAccount>,
    #[account(executable)]
    ringfi: AccountInfo<'info>,
    system_program: AccountInfo<'info>,
    token_program: AccountInfo<'info>,
    pub(crate) clock: Sysvar<'info, Clock>,
}
impl<'info> RedeemReward<'info> {
    pub(crate) fn to_taker(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        let cpi_accounts = Transfer {
            from: self.pool_vault.to_account_info().clone(),
            to: self.user_token.to_account_info().clone(),
            authority: self.pda_account.clone(),
        };
        let cpi_program = self.token_program.to_account_info();
        CpiContext::new(cpi_program, cpi_accounts)
    }
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
impl<'a, 'b, 'c, 'info> From<&Stake<'info>> for CpiContext<'a, 'b, 'c, 'info, Transfer<'info>> {
    fn from(accounts: &Stake<'info>) -> CpiContext<'a, 'b, 'c, 'info, Transfer<'info>> {
        let cpi_accounts = Transfer {
            from: accounts.user_token.to_account_info(),
            to: accounts.pool_vault.to_account_info(),
            authority: accounts.user.to_account_info(),
        };
        let cpi_program = accounts.token_program.to_account_info();
        CpiContext::new(cpi_program, cpi_accounts)
    }
}
