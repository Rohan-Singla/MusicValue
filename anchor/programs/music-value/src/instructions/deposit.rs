use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount, Transfer};

use crate::errors::MusicValueError;
use crate::state::{TrackVault, UserPosition};

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"vault", vault.audius_track_id.as_bytes()],
        bump = vault.bump
    )]
    pub vault: Account<'info, TrackVault>,

    /// User's position in this vault (created on first deposit)
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + UserPosition::INIT_SPACE,
        seeds = [b"position", vault.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub user_position: Account<'info, UserPosition>,

    /// User's USDC token account (source of deposit)
    #[account(
        mut,
        constraint = user_usdc.mint == vault.usdc_mint,
        constraint = user_usdc.owner == user.key()
    )]
    pub user_usdc: Account<'info, TokenAccount>,

    /// Vault's USDC token account (destination of deposit)
    #[account(
        mut,
        constraint = vault_token_account.key() == vault.vault_token_account
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    /// Share token mint
    #[account(
        mut,
        constraint = share_mint.key() == vault.share_mint
    )]
    pub share_mint: Account<'info, Mint>,

    /// User's share token account (receives minted shares)
    #[account(
        mut,
        constraint = user_shares.mint == share_mint.key(),
        constraint = user_shares.owner == user.key()
    )]
    pub user_shares: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    require!(amount > 0, MusicValueError::ZeroDeposit);

    let vault = &ctx.accounts.vault;
    require!(
        vault.total_deposited.checked_add(amount).unwrap() <= vault.cap,
        MusicValueError::VaultCapExceeded
    );

    // Transfer USDC from user to vault
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_usdc.to_account_info(),
                to: ctx.accounts.vault_token_account.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        ),
        amount,
    )?;

    // Mint share tokens to user (1:1 ratio with USDC for simplicity)
    let track_id = vault.audius_track_id.as_bytes();
    let bump = vault.bump;
    let seeds: &[&[u8]] = &[b"vault", track_id, &[bump]];
    let signer_seeds = &[seeds];

    token::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.share_mint.to_account_info(),
                to: ctx.accounts.user_shares.to_account_info(),
                authority: ctx.accounts.vault.to_account_info(),
            },
            signer_seeds,
        ),
        amount,
    )?;

    // Update vault state
    let vault = &mut ctx.accounts.vault;
    vault.total_deposited = vault.total_deposited.checked_add(amount).unwrap();
    vault.total_shares = vault.total_shares.checked_add(amount).unwrap();

    // Update user position
    let position = &mut ctx.accounts.user_position;
    if position.deposited_at == 0 {
        position.owner = ctx.accounts.user.key();
        position.vault = vault.key();
        position.deposited_at = Clock::get()?.unix_timestamp;
    }
    position.shares_held = position.shares_held.checked_add(amount).unwrap();
    position.total_deposited = position.total_deposited.checked_add(amount).unwrap();
    position.bump = ctx.bumps.user_position;

    msg!("Deposited {} USDC into vault", amount);
    Ok(())
}
