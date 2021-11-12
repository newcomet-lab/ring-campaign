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
    pub status: bool,
    pub token_address: Pubkey,
    pub user_address: Pubkey,
    pub role :u8,
    pub bump :u8
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
    pub reward_per_builder: u64,
    pub reward_per_validator: u64,
    pub validation_quorum: u8,
    pub reward_token: Pubkey,
    pub utterances: [Utterance; 256],
    pub time_limit: u64,
    pub init_limit: u64,
    pub domain: [u8; 256],
    pub subject: [u8; 256],
    pub explain: [u8; 512],
    pub phrase: [u8; 512],
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
            reward_per_builder: 0,
            reward_per_validator: 0,
            validation_quorum: 0,
            reward_token: Pubkey::default(),
            utterances: [Utterance::default(); 256],
            time_limit: 0,
            init_limit: 0,
            domain: [0; 256],
            subject: [0; 256],
            explain: [0; 512],
            phrase: [0; 512],
            nonce: 0,
        }
    }
}

#[zero_copy]
#[derive(Debug)]
pub struct Utterance {
    pub builder: Pubkey,
    pub head: u64,
    pub validators: [Pubkey; 32],
    pub data: [u8; 256],
    pub correct: u64,
    pub incorrect: u64,
    pub finish: bool,
}

impl Default for Utterance {
    fn default() -> Self {
        Utterance {
            builder: Pubkey::default(),
            head: 0,
            validators: [Pubkey::default(); 32],
            data: [0; 256],
            correct: 0,
            incorrect: 0,
            finish: false,
        }
    }
}

#[zero_copy]
pub struct Validate {
    pub from: Pubkey,
    pub status: bool,
}
