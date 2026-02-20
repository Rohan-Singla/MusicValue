use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::errors::FanfiError;
use crate::state::TrackVault;

#[derive(Accounts)]
#[instruction(audius_track_id: String)]
pub struct InitializeVault<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + TrackVault::INIT_SPACE,
        seeds = [b"vault", audius_track_id.as_bytes()],
        bump
    )]
    pub vault: Account<'info, TrackVault>,

    /// The USDC mint
    pub usdc_mint: Account<'info, Mint>,

    /// The vault's USDC token account to hold deposits
    #[account(
        init,
        payer = authority,
        token::mint = usdc_mint,
        token::authority = vault,
        seeds = [b"vault_token", vault.key().as_ref()],
        bump
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    /// The share token mint (1 share = 1 unit of participation)
    #[account(
        init,
        payer = authority,
        mint::decimals = 6,
        mint::authority = vault,
        seeds = [b"share_mint", vault.key().as_ref()],
        bump
    )]
    pub share_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(
    ctx: Context<InitializeVault>,
    audius_track_id: String,
    cap: u64,
) -> Result<()> {
    require!(audius_track_id.len() <= 32, FanfiError::TrackIdTooLong);
    require!(cap > 0, FanfiError::InvalidCap);

    let vault = &mut ctx.accounts.vault;
    vault.authority = ctx.accounts.authority.key();
    vault.audius_track_id = audius_track_id;
    vault.usdc_mint = ctx.accounts.usdc_mint.key();
    vault.vault_token_account = ctx.accounts.vault_token_account.key();
    vault.share_mint = ctx.accounts.share_mint.key();
    vault.total_deposited = 0;
    vault.cap = cap;
    vault.total_shares = 0;
    vault.created_at = Clock::get()?.unix_timestamp;
    vault.bump = ctx.bumps.vault;

    msg!("Vault initialized for track: {}", vault.audius_track_id);
    Ok(())
}
