-- ============================================================
-- MusicValue — Supabase schema
-- Run this once in the Supabase SQL editor
-- ============================================================

-- Artists: maps Audius identity → Solana wallet
CREATE TABLE IF NOT EXISTS artists (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  audius_user_id   TEXT        UNIQUE NOT NULL,
  audius_handle    TEXT        NOT NULL,
  audius_name      TEXT        NOT NULL,
  solana_wallet    TEXT        NOT NULL,
  terms_accepted   BOOLEAN     NOT NULL DEFAULT true,
  registered_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Vaults: one row per registered track vault
CREATE TABLE IF NOT EXISTS vaults (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id                 TEXT        UNIQUE NOT NULL,   -- Audius track ID (≤32 chars)
  track_title              TEXT        NOT NULL,
  vault_address            TEXT        NOT NULL,           -- Solana PDA (base58)
  audius_user_id           TEXT        NOT NULL REFERENCES artists(audius_user_id),
  artist_wallet            TEXT        NOT NULL,
  cap                      BIGINT      NOT NULL,           -- USDC lamports (6 decimals)
  -- Royalty pledge (public commitment shown to backers)
  royalty_pct              INTEGER,                        -- e.g. 30 = artist pledges 30% of royalties
  distribution_interval    TEXT,                           -- 'monthly' | 'quarterly' | 'milestone'
  vault_duration_months    INTEGER,                        -- null = ongoing
  pledge_note              TEXT,                           -- artist's public message to backers
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vaults_audius_user_id_idx ON vaults(audius_user_id);

-- Deposits: one row per confirmed on-chain deposit tx
CREATE TABLE IF NOT EXISTS deposits (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tx_signature     TEXT        UNIQUE NOT NULL,
  track_id         TEXT        NOT NULL REFERENCES vaults(track_id),
  backer_wallet    TEXT        NOT NULL,
  amount_usdc      BIGINT      NOT NULL,           -- USDC lamports
  deposited_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS deposits_track_id_idx    ON deposits(track_id);
CREATE INDEX IF NOT EXISTS deposits_backer_idx      ON deposits(backer_wallet);
