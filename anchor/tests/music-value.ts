import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { MusicValue } from "../target/types/music_value";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import { assert } from "chai";

// ─── helpers ───────────────────────────────────────────────────────────────

async function expectError(fn: () => Promise<any>, pattern: string | RegExp) {
  try {
    await fn();
    assert.fail(`Expected error matching: ${pattern}`);
  } catch (err: any) {
    const msg: string = err.message ?? String(err);
    if (pattern instanceof RegExp) {
      assert.match(msg, pattern, `Error did not match pattern. Got: ${msg}`);
    } else {
      assert.include(msg, pattern, `Error did not contain "${pattern}". Got: ${msg}`);
    }
  }
}

// ─── suite ─────────────────────────────────────────────────────────────────

describe("music-value", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.MusicValue as Program<MusicValue>;
  const authority = provider.wallet;

  // Unique track IDs per test run (avoids "account already in use" on devnet)
  const BASE_ID = Date.now().toString().slice(-6);
  const TRACK_ID      = "T" + BASE_ID;
  const TRACK_ID_2    = "T" + BASE_ID + "b"; // second track for multi-vault tests
  const TRACK_ID_LONG = "A".repeat(33);       // 33 chars — too long

  const VAULT_CAP      = new anchor.BN(1_000_000_000); // 1,000 USDC
  const DEPOSIT_AMOUNT = new anchor.BN(100_000_000);   // 100 USDC
  const YIELD_AMOUNT   = new anchor.BN(10_000_000);    // 10 USDC

  // Default pledge params
  const ROYALTY_PCT           = 30;
  const DISTRIBUTION_INTERVAL = 0; // monthly
  const VAULT_DURATION_MONTHS = 12;
  const PLEDGE_NOTE           = "I will send 30% of all Audius royalties monthly for 12 months.";

  let usdcMint: anchor.web3.PublicKey;

  // Primary vault PDAs
  let vaultPda: anchor.web3.PublicKey;
  let vaultTokenAccount: anchor.web3.PublicKey;
  let shareMint: anchor.web3.PublicKey;
  let userPositionPda: anchor.web3.PublicKey;
  let userUsdcAddr: anchor.web3.PublicKey;
  let userSharesAddr: anchor.web3.PublicKey;

  // ─── setup ──────────────────────────────────────────────────────────────

  before(async () => {
    console.log("\n  Using track ID:", TRACK_ID);

    // Create mock USDC mint
    usdcMint = await createMint(
      provider.connection,
      (authority as any).payer,
      authority.publicKey,
      null,
      6
    );

    // Derive primary vault PDAs
    [vaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), Buffer.from(TRACK_ID)],
      program.programId
    );
    [vaultTokenAccount] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault_token"), vaultPda.toBuffer()],
      program.programId
    );
    [shareMint] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("share_mint"), vaultPda.toBuffer()],
      program.programId
    );
    [userPositionPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("position"), vaultPda.toBuffer(), authority.publicKey.toBuffer()],
      program.programId
    );
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. INITIALIZE VAULT
  // ═══════════════════════════════════════════════════════════════════════════

  it("initializes a vault with royalty pledge", async () => {
    await program.methods
      .initializeVault(
        TRACK_ID,
        VAULT_CAP,
        ROYALTY_PCT,
        DISTRIBUTION_INTERVAL,
        VAULT_DURATION_MONTHS,
        PLEDGE_NOTE
      )
      .accounts({
        authority: authority.publicKey,
        vault: vaultPda,
        usdcMint,
        vaultTokenAccount,
        shareMint,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    const vault = await program.account.trackVault.fetch(vaultPda);

    // Core fields
    assert.equal(vault.audiusTrackId, TRACK_ID, "track ID stored");
    assert.ok(vault.cap.eq(VAULT_CAP), "cap stored");
    assert.ok(vault.totalDeposited.eq(new anchor.BN(0)), "starts empty");
    assert.ok(vault.totalShares.eq(new anchor.BN(0)), "no shares yet");
    assert.ok(vault.totalYieldDistributed.eq(new anchor.BN(0)), "no yield yet");
    assert.equal(vault.authority.toBase58(), authority.publicKey.toBase58(), "authority set");

    // Pledge fields
    assert.equal(vault.royaltyPct, ROYALTY_PCT, "royaltyPct stored");
    assert.equal(vault.distributionInterval, DISTRIBUTION_INTERVAL, "distributionInterval stored");
    assert.equal(vault.vaultDurationMonths, VAULT_DURATION_MONTHS, "vaultDurationMonths stored");
    assert.equal(vault.pledgeNote, PLEDGE_NOTE, "pledgeNote stored");

    console.log("  ✓ Vault initialized with pledge:", ROYALTY_PCT + "% royalties, monthly, 12 months");
  });

  it("rejects vault with track ID exceeding 32 chars", async () => {
    // Solana's SDK enforces a 32-byte max seed length at the client side, so
    // findProgramAddressSync itself throws before a transaction is sent.
    // The on-chain TrackIdTooLong guard handles any direct invocation bypassing the SDK.
    try {
      anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), Buffer.from(TRACK_ID_LONG)],
        program.programId
      );
      assert.fail("Expected SDK to throw Max seed length exceeded");
    } catch (err: any) {
      assert.include(
        err.message,
        "Max seed length exceeded",
        `Expected seed length error, got: ${err.message}`
      );
      console.log("  ✓ 33-char track ID rejected by SDK seed length guard");
    }
  });

  it("rejects vault with zero cap", async () => {
    const zeroCapId = "ZCAP" + BASE_ID;
    const [zPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), Buffer.from(zeroCapId)],
      program.programId
    );
    const [zToken] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault_token"), zPda.toBuffer()],
      program.programId
    );
    const [zShare] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("share_mint"), zPda.toBuffer()],
      program.programId
    );

    await expectError(
      () =>
        program.methods
          .initializeVault(zeroCapId, new anchor.BN(0), 30, 0, 12, "note")
          .accounts({
            authority: authority.publicKey,
            vault: zPda,
            usdcMint,
            vaultTokenAccount: zToken,
            shareMint: zShare,
            tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          })
          .rpc(),
      "InvalidCap"
    );
  });

  it("rejects vault with royalty_pct > 100", async () => {
    const badId = "RPCT" + BASE_ID;
    const [bPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), Buffer.from(badId)],
      program.programId
    );
    const [bToken] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault_token"), bPda.toBuffer()],
      program.programId
    );
    const [bShare] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("share_mint"), bPda.toBuffer()],
      program.programId
    );

    await expectError(
      () =>
        program.methods
          .initializeVault(badId, VAULT_CAP, 101, 0, 12, "note")
          .accounts({
            authority: authority.publicKey,
            vault: bPda,
            usdcMint,
            vaultTokenAccount: bToken,
            shareMint: bShare,
            tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          })
          .rpc(),
      "InvalidRoyaltyPct"
    );
  });

  it("rejects vault with invalid distribution_interval (> 2)", async () => {
    const badId = "DINT" + BASE_ID;
    const [bPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), Buffer.from(badId)],
      program.programId
    );
    const [bToken] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault_token"), bPda.toBuffer()],
      program.programId
    );
    const [bShare] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("share_mint"), bPda.toBuffer()],
      program.programId
    );

    await expectError(
      () =>
        program.methods
          .initializeVault(badId, VAULT_CAP, 30, 3, 12, "note")
          .accounts({
            authority: authority.publicKey,
            vault: bPda,
            usdcMint,
            vaultTokenAccount: bToken,
            shareMint: bShare,
            tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          })
          .rpc(),
      "InvalidDistributionInterval"
    );
  });

  it("rejects vault with pledge note exceeding 200 chars", async () => {
    const badId = "NOTE" + BASE_ID;
    const [bPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), Buffer.from(badId)],
      program.programId
    );
    const [bToken] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault_token"), bPda.toBuffer()],
      program.programId
    );
    const [bShare] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("share_mint"), bPda.toBuffer()],
      program.programId
    );

    await expectError(
      () =>
        program.methods
          .initializeVault(badId, VAULT_CAP, 30, 0, 12, "x".repeat(201))
          .accounts({
            authority: authority.publicKey,
            vault: bPda,
            usdcMint,
            vaultTokenAccount: bToken,
            shareMint: bShare,
            tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          })
          .rpc(),
      "PledgeNoteTooLong"
    );
  });

  it("accepts valid edge-case pledge values (0% royalty, milestone, ongoing)", async () => {
    const edgeId = "EDGE" + BASE_ID;
    const [ePda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), Buffer.from(edgeId)],
      program.programId
    );
    const [eToken] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault_token"), ePda.toBuffer()],
      program.programId
    );
    const [eShare] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("share_mint"), ePda.toBuffer()],
      program.programId
    );

    await program.methods
      .initializeVault(edgeId, VAULT_CAP, 0, 2, 0, "")
      .accounts({
        authority: authority.publicKey,
        vault: ePda,
        usdcMint,
        vaultTokenAccount: eToken,
        shareMint: eShare,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    const vault = await program.account.trackVault.fetch(ePda);
    assert.equal(vault.royaltyPct, 0, "0% royalty allowed");
    assert.equal(vault.distributionInterval, 2, "milestone interval allowed");
    assert.equal(vault.vaultDurationMonths, 0, "ongoing (0 months) allowed");
    assert.equal(vault.pledgeNote, "", "empty pledge note allowed");
    console.log("  ✓ Edge-case pledge values accepted");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. DEPOSITS
  // ═══════════════════════════════════════════════════════════════════════════

  it("deposits USDC into vault and receives shares 1:1", async () => {
    // Create and fund user USDC account
    const userUsdc = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      (authority as any).payer,
      usdcMint,
      authority.publicKey
    );
    userUsdcAddr = userUsdc.address;

    await mintTo(
      provider.connection,
      (authority as any).payer,
      usdcMint,
      userUsdcAddr,
      authority.publicKey,
      500_000_000 // 500 USDC
    );

    // Create user share account
    const userShares = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      (authority as any).payer,
      shareMint,
      authority.publicKey
    );
    userSharesAddr = userShares.address;

    await program.methods
      .deposit(DEPOSIT_AMOUNT)
      .accounts({
        user: authority.publicKey,
        vault: vaultPda,
        userPosition: userPositionPda,
        userUsdc: userUsdcAddr,
        vaultTokenAccount,
        shareMint,
        userShares: userSharesAddr,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const vault = await program.account.trackVault.fetch(vaultPda);
    assert.ok(vault.totalDeposited.eq(DEPOSIT_AMOUNT), "totalDeposited = 100 USDC");
    assert.ok(vault.totalShares.eq(DEPOSIT_AMOUNT), "totalShares = 100 shares (1:1)");

    const position = await program.account.userPosition.fetch(userPositionPda);
    assert.ok(position.sharesHeld.eq(DEPOSIT_AMOUNT), "user holds 100 shares");
    assert.ok(position.totalDeposited.eq(DEPOSIT_AMOUNT), "position.totalDeposited = 100 USDC");
    assert.equal(position.owner.toBase58(), authority.publicKey.toBase58(), "owner set");

    const sharesAcct = await getAccount(provider.connection, userSharesAddr);
    assert.equal(Number(sharesAcct.amount), DEPOSIT_AMOUNT.toNumber(), "share token minted");
    console.log("  ✓ Deposited 100 USDC, received 100 shares");
  });

  it("rejects deposit of zero", async () => {
    await expectError(
      () =>
        program.methods
          .deposit(new anchor.BN(0))
          .accounts({
            user: authority.publicKey,
            vault: vaultPda,
            userPosition: userPositionPda,
            userUsdc: userUsdcAddr,
            vaultTokenAccount,
            shareMint,
            userShares: userSharesAddr,
            tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .rpc(),
      "ZeroDeposit"
    );
  });

  it("rejects deposit that would exceed vault cap", async () => {
    // Try to deposit 1000 USDC into a 1000 USDC vault that already has 100 USDC
    const overCap = new anchor.BN(950_000_001); // cap - deposited + 1 = over
    await expectError(
      () =>
        program.methods
          .deposit(overCap)
          .accounts({
            user: authority.publicKey,
            vault: vaultPda,
            userPosition: userPositionPda,
            userUsdc: userUsdcAddr,
            vaultTokenAccount,
            shareMint,
            userShares: userSharesAddr,
            tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .rpc(),
      "VaultCapExceeded"
    );
  });

  it("allows a second deposit (adds to existing position)", async () => {
    const secondDeposit = new anchor.BN(50_000_000); // 50 USDC

    await program.methods
      .deposit(secondDeposit)
      .accounts({
        user: authority.publicKey,
        vault: vaultPda,
        userPosition: userPositionPda,
        userUsdc: userUsdcAddr,
        vaultTokenAccount,
        shareMint,
        userShares: userSharesAddr,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const vault = await program.account.trackVault.fetch(vaultPda);
    // 100 + 50 = 150 USDC
    assert.ok(vault.totalDeposited.eq(new anchor.BN(150_000_000)), "vault has 150 USDC");
    assert.ok(vault.totalShares.eq(new anchor.BN(150_000_000)), "150 shares");

    const position = await program.account.userPosition.fetch(userPositionPda);
    assert.ok(position.sharesHeld.eq(new anchor.BN(150_000_000)), "user holds 150 shares");
    assert.ok(position.totalDeposited.eq(new anchor.BN(150_000_000)), "position records 150 USDC");
    console.log("  ✓ Second deposit: vault now has 150 USDC / 150 shares");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. YIELD DISTRIBUTION
  // ═══════════════════════════════════════════════════════════════════════════

  it("distributes yield: increases share price without minting new shares", async () => {
    await program.methods
      .distributeYield(YIELD_AMOUNT)
      .accounts({
        authority: authority.publicKey,
        vault: vaultPda,
        authorityUsdc: userUsdcAddr,
        vaultTokenAccount,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      })
      .rpc();

    const vault = await program.account.trackVault.fetch(vaultPda);
    // 150 USDC + 10 USDC yield = 160 USDC
    assert.ok(vault.totalDeposited.eq(new anchor.BN(160_000_000)), "total_deposited grew");
    // Share count unchanged
    assert.ok(vault.totalShares.eq(new anchor.BN(150_000_000)), "total_shares unchanged");
    // Cumulative yield tracked
    assert.ok(vault.totalYieldDistributed.eq(YIELD_AMOUNT), "totalYieldDistributed = 10 USDC");

    const sharePrice = vault.totalDeposited.toNumber() / vault.totalShares.toNumber();
    assert.isAbove(sharePrice, 1.0, "share price > 1.0 after yield");
    console.log(
      "  ✓ Share price after yield:",
      sharePrice.toFixed(6),
      "USDC per share (was 1.0)"
    );
  });

  it("accumulates totalYieldDistributed across multiple distributions", async () => {
    const secondYield = new anchor.BN(5_000_000); // 5 USDC

    await program.methods
      .distributeYield(secondYield)
      .accounts({
        authority: authority.publicKey,
        vault: vaultPda,
        authorityUsdc: userUsdcAddr,
        vaultTokenAccount,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      })
      .rpc();

    const vault = await program.account.trackVault.fetch(vaultPda);
    // 10 USDC + 5 USDC = 15 USDC cumulative
    assert.ok(
      vault.totalYieldDistributed.eq(new anchor.BN(15_000_000)),
      "totalYieldDistributed = 15 USDC cumulative"
    );
    // 160 + 5 = 165 USDC
    assert.ok(vault.totalDeposited.eq(new anchor.BN(165_000_000)), "totalDeposited = 165 USDC");
    console.log("  ✓ Cumulative yield tracked:", vault.totalYieldDistributed.toNumber() / 1e6, "USDC");
  });

  it("rejects yield distribution from non-authority", async () => {
    const faker = anchor.web3.Keypair.generate();

    // Fund faker with SOL
    const transferIx = anchor.web3.SystemProgram.transfer({
      fromPubkey: authority.publicKey,
      toPubkey: faker.publicKey,
      lamports: 100_000_000,
    });
    await provider.sendAndConfirm(new anchor.web3.Transaction().add(transferIx));

    // Give faker some USDC
    const fakerUsdc = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      (authority as any).payer,
      usdcMint,
      faker.publicKey
    );
    await mintTo(
      provider.connection,
      (authority as any).payer,
      usdcMint,
      fakerUsdc.address,
      authority.publicKey,
      10_000_000
    );

    await expectError(
      () =>
        program.methods
          .distributeYield(new anchor.BN(10_000_000))
          .accounts({
            authority: faker.publicKey,
            vault: vaultPda,
            authorityUsdc: fakerUsdc.address,
            vaultTokenAccount,
            tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
          })
          .signers([faker])
          .rpc(),
      /Unauthorized|ConstraintRaw|2003|Error/
    );
  });

  it("rejects zero yield distribution", async () => {
    await expectError(
      () =>
        program.methods
          .distributeYield(new anchor.BN(0))
          .accounts({
            authority: authority.publicKey,
            vault: vaultPda,
            authorityUsdc: userUsdcAddr,
            vaultTokenAccount,
            tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
          })
          .rpc(),
      "ZeroDeposit"
    );
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. WITHDRAWALS
  // ═══════════════════════════════════════════════════════════════════════════

  it("withdraws proportional USDC including yield (share-price appreciation)", async () => {
    // At this point:
    //   total_deposited = 165 USDC (150 principal + 15 yield)
    //   total_shares    = 150 shares
    //   share price     = 165/150 = 1.1 USDC per share
    //
    // Withdraw 75 shares → should receive 75 * 165 / 150 = 82.5 USDC

    const withdrawShares = new anchor.BN(75_000_000);
    const expectedUSDC   = 82_500_000; // 82.5 USDC

    const usdcBefore = Number(
      (await getAccount(provider.connection, userUsdcAddr)).amount
    );

    await program.methods
      .withdraw(withdrawShares)
      .accounts({
        user: authority.publicKey,
        vault: vaultPda,
        userPosition: userPositionPda,
        vaultTokenAccount,
        userUsdc: userUsdcAddr,
        shareMint,
        userShares: userSharesAddr,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      })
      .rpc();

    const usdcAfter = Number(
      (await getAccount(provider.connection, userUsdcAddr)).amount
    );
    const received = usdcAfter - usdcBefore;

    assert.equal(received, expectedUSDC, "received 82.5 USDC (principal + yield share)");

    const vault = await program.account.trackVault.fetch(vaultPda);
    // 165 - 82.5 = 82.5 USDC remaining
    assert.ok(vault.totalDeposited.eq(new anchor.BN(82_500_000)), "82.5 USDC remains");
    // 150 - 75 = 75 shares remaining
    assert.ok(vault.totalShares.eq(new anchor.BN(75_000_000)), "75 shares remain");
    // totalYieldDistributed should not change on withdrawal (it's cumulative)
    assert.ok(vault.totalYieldDistributed.eq(new anchor.BN(15_000_000)), "yield counter unchanged");

    const position = await program.account.userPosition.fetch(userPositionPda);
    assert.ok(position.sharesHeld.eq(new anchor.BN(75_000_000)), "user has 75 shares left");
    console.log("  ✓ Withdrew 75 shares, received", received / 1e6, "USDC (includes yield)");
  });

  it("rejects withdrawal of zero shares", async () => {
    await expectError(
      () =>
        program.methods
          .withdraw(new anchor.BN(0))
          .accounts({
            user: authority.publicKey,
            vault: vaultPda,
            userPosition: userPositionPda,
            vaultTokenAccount,
            userUsdc: userUsdcAddr,
            shareMint,
            userShares: userSharesAddr,
            tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
          })
          .rpc(),
      "ZeroWithdraw"
    );
  });

  it("rejects withdrawal of more shares than held", async () => {
    // User holds 75 shares; try to withdraw 76
    await expectError(
      () =>
        program.methods
          .withdraw(new anchor.BN(76_000_000))
          .accounts({
            user: authority.publicKey,
            vault: vaultPda,
            userPosition: userPositionPda,
            vaultTokenAccount,
            userUsdc: userUsdcAddr,
            shareMint,
            userShares: userSharesAddr,
            tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
          })
          .rpc(),
      "InsufficientShares"
    );
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. UPDATE PLEDGE
  // ═══════════════════════════════════════════════════════════════════════════

  it("authority can update royalty pledge on existing vault", async () => {
    await program.methods
      .updatePledge(50, 1, 24, "Upgraded pledge: 50% quarterly for 24 months!")
      .accounts({
        authority: authority.publicKey,
        vault: vaultPda,
      })
      .rpc();

    const vault = await program.account.trackVault.fetch(vaultPda);
    assert.equal(vault.royaltyPct, 50, "royaltyPct updated to 50");
    assert.equal(vault.distributionInterval, 1, "distributionInterval updated to quarterly (1)");
    assert.equal(vault.vaultDurationMonths, 24, "vaultDurationMonths updated to 24");
    assert.equal(
      vault.pledgeNote,
      "Upgraded pledge: 50% quarterly for 24 months!",
      "pledgeNote updated"
    );
    console.log("  ✓ Pledge updated to 50% quarterly / 24 months");
  });

  it("rejects pledge update from non-authority", async () => {
    const faker = anchor.web3.Keypair.generate();
    const transferIx = anchor.web3.SystemProgram.transfer({
      fromPubkey: authority.publicKey,
      toPubkey: faker.publicKey,
      lamports: 100_000_000,
    });
    await provider.sendAndConfirm(new anchor.web3.Transaction().add(transferIx));

    await expectError(
      () =>
        program.methods
          .updatePledge(10, 0, 6, "Fake pledge")
          .accounts({
            authority: faker.publicKey,
            vault: vaultPda,
          })
          .signers([faker])
          .rpc(),
      /Unauthorized|ConstraintRaw|2003|Error/
    );
  });

  it("rejects pledge update with invalid royalty_pct", async () => {
    await expectError(
      () =>
        program.methods
          .updatePledge(101, 0, 12, "Bad pct")
          .accounts({
            authority: authority.publicKey,
            vault: vaultPda,
          })
          .rpc(),
      "InvalidRoyaltyPct"
    );
  });

  it("rejects pledge update with invalid distribution_interval", async () => {
    await expectError(
      () =>
        program.methods
          .updatePledge(30, 5, 12, "Bad interval")
          .accounts({
            authority: authority.publicKey,
            vault: vaultPda,
          })
          .rpc(),
      "InvalidDistributionInterval"
    );
  });

  it("rejects pledge update with note exceeding 200 chars", async () => {
    await expectError(
      () =>
        program.methods
          .updatePledge(30, 0, 12, "x".repeat(201))
          .accounts({
            authority: authority.publicKey,
            vault: vaultPda,
          })
          .rpc(),
      "PledgeNoteTooLong"
    );
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. MULTI-USER SCENARIO
  // ═══════════════════════════════════════════════════════════════════════════

  it("two users deposit and each receive proportional yield on withdrawal", async () => {
    // Create a fresh vault for this isolated test
    const [v2Pda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), Buffer.from(TRACK_ID_2)],
      program.programId
    );
    const [v2Token] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault_token"), v2Pda.toBuffer()],
      program.programId
    );
    const [v2Share] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("share_mint"), v2Pda.toBuffer()],
      program.programId
    );

    await program.methods
      .initializeVault(TRACK_ID_2, new anchor.BN(10_000_000_000), 20, 0, 12, "Multi-user test vault")
      .accounts({
        authority: authority.publicKey,
        vault: v2Pda,
        usdcMint,
        vaultTokenAccount: v2Token,
        shareMint: v2Share,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    // User A = authority (already has USDC)
    // User B = new keypair
    const userB = anchor.web3.Keypair.generate();
    const transferIx = anchor.web3.SystemProgram.transfer({
      fromPubkey: authority.publicKey,
      toPubkey: userB.publicKey,
      lamports: 200_000_000,
    });
    await provider.sendAndConfirm(new anchor.web3.Transaction().add(transferIx));

    const userBUsdc = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      (authority as any).payer,
      usdcMint,
      userB.publicKey
    );
    await mintTo(
      provider.connection,
      (authority as any).payer,
      usdcMint,
      userBUsdc.address,
      authority.publicKey,
      300_000_000 // 300 USDC for user B
    );

    const userBShares = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      (authority as any).payer,
      v2Share,
      userB.publicKey
    );

    const userAShares = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      (authority as any).payer,
      v2Share,
      authority.publicKey
    );

    // userA position for v2
    const [userAPos] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("position"), v2Pda.toBuffer(), authority.publicKey.toBuffer()],
      program.programId
    );
    // userB position for v2
    const [userBPos] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("position"), v2Pda.toBuffer(), userB.publicKey.toBuffer()],
      program.programId
    );

    // User A deposits 200 USDC, User B deposits 100 USDC
    await program.methods
      .deposit(new anchor.BN(200_000_000))
      .accounts({
        user: authority.publicKey,
        vault: v2Pda,
        userPosition: userAPos,
        userUsdc: userUsdcAddr,
        vaultTokenAccount: v2Token,
        shareMint: v2Share,
        userShares: userAShares.address,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    await program.methods
      .deposit(new anchor.BN(100_000_000))
      .accounts({
        user: userB.publicKey,
        vault: v2Pda,
        userPosition: userBPos,
        userUsdc: userBUsdc.address,
        vaultTokenAccount: v2Token,
        shareMint: v2Share,
        userShares: userBShares.address,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([userB])
      .rpc();

    // Artist distributes 30 USDC yield
    // vault: 300 deposited, 300 shares → after yield: 330 USDC, 300 shares
    // share price = 330/300 = 1.1 USDC
    await program.methods
      .distributeYield(new anchor.BN(30_000_000))
      .accounts({
        authority: authority.publicKey,
        vault: v2Pda,
        authorityUsdc: userUsdcAddr,
        vaultTokenAccount: v2Token,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      })
      .rpc();

    const vaultState = await program.account.trackVault.fetch(v2Pda);
    assert.ok(vaultState.totalYieldDistributed.eq(new anchor.BN(30_000_000)), "30 USDC yield");
    assert.ok(vaultState.totalDeposited.eq(new anchor.BN(330_000_000)), "330 USDC total");

    // User B withdraws all 100 shares → should receive 100 * 330/300 = 110 USDC
    const userBUsdcBefore = Number(
      (await getAccount(provider.connection, userBUsdc.address)).amount
    );

    await program.methods
      .withdraw(new anchor.BN(100_000_000))
      .accounts({
        user: userB.publicKey,
        vault: v2Pda,
        userPosition: userBPos,
        vaultTokenAccount: v2Token,
        userUsdc: userBUsdc.address,
        shareMint: v2Share,
        userShares: userBShares.address,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      })
      .signers([userB])
      .rpc();

    const userBUsdcAfter = Number(
      (await getAccount(provider.connection, userBUsdc.address)).amount
    );
    const userBReceived = userBUsdcAfter - userBUsdcBefore;

    // 100 USDC * (330/300) = 110 USDC
    assert.equal(userBReceived, 110_000_000, "user B received 110 USDC (100 principal + 10 yield)");
    console.log("  ✓ User B deposited 100 USDC, withdrew 110 USDC after 10% yield distribution");
    console.log("  ✓ Multi-user yield distribution works correctly");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. FINAL STATE VERIFICATION
  // ═══════════════════════════════════════════════════════════════════════════

  it("primary vault has correct final state", async () => {
    const vault = await program.account.trackVault.fetch(vaultPda);

    // After pledge update: 50%, quarterly, 24 months
    assert.equal(vault.royaltyPct, 50);
    assert.equal(vault.distributionInterval, 1);
    assert.equal(vault.vaultDurationMonths, 24);
    assert.equal(vault.pledgeNote, "Upgraded pledge: 50% quarterly for 24 months!");
    assert.ok(vault.totalYieldDistributed.eq(new anchor.BN(15_000_000)), "15 USDC total yield");
    // user withdrew 75 shares: 75 shares remain with 82.5 USDC
    assert.ok(vault.totalDeposited.eq(new anchor.BN(82_500_000)));
    assert.ok(vault.totalShares.eq(new anchor.BN(75_000_000)));

    console.log("\n  ═══════════════════════════════════════════");
    console.log("  Final Primary Vault State:");
    console.log("    totalDeposited:", vault.totalDeposited.toNumber() / 1e6, "USDC");
    console.log("    totalShares:", vault.totalShares.toNumber() / 1e6, "shares");
    console.log("    totalYieldDistributed:", vault.totalYieldDistributed.toNumber() / 1e6, "USDC");
    console.log("    sharePrice:", (vault.totalDeposited.toNumber() / vault.totalShares.toNumber()).toFixed(6));
    console.log("    royaltyPledge:", vault.royaltyPct + "% | interval=" + vault.distributionInterval + " | duration=" + vault.vaultDurationMonths + "mo");
    console.log("  ═══════════════════════════════════════════\n");
  });
});
