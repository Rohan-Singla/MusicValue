use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("4Axew2EExar585doSH8vpaFyT8Nu4wJ9xexN1WvgTZir");

#[program]
pub mod music_value {
    use super::*;

    /// Initialize a new vault for an Audius track with a royalty pledge
    pub fn initialize_vault(
        ctx: Context<InitializeVault>,
        audius_track_id: String,
        cap: u64,
        royalty_pct: u8,
        distribution_interval: u8,
        vault_duration_months: u16,
        pledge_note: String,
    ) -> Result<()> {
        instructions::initialize_vault::handler(
            ctx,
            audius_track_id,
            cap,
            royalty_pct,
            distribution_interval,
            vault_duration_months,
            pledge_note,
        )
    }

    /// Deposit USDC into a track vault and receive share tokens
    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        instructions::deposit::handler(ctx, amount)
    }

    /// Withdraw from a track vault by burning share tokens
    pub fn withdraw(ctx: Context<Withdraw>, shares: u64) -> Result<()> {
        instructions::withdraw::handler(ctx, shares)
    }

    /// Distribute yield into the vault (authority only).
    /// Increases total_deposited without minting new shares,
    /// making each existing share worth more USDC.
    pub fn distribute_yield(ctx: Context<DistributeYield>, amount: u64) -> Result<()> {
        instructions::distribute_yield::handler(ctx, amount)
    }

    /// Update the royalty pledge fields on an existing vault (authority only).
    /// Useful when an artist wants to revise their commitment to backers.
    pub fn update_pledge(
        ctx: Context<UpdatePledge>,
        royalty_pct: u8,
        distribution_interval: u8,
        vault_duration_months: u16,
        pledge_note: String,
    ) -> Result<()> {
        instructions::update_pledge::handler(
            ctx,
            royalty_pct,
            distribution_interval,
            vault_duration_months,
            pledge_note,
        )
    }
}
