# MusicValue

**Back the music you believe in. Earn when it wins.**

---

## What is MusicValue?

MusicValue is a fan-backed music investment platform built on Solana. It lets fans put real money behind the artists and tracks they love — and earn a share of the royalties those tracks generate.

Think of it like buying a small stake in a song. When the artist earns, so do you.

---

## How it works

### For Fans (Backers)

1. **Browse tracks** — Discover music on MusicValue that has an open vault.
2. **Back a track** — Deposit USDC into the track's vault and receive share tokens that represent your stake.
3. **Earn yield** — When the artist distributes royalties into the vault, every share holder's position grows automatically. Your shares are now worth more than you paid.
4. **Withdraw anytime** — Burn your shares and receive your USDC back — including any yield earned — whenever you want. Your principal is never locked.

### For Artists

1. **Connect your Audius account** — Your music identity is verified through Audius OAuth. No new accounts needed.
2. **Pick a track and create a vault** — Choose which track you want to fundraise for and set a funding cap.
3. **Make a public pledge** — Before going live, commit to how much of your royalties you'll share with backers (e.g. 30%, monthly, for 12 months). This is visible to every potential backer.
4. **Distribute royalties** — When your track earns royalties on Audius or elsewhere, send a portion into the vault through your Artist Dashboard. Share prices go up for all backers instantly.

---

## Why it matters

Musicians rely almost entirely on streaming platforms that pay fractions of a cent per play. Most artists never see meaningful royalty income — especially independent and emerging artists.

MusicValue changes the equation:

- **Artists** get upfront capital from fans who believe in their music, without giving up creative control or signing to a label.
- **Fans** go from passive listeners to active stakeholders — if the track they backed blows up, their shares grow in value.
- **Communities** form around music in a way that goes deeper than likes and follows. Backers have real skin in the game.

---

## What makes it trustless

The money never touches MusicValue. Every vault is a non-custodial Solana smart contract:

- Fan deposits go directly into the vault on-chain.
- **Artists cannot withdraw fan deposits.** The only instruction that moves money out of a vault to a user is `withdraw` — and only the depositor can call it.
- Royalty distribution (`distribute_yield`) moves money **into** the vault, increasing every holder's share value.
- All transactions are publicly verifiable on the Solana blockchain.

The artist's risk to backers is not theft — it's simply not distributing. If that happens, backers get their full principal back when they withdraw.

---

## Sponsors & Technology

### Solana Blinks & Actions
MusicValue uses **Solana Actions** to generate shareable Blink links for every track vault. A Blink turns any track's vault page into a one-click deposit experience that can be shared on Twitter/X, Discord, or any website — no wallet setup required for the viewer. This makes it trivially easy for an artist to tweet their vault link and let fans back them directly from their feed.

### Audius
Artist identity and track ownership are verified through **Audius OAuth**. Artists log in with their Audius account and can only create vaults for tracks they actually own — verified server-side against the Audius API. Track metadata, artwork, play counts, and streaming stats are all pulled live from Audius, making MusicValue a native extension of the Audius ecosystem. Royalties earned on Audius are the primary yield source artists are expected to distribute.

### OrbitFlare RPC
MusicValue's backend uses **OrbitFlare** as its Solana RPC provider. All blockchain reads and writes are routed through OrbitFlare's infrastructure — keeping the RPC endpoint and API key server-side only, never exposed to the browser. This gives the app fast, reliable Solana access without leaking credentials to the frontend.

---

## Upcoming Features

### Royalty Pledge Enforcement (On-chain)
Right now the royalty pledge is a public social commitment. The next step is encoding it into the smart contract itself — a time-locked commitment where if the artist misses a distribution window, backers can trigger an early-exit mechanism to get their USDC back with priority.

### Audius Royalty Auto-Pipeline
Instead of manually sending USDC, artists will be able to connect a royalty wallet and set up automatic distributions. When Audius pays out, a configurable percentage flows directly into the vault — no artist action required.

### Secondary Market for Shares
Share tokens are SPL tokens on Solana. The next step is enabling a simple peer-to-peer secondary market where backers can trade their shares before withdrawing. Early backers who got in before a track went viral could sell their position at a premium.

### Multi-Track Vaults
Artists will be able to bundle multiple tracks into a single vault — letting fans back an artist's entire catalogue or a new album rather than a single song.

### Fan Leaderboard & Badges
On-chain data lets us show exactly who backed what and when. Top backers will earn verifiable on-chain badges, early-supporter status, and potential access to artist-exclusive content or experiences.

### Mobile App
A native mobile experience for browsing vaults, backing tracks with one tap, and tracking your portfolio — built on the same Solana and Audius integrations.

---

## Status

MusicValue is currently running on **Solana devnet** as an early-stage prototype. The smart contract, vault mechanics, artist registration, and Blinks integration are all live and functional. This is pre-mainnet software — do not use real funds.
