# MusicValue — On-Chain Program

Solana Anchor program that powers music funding vaults on MusicValue.

- **Network:** Devnet
- **Program ID:** `4Axew2EExar585doSH8vpaFyT8Nu4wJ9xexN1WvgTZir`
- **USDC Mint (devnet):** `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`

---

## Overview

Artists create a `TrackVault` for their Audius track. Fans deposit USDC and receive share tokens representing proportional ownership of the vault. When the artist distributes royalties back into the vault, each share becomes worth more USDC. Fans withdraw by burning shares to reclaim their proportional USDC.

---

## Accounts

### `TrackVault`

PDA: `["vault", audius_track_id]`

| Field | Type | Description |
|-------|------|-------------|
| `authority` | `Pubkey` | Artist who created the vault |
| `audius_track_id` | `String` (≤32) | Audius track ID used as PDA seed |
| `usdc_mint` | `Pubkey` | USDC mint address |
| `vault_token_account` | `Pubkey` | Vault's USDC token account |
| `share_mint` | `Pubkey` | Fungible share token mint |
| `total_deposited` | `u64` | Total USDC in vault (principal + yield) |
| `cap` | `u64` | Maximum USDC the vault accepts |
| `total_shares` | `u64` | Total share tokens minted |
| `created_at` | `i64` | Unix timestamp |
| `bump` | `u8` | PDA bump |
| `royalty_pct` | `u8` | % of royalties pledged to backers (0–100) |
| `distribution_interval` | `u8` | 0 = monthly, 1 = quarterly, 2 = milestone |
| `vault_duration_months` | `u16` | Vault lifespan in months (0 = ongoing) |
| `pledge_note` | `String` (≤200) | Artist's public message to backers |
| `total_yield_distributed` | `u64` | Cumulative USDC distributed by artist |

### `UserPosition`

PDA: `["position", vault_pubkey, user_pubkey]`

| Field | Type | Description |
|-------|------|-------------|
| `owner` | `Pubkey` | Backer's wallet |
| `vault` | `Pubkey` | Associated vault |
| `shares_held` | `u64` | Current share balance |
| `total_deposited` | `u64` | Total USDC deposited by user |
| `deposited_at` | `i64` | Timestamp of first deposit |
| `bump` | `u8` | PDA bump |

---

## Instructions

### `initialize_vault`

Creates a new vault for an Audius track with an on-chain royalty pledge.

**Args:** `audius_track_id: String`, `cap: u64`, `royalty_pct: u8`, `distribution_interval: u8`, `vault_duration_months: u16`, `pledge_note: String`

**Accounts:** `authority` (signer), `vault` (init), `usdc_mint`, `vault_token_account` (init), `share_mint` (init), `token_program`, `system_program`, `rent`

**Validations:**
- `audius_track_id.len() ≤ 32`
- `cap > 0`
- `royalty_pct ≤ 100`
- `distribution_interval ≤ 2`
- `pledge_note.len() ≤ 200`

---

### `deposit`

Deposits USDC into the vault and mints share tokens 1:1.

**Args:** `amount: u64`

**Accounts:** `user` (signer), `vault`, `user_position` (init_if_needed), `user_usdc`, `vault_token_account`, `share_mint`, `user_shares`, `token_program`, `system_program`

**Effect:** Transfers `amount` USDC to vault, mints `amount` shares to user.

---

### `withdraw`

Burns share tokens and returns proportional USDC (including any yield).

**Args:** `shares: u64`

**Formula:** `usdc_out = shares × total_deposited / total_shares`

**Accounts:** `user` (signer), `vault`, `user_position`, `vault_token_account`, `user_usdc`, `share_mint`, `user_shares`, `token_program`

---

### `distribute_yield`

Authority deposits royalty USDC into the vault without minting new shares. Increases the share price for all backers.

**Args:** `amount: u64`

**Accounts:** `authority` (signer), `vault`, `authority_usdc`, `vault_token_account`, `token_program`

**Constraint:** `vault.authority == authority`

---

### `update_pledge`

Updates the royalty pledge fields on an existing vault. Only callable by the vault authority.

**Args:** `royalty_pct: u8`, `distribution_interval: u8`, `vault_duration_months: u16`, `pledge_note: String`

**Accounts:** `authority` (signer), `vault`

---

## Error Codes

| Code | Name | Message |
|------|------|---------|
| 6000 | `VaultCapExceeded` | Vault has reached its funding cap |
| 6001 | `ZeroDeposit` | Deposit amount must be greater than zero |
| 6002 | `InsufficientShares` | Insufficient shares to withdraw |
| 6003 | `ZeroWithdraw` | Withdraw amount must be greater than zero |
| 6004 | `TrackIdTooLong` | Audius track ID is too long (max 32 characters) |
| 6005 | `InvalidCap` | Vault cap must be greater than zero |
| 6006 | `Unauthorized` | Only the vault authority can perform this action |
| 6007 | `NoShareholders` | Cannot distribute yield when there are no shareholders |
| 6008 | `InvalidRoyaltyPct` | Royalty percentage must be between 0 and 100 |
| 6009 | `InvalidDistributionInterval` | Distribution interval must be 0, 1, or 2 |
| 6010 | `PledgeNoteTooLong` | Pledge note is too long (max 200 characters) |

---

## Build & Deploy

**Prerequisites:** Rust, Solana CLI, Anchor CLI, a funded devnet keypair at `~/.config/solana/id.json`

```bash
# Switch to devnet
solana config set --url devnet

# Build
cd anchor
anchor build

# Deploy
anchor deploy

# Run tests
anchor test
```

After deploying, copy the generated IDL to the frontend:

```bash
cp target/idl/music_value.json ../app/src/lib/idl.json
```

---

## Share Price Mechanics

Shares are minted 1:1 with USDC on deposit. When the artist calls `distribute_yield`, `total_deposited` grows but `total_shares` stays the same — so each share is worth more USDC on the next withdrawal.

```
share_price = total_deposited / total_shares
withdraw_usdc = shares_burned × share_price
```
