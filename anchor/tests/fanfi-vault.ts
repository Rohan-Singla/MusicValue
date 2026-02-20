import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { FanfiVault } from "../target/types/fanfi_vault";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { assert } from "chai";

describe("fanfi-vault", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.FanfiVault as Program<FanfiVault>;
  const authority = provider.wallet;

  const AUDIUS_TRACK_ID = "D7KyD";
  const VAULT_CAP = new anchor.BN(1_000_000_000); // 1000 USDC (6 decimals)
  const DEPOSIT_AMOUNT = new anchor.BN(100_000_000); // 100 USDC

  let usdcMint: anchor.web3.PublicKey;
  let vaultPda: anchor.web3.PublicKey;
  let vaultTokenAccount: anchor.web3.PublicKey;
  let shareMint: anchor.web3.PublicKey;

  before(async () => {
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
  });

  it("deposits USDC into vault", async () => {
    // Create user USDC token account and mint tokens
    const userUsdc = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      (authority as any).payer,
      usdcMint,
      authority.publicKey
    );

    await mintTo(
      provider.connection,
      (authority as any).payer,
      usdcMint,
      userUsdc.address,
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

    // Derive user position PDA
    const [userPosition] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("position"),
        vaultPda.toBuffer(),
        authority.publicKey.toBuffer(),
      ],
      program.programId
    );

    await program.methods
      .deposit(DEPOSIT_AMOUNT)
      .accounts({
        user: authority.publicKey,
        vault: vaultPda,
        userPosition,
        userUsdc: userUsdc.address,
        vaultTokenAccount,
        shareMint,
        userShares: userShares.address,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const vault = await program.account.trackVault.fetch(vaultPda);
    assert.ok(vault.totalDeposited.eq(DEPOSIT_AMOUNT));

    const position = await program.account.userPosition.fetch(userPosition);
    assert.ok(position.sharesHeld.eq(DEPOSIT_AMOUNT));
  });

  it("withdraws from vault", async () => {
    const userUsdc = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      (authority as any).payer,
      usdcMint,
      authority.publicKey
    );

    const userShares = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      (authority as any).payer,
      shareMint,
      authority.publicKey
    );

    const [userPosition] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("position"),
        vaultPda.toBuffer(),
        authority.publicKey.toBuffer(),
      ],
      program.programId
    );

    const withdrawAmount = new anchor.BN(50_000_000); // 50 USDC

    await program.methods
      .withdraw(withdrawAmount)
      .accounts({
        user: authority.publicKey,
        vault: vaultPda,
        userPosition,
        vaultTokenAccount,
        userUsdc: userUsdc.address,
        shareMint,
        userShares: userShares.address,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      })
      .rpc();

    const vault = await program.account.trackVault.fetch(vaultPda);
    assert.ok(vault.totalDeposited.eq(new anchor.BN(50_000_000)));

    const position = await program.account.userPosition.fetch(userPosition);
    assert.ok(position.sharesHeld.eq(new anchor.BN(50_000_000)));
  });
});
