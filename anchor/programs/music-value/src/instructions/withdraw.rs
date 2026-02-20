use anchor_lang::prelude::*;
use anchor_spl::token::{self, Burn, Mint, Token, TokenAccount, Transfer};

use crate::errors::MusicValueError;
use crate::state::{TrackVault, UserPosition};

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"vault", vault.audius_track_id.as_bytes()],
        bump = vault.bump
    )]
    pub vault: Account<'info, TrackVault>,

    #[account(
        mut,
        seeds = [b"position", vault.key().as_ref(), user.key().as_ref()],
        bump = user_position.bump,
        constraint = user_position.owner == user.key()
    )]
    pub user_position: Account<'info, UserPosition>,

    /// Vault's USDC token account (source of withdrawal)
    #[account(
        mut,
        constraint = vault_token_account.key() == vault.vault_token_account
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    /// User's USDC token account (destination of withdrawal)
    #[account(
        mut,
        constraint = user_usdc.mint == vault.usdc_mint,
        constraint = user_usdc.owner == user.key()
    )]
    pub user_usdc: Account<'info, TokenAccount>,

    /// Share token mint
    #[account(
        mut,
        constraint = share_mint.key() == vault.share_mint
    )]
    pub share_mint: Account<'info, Mint>,

    /// User's share token account (shares to burn)
    #[account(
        mut,
        constraint = user_shares.mint == share_mint.key(),
        constraint = user_shares.owner == user.key()
    )]
    pub user_shares: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<Withdraw>, shares: u64) -> Result<()> {
    require!(shares > 0, MusicValueError::ZeroWithdraw);
    require!(
        ctx.accounts.user_position.shares_held >= shares,
        MusicValueError::InsufficientShares
    );

    let vault = &ctx.accounts.vault;

    // Calculate USDC to return (proportional to shares)
    // usdc_amount = shares * total_deposited / total_shares
    // This means if yield was distributed (total_deposited grew), each share is worth more
    let usdc_amount = (shares as u128)
        .checked_mul(vault.total_deposited as u128)
        .unwrap()
        .checked_div(vault.total_shares as u128)
        .unwrap() as u64;

    // Transfer USDC from vault to user
    let track_id = vault.audius_track_id.as_bytes();
    let bump = vault.bump;
    let seeds: &[&[u8]] = &[b"vault", track_id, &[bump]];
    let signer_seeds = &[seeds];

    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault_token_account.to_account_info(),
                to: ctx.accounts.user_usdc.to_account_info(),
                authority: ctx.accounts.vault.to_account_info(),
            },
            signer_seeds,
        ),
        usdc_amount,
    )?;

    // Burn share tokens
    token::burn(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Burn {
                mint: ctx.accounts.share_mint.to_account_info(),
                from: ctx.accounts.user_shares.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        ),
        shares,
    )?;

    // Update vault state
    let vault = &mut ctx.accounts.vault;
    vault.total_deposited = vault.total_deposited.checked_sub(usdc_amount).unwrap();
    vault.total_shares = vault.total_shares.checked_sub(shares).unwrap();

    // Update user position
    let position = &mut ctx.accounts.user_position;
    position.shares_held = position.shares_held.checked_sub(shares).unwrap();

    msg!("Withdrew {} USDC from vault", usdc_amount);
    Ok(())
}
