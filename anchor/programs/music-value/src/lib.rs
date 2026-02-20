use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("rj7W3p82B8xKoQRb5dVDCkmGJu4uY3LPvR8uZBGmh6c");

#[program]
pub mod music_value {
    use super::*;

    /// Initialize a new vault for an Audius track
    pub fn initialize_vault(
        ctx: Context<InitializeVault>,
        audius_track_id: String,
        cap: u64,
    ) -> Result<()> {
        instructions::initialize_vault::handler(ctx, audius_track_id, cap)
    }

    /// Deposit USDC into a track vault and receive share tokens
    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        instructions::deposit::handler(ctx, amount)
    }

    /// Withdraw from a track vault by burning share tokens
    pub fn withdraw(ctx: Context<Withdraw>, shares: u64) -> Result<()> {
        instructions::withdraw::handler(ctx, shares)
    }
}
