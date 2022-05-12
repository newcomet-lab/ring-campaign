use anchor_lang::prelude::*;


#[error]
pub enum FarmError {
    #[msg("PDA account mismatch")]
    InvalidPDA,
    #[msg("Invalid Authority")]
    InvalidAuthority,
    #[msg("user already staked to this campaign")]
    UserAlreadyStakes,
    #[msg("user select invalid role")]
    InvalidRole,
    #[msg("Stake account is not belong to provided user")]
    InvalidStakeOwner,
    #[msg("Stake account is not belong to provided campaign")]
    InvalidStakeCampaign,
    #[msg("Token account is not belong to user")]
    InvalidTokenOwner,
    #[msg("Token account mintis not same as RING Mint")]
    InvalidTokenMint,
    #[msg("User did not stake to this campaign")]
    InvalidStakeAccount,
    #[msg("User should call reward before call unstake")]
    InvalidOrder,
    #[msg("User can not unstake until campaign finish")]
    UnstakeProhibted,
    #[msg("user can't call redeem reward twice")]
    RewardReedemedBefore,
    #[msg("only builder can submit sentence")]
    WrongBuilderRole,
    #[msg("only validator can validate sentence")]
    WrongValidatorRole,
}