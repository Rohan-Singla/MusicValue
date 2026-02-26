use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("Atf26b8XuQ49cmvfTsvU5PjZ56zhoCvFiGQ7bBW2zoio");

#[program]
pub mod music_value {
    use super::*;

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

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        instructions::deposit::handler(ctx, amount)
    }

    pub fn withdraw(ctx: Context<Withdraw>, shares: u64) -> Result<()> {
        instructions::withdraw::handler(ctx, shares)
    }

    pub fn distribute_yield(ctx: Context<DistributeYield>, amount: u64) -> Result<()> {
        instructions::distribute_yield::handler(ctx, amount)
    }

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
