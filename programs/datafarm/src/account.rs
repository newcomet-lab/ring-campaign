use anchor_lang::prelude::*;

#[account(zero_copy)]
#[derive(Default)]
pub struct stakeAccount {
    pub token_amount: u64,
    pub lock_in_time: i64,
    pub start_block: u64,
    pub lock_out_time: i64,
    pub end_block: u64,
    pub weight: u64,
    pub pending_reward: u64,
    pub rewarded: bool,
    pub status: bool,
    pub token_address: Pubkey,
    pub user_address: Pubkey,
    pub campaign_address: Pubkey,
    pub role: u8,
    pub bump: u8,
}

/// Campaign Structure
#[account(zero_copy)]
pub struct CampaignAccount {
    pub refID: u64,
    pub head: u64,
    pub tail: u64,
    pub architect: Pubkey,
    pub stakeAccount: Pubkey,
    pub stake_status: bool,
    pub min_builder: u64,
    pub min_validator: u64,
    pub reward_per_utterance: u64,
    pub validation_quorum: u64,
    pub reward_token: Pubkey,
    pub utterances: [Pubkey; 100],
    pub utterance_approved: u64,
    pub finish: bool,
    pub time_limit: u64,
    pub init_limit: u64,
    pub domain: [u8; 128],
    pub subject: [u8; 128],
    pub explain: [u8; 256],
    pub phrase: [u8; 256],
    pub nonce: u8,
}

impl Default for CampaignAccount {
    fn default() -> Self {
        CampaignAccount {
            refID: 0,
            head: 0,
            tail: 0,
            architect: Pubkey::default(),
            stakeAccount: Pubkey::default(),
            stake_status: false,
            min_builder: 0,
            min_validator: 0,
            reward_per_utterance: 0,
            validation_quorum: 0,
            reward_token: Pubkey::default(),
            utterances: [Pubkey::default(); 100],
            utterance_approved: 0,
            time_limit: 0,
            init_limit: 0,
            domain: [0; 128],
            subject: [0; 128],
            explain: [0; 256],
            phrase: [0; 256],
            nonce: 0,
            finish:false,

        }
    }
}

fn check_campaign(campaign_account: &Loader<CampaignAccount>) -> ProgramResult {
    let campaign = campaign_account.load()?;
    if campaign.architect == Pubkey::default() {
        Ok(())
    } else {
        Err(ProgramError::AccountAlreadyInitialized)
    }
}

#[account(zero_copy)]
#[derive(Debug)]
pub struct UtteranceAccount {
    pub campaign: Pubkey,
    pub builder: Pubkey,
    pub head: u64,
    pub validators: [Pubkey; 32],
    pub data: [u8; 256],
    pub correct: u64,
    pub incorrect: u64,
    pub finish: bool,
    pub bump: u8,
}

impl Default for UtteranceAccount {
    fn default() -> Self {
        UtteranceAccount {
            campaign: Pubkey::default(),
            builder: Pubkey::default(),
            head: 0,
            validators: [Pubkey::default(); 32],
            data: [0; 256],
            correct: 0,
            incorrect: 0,
            finish: false,
            bump: 0
        }
    }
}

#[zero_copy]
pub struct Validate {
    pub from: Pubkey,
    pub status: bool,
}
