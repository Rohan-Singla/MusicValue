use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::errors::MusicValueError;
use crate::state::TrackVault;

#[derive(Accounts)]
pub struct DistributeYield<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"vault", vault.audius_track_id.as_bytes()],
        bump = vault.bump,
        constraint = vault.authority == authority.key() @ MusicValueError::Unauthorized
    )]
    pub vault: Account<'info, TrackVault>,

    #[account(
        mut,
        constraint = authority_usdc.mint == vault.usdc_mint,
        constraint = authority_usdc.owner == authority.key()
    )]
    pub authority_usdc: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = vault_token_account.key() == vault.vault_token_account
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<DistributeYield>, amount: u64) -> Result<()> {
    require!(amount > 0, MusicValueError::ZeroDeposit);
    require!(ctx.accounts.vault.total_shares > 0, MusicValueError::NoShareholders);

    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.authority_usdc.to_account_info(),
                to: ctx.accounts.vault_token_account.to_account_info(),
                authority: ctx.accounts.authority.to_account_info(),
            },
        ),
        amount,
    )?;

    let vault = &mut ctx.accounts.vault;
    vault.total_deposited = vault.total_deposited.checked_add(amount).unwrap();
    vault.total_yield_distributed = vault.total_yield_distributed.checked_add(amount).unwrap();

    msg!(
        "Distributed {} USDC yield to vault. New total: {}. Share price: {}/{}. Total yield ever: {}",
        amount,
        vault.total_deposited,
        vault.total_deposited,
        vault.total_shares,
        vault.total_yield_distributed
    );
    Ok(())
}
