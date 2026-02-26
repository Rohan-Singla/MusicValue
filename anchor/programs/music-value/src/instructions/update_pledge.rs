use anchor_lang::prelude::*;

use crate::errors::MusicValueError;
use crate::state::TrackVault;

#[derive(Accounts)]
pub struct UpdatePledge<'info> {
    /// The vault authority (artist)
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"vault", vault.audius_track_id.as_bytes()],
        bump = vault.bump,
        constraint = vault.authority == authority.key() @ MusicValueError::Unauthorized
    )]
    pub vault: Account<'info, TrackVault>,
}

pub fn handler(
    ctx: Context<UpdatePledge>,
    royalty_pct: u8,
    distribution_interval: u8,
    vault_duration_months: u16,
    pledge_note: String,
) -> Result<()> {
    require!(royalty_pct <= 100, MusicValueError::InvalidRoyaltyPct);
    require!(distribution_interval <= 2, MusicValueError::InvalidDistributionInterval);
    require!(pledge_note.len() <= 200, MusicValueError::PledgeNoteTooLong);

    let vault = &mut ctx.accounts.vault;
    vault.royalty_pct = royalty_pct;
    vault.distribution_interval = distribution_interval;
    vault.vault_duration_months = vault_duration_months;
    vault.pledge_note = pledge_note;

    msg!(
        "Updated pledge for vault {}: {}% royalties, interval={}, duration={}mo",
        vault.audius_track_id,
        royalty_pct,
        distribution_interval,
        vault_duration_months
    );
    Ok(())
}
