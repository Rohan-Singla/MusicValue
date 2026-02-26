use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct TrackVault {
    pub authority: Pubkey,
    #[max_len(32)]
    pub audius_track_id: String,
    pub usdc_mint: Pubkey,
    pub vault_token_account: Pubkey,
    pub share_mint: Pubkey,
    pub total_deposited: u64,
    pub cap: u64,
    pub total_shares: u64,
    pub created_at: i64,
    pub bump: u8,
    pub royalty_pct: u8,
    pub distribution_interval: u8,
    pub vault_duration_months: u16,
    #[max_len(200)]
    pub pledge_note: String,
    pub total_yield_distributed: u64,
}

#[account]
#[derive(InitSpace)]
pub struct UserPosition {
    pub owner: Pubkey,
    pub vault: Pubkey,
    pub shares_held: u64,
    pub total_deposited: u64,
    pub deposited_at: i64,
    pub bump: u8,
}
