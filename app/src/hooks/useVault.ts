"use client";

import { useCallback, useMemo } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAccount,
} from "@solana/spl-token";
import { Program, AnchorProvider, BN, Idl } from "@coral-xyz/anchor";
import { PROGRAM_ID, USDC_MINT } from "@/lib/constants";

// Minimal IDL type - replace with generated IDL after `anchor build`
import idl from "@/lib/idl.json";

function useProgram() {
  const { connection } = useConnection();
  const wallet = useWallet();

  return useMemo(() => {
    if (!wallet.publicKey || !wallet.signTransaction) return null;

    const provider = new AnchorProvider(
      connection,
      wallet as any,
      AnchorProvider.defaultOptions()
    );

    return new Program(idl as Idl, PROGRAM_ID, provider);
  }, [connection, wallet]);
}

function getVaultPda(trackId: string) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), Buffer.from(trackId)],
    PROGRAM_ID
  );
}

function getVaultTokenPda(vaultPda: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault_token"), vaultPda.toBuffer()],
    PROGRAM_ID
  );
}

function getShareMintPda(vaultPda: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("share_mint"), vaultPda.toBuffer()],
    PROGRAM_ID
  );
}

function getUserPositionPda(vaultPda: PublicKey, user: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("position"), vaultPda.toBuffer(), user.toBuffer()],
    PROGRAM_ID
  );
}

/** Fetch vault state for a track */
export function useVault(trackId: string | undefined) {
  const program = useProgram();

  return useQuery({
    queryKey: ["vault", trackId],
    queryFn: async () => {
      if (!program || !trackId) return null;
      const [vaultPda] = getVaultPda(trackId);
      try {
        const vault = await (program.account as any).trackVault.fetch(vaultPda);
        return {
          address: vaultPda,
          audiusTrackId: vault.audiusTrackId as string,
          totalDeposited: (vault.totalDeposited as BN).toNumber(),
          cap: (vault.cap as BN).toNumber(),
          totalShares: (vault.totalShares as BN).toNumber(),
          authority: vault.authority as PublicKey,
          shareMint: vault.shareMint as PublicKey,
        };
      } catch {
        // Vault doesn't exist yet
        return null;
      }
    },
    enabled: !!program && !!trackId,
  });
}

/** Fetch user's position in a vault */
export function useUserPosition(trackId: string | undefined) {
  const program = useProgram();
  const { publicKey } = useWallet();

  return useQuery({
    queryKey: ["position", trackId, publicKey?.toBase58()],
    queryFn: async () => {
      if (!program || !trackId || !publicKey) return null;
      const [vaultPda] = getVaultPda(trackId);
      const [positionPda] = getUserPositionPda(vaultPda, publicKey);
      try {
        const position = await (program.account as any).userPosition.fetch(
          positionPda
        );
        return {
          sharesHeld: (position.sharesHeld as BN).toNumber(),
          totalDeposited: (position.totalDeposited as BN).toNumber(),
          depositedAt: (position.depositedAt as BN).toNumber(),
        };
      } catch {
        return null;
      }
    },
    enabled: !!program && !!trackId && !!publicKey,
  });
}

/** Deposit USDC into a track vault */
export function useDeposit(trackId: string) {
  const program = useProgram();
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (amount: number) => {
      if (!program || !publicKey) throw new Error("Wallet not connected");

      const [vaultPda] = getVaultPda(trackId);
      const [vaultTokenAccount] = getVaultTokenPda(vaultPda);
      const [shareMint] = getShareMintPda(vaultPda);
      const [userPosition] = getUserPositionPda(vaultPda, publicKey);

      const userUsdc = await getAssociatedTokenAddress(USDC_MINT, publicKey);
      const userShares = await getAssociatedTokenAddress(shareMint, publicKey);

      // Check if user share account exists, if not create it
      try {
        await getAccount(connection, userShares);
      } catch {
        const createAtaIx = createAssociatedTokenAccountInstruction(
          publicKey,
          userShares,
          publicKey,
          shareMint
        );
        // We'll prepend this instruction
        const tx = await (program.methods as any)
          .deposit(new BN(amount))
          .accounts({
            user: publicKey,
            vault: vaultPda,
            userPosition,
            userUsdc,
            vaultTokenAccount,
            shareMint,
            userShares,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .preInstructions([createAtaIx])
          .rpc();
        return tx;
      }

      const tx = await (program.methods as any)
        .deposit(new BN(amount))
        .accounts({
          user: publicKey,
          vault: vaultPda,
          userPosition,
          userUsdc,
          vaultTokenAccount,
          shareMint,
          userShares,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      return tx;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vault", trackId] });
      queryClient.invalidateQueries({ queryKey: ["position", trackId] });
    },
  });
}

/** Withdraw from a track vault */
export function useWithdraw(trackId: string) {
  const program = useProgram();
  const { publicKey } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (shares: number) => {
      if (!program || !publicKey) throw new Error("Wallet not connected");

      const [vaultPda] = getVaultPda(trackId);
      const [vaultTokenAccount] = getVaultTokenPda(vaultPda);
      const [shareMint] = getShareMintPda(vaultPda);
      const [userPosition] = getUserPositionPda(vaultPda, publicKey);

      const userUsdc = await getAssociatedTokenAddress(USDC_MINT, publicKey);
      const userShares = await getAssociatedTokenAddress(shareMint, publicKey);

      const tx = await (program.methods as any)
        .withdraw(new BN(shares))
        .accounts({
          user: publicKey,
          vault: vaultPda,
          userPosition,
          vaultTokenAccount,
          userUsdc,
          shareMint,
          userShares,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      return tx;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vault", trackId] });
      queryClient.invalidateQueries({ queryKey: ["position", trackId] });
    },
  });
}
