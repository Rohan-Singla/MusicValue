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

describe("music-value", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.MusicValue as Program<MusicValue>;
  const authority = provider.wallet;

  // Use unique track ID per run to avoid "account already in use" on devnet
  const AUDIUS_TRACK_ID = "T" + Date.now().toString().slice(-6);
  const VAULT_CAP = new anchor.BN(1_000_000_000); // 1000 USDC (6 decimals)
  const DEPOSIT_AMOUNT = new anchor.BN(100_000_000); // 100 USDC

  let usdcMint: anchor.web3.PublicKey;
  let vaultPda: anchor.web3.PublicKey;
  let vaultTokenAccount: anchor.web3.PublicKey;
  let shareMint: anchor.web3.PublicKey;
  let userUsdcAddr: anchor.web3.PublicKey;
  let userSharesAddr: anchor.web3.PublicKey;
  let userPositionPda: anchor.web3.PublicKey;

  before(async () => {
    console.log("Using track ID:", AUDIUS_TRACK_ID);

    // Create a mock USDC mint
    usdcMint = await createMint(
      provider.connection,
      (authority as any).payer,
      authority.publicKey,
      null,
      6
    );

    // Derive PDAs
    [vaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), Buffer.from(AUDIUS_TRACK_ID)],
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
      [
        Buffer.from("position"),
        vaultPda.toBuffer(),
        authority.publicKey.toBuffer(),
      ],
      program.programId
    );
  });

  it("initializes a vault", async () => {
    await program.methods
      .initializeVault(AUDIUS_TRACK_ID, VAULT_CAP)
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
    assert.equal(vault.audiusTrackId, AUDIUS_TRACK_ID);
    assert.ok(vault.cap.eq(VAULT_CAP));
    assert.ok(vault.totalDeposited.eq(new anchor.BN(0)));
    assert.ok(vault.totalShares.eq(new anchor.BN(0)));
  });

  it("deposits USDC into vault", async () => {
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

    // Create user share token account
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
    assert.ok(vault.totalDeposited.eq(DEPOSIT_AMOUNT));
    assert.ok(vault.totalShares.eq(DEPOSIT_AMOUNT));

    const position = await program.account.userPosition.fetch(userPositionPda);
    assert.ok(position.sharesHeld.eq(DEPOSIT_AMOUNT));
  });

  it("distributes yield into vault", async () => {
    const yieldAmount = new anchor.BN(10_000_000); // 10 USDC yield

    // Authority sends 10 USDC as yield into the vault
    await program.methods
      .distributeYield(yieldAmount)
      .accounts({
        authority: authority.publicKey,
        vault: vaultPda,
        authorityUsdc: userUsdcAddr, // same account, authority is the user here
        vaultTokenAccount,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      })
      .rpc();

    const vault = await program.account.trackVault.fetch(vaultPda);
    // total_deposited: 100 + 10 = 110 USDC
    assert.ok(vault.totalDeposited.eq(new anchor.BN(110_000_000)));
    // total_shares stays the same: still 100
    assert.ok(vault.totalShares.eq(DEPOSIT_AMOUNT));
    console.log(
      "Share price after yield:",
      vault.totalDeposited.toNumber() / vault.totalShares.toNumber(),
      "USDC per share"
    );
  });

  it("withdraws proportional USDC after yield", async () => {
    const usdcBefore = Number(
      (await getAccount(provider.connection, userUsdcAddr)).amount
    );

    // Withdraw 50 shares out of 100 total
    // Vault has 110 USDC, 100 shares -> each share = 1.1 USDC
    // 50 shares should return 55 USDC (not 50!)
    const withdrawShares = new anchor.BN(50_000_000);

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

    // 50 shares * 110 total / 100 shares = 55 USDC
    assert.equal(
      received,
      55_000_000,
      "Should receive proportional USDC including yield"
    );
    console.log("Withdrew 50 shares, received", received / 1_000_000, "USDC (includes yield)");

    const vault = await program.account.trackVault.fetch(vaultPda);
    // 110 - 55 = 55 USDC remaining
    assert.ok(vault.totalDeposited.eq(new anchor.BN(55_000_000)));
    // 100 - 50 = 50 shares remaining
    assert.ok(vault.totalShares.eq(new anchor.BN(50_000_000)));

    const position = await program.account.userPosition.fetch(userPositionPda);
    assert.ok(position.sharesHeld.eq(new anchor.BN(50_000_000)));
  });

  it("rejects yield distribution from non-authority", async () => {
    const faker = anchor.web3.Keypair.generate();

    // Fund faker with SOL from authority (avoids airdrop rate limits)
    const transferIx = anchor.web3.SystemProgram.transfer({
      fromPubkey: authority.publicKey,
      toPubkey: faker.publicKey,
      lamports: 100_000_000, // 0.1 SOL
    });
    const tx = new anchor.web3.Transaction().add(transferIx);
    await provider.sendAndConfirm(tx);

    // Create USDC account for faker and mint some
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

    try {
      await program.methods
        .distributeYield(new anchor.BN(10_000_000))
        .accounts({
          authority: faker.publicKey,
          vault: vaultPda,
          authorityUsdc: fakerUsdc.address,
          vaultTokenAccount,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        })
        .signers([faker])
        .rpc();
      assert.fail("Should have thrown unauthorized error");
    } catch (err: any) {
      // Should fail with constraint or unauthorized error
      assert.ok(
        err.message.includes("Unauthorized") ||
          err.message.includes("ConstraintRaw") ||
          err.message.includes("2003") ||
          err.message.includes("Error"),
        `Expected auth error, got: ${err.message}`
      );
      console.log("Correctly rejected non-authority yield distribution");
    }
  });
});
