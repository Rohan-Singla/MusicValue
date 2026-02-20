use anchor_lang::prelude::*;

#[error_code]
pub enum MusicValueError {
    #[msg("Vault has reached its funding cap")]
    VaultCapExceeded,
    #[msg("Deposit amount must be greater than zero")]
    ZeroDeposit,
    #[msg("Insufficient shares to withdraw")]
    InsufficientShares,
    #[msg("Withdraw amount must be greater than zero")]
    ZeroWithdraw,
    #[msg("Audius track ID is too long (max 32 characters)")]
    TrackIdTooLong,
    #[msg("Vault cap must be greater than zero")]
    InvalidCap,
    #[msg("Only the vault authority can perform this action")]
    Unauthorized,
    #[msg("Cannot distribute yield when there are no shareholders")]
    NoShareholders,
}
