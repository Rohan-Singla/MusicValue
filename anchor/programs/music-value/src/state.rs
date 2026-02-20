use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct TrackVault {
    /// The authority who created this vault
    pub authority: Pubkey,
    /// Audius track ID (max 32 chars)
    #[max_len(32)]
    pub audius_track_id: String,
    /// USDC mint address
    pub usdc_mint: Pubkey,
    /// Vault's USDC token account (holds deposited funds)
    pub vault_token_account: Pubkey,
    /// Share token mint (fungible token representing vault participation)
    pub share_mint: Pubkey,
    /// Total USDC deposited in the vault
    pub total_deposited: u64,
    /// Maximum USDC that can be deposited (funding cap)
    pub cap: u64,
    /// Total share tokens minted
    pub total_shares: u64,
    /// Vault creation timestamp
    pub created_at: i64,
    /// PDA bump seed
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct UserPosition {
    /// The user who owns this position
    pub owner: Pubkey,
    /// The vault this position belongs to
    pub vault: Pubkey,
    /// Number of share tokens held
    pub shares_held: u64,
    /// Total USDC deposited by this user
    pub total_deposited: u64,
    /// Timestamp of first deposit
    pub deposited_at: i64,
    /// PDA bump seed
    pub bump: u8,
}
