"use client";

import { useMemo } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAccount,
} from "@solana/spl-token";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { PROGRAM_ID_STR, USDC_MINT_STR } from "@/lib/constants";

import idl from "@/lib/idl.json";

function programId() {
  return new PublicKey(PROGRAM_ID_STR);
}

function usdcMint() {
  return new PublicKey(USDC_MINT_STR);
}

function useProgram() {
  const { connection } = useConnection();
  const wallet = useWallet();

  return useMemo(() => {
    if (!wallet.publicKey || !wallet.signTransaction) return null;

    try {
      const freshPublicKey = new PublicKey(wallet.publicKey.toBytes());

      const wrappedWallet = {
        publicKey: freshPublicKey,
        signTransaction: wallet.signTransaction,
        signAllTransactions: wallet.signAllTransactions,
      };

      const provider = new AnchorProvider(
        connection,
        wrappedWallet as any,
        AnchorProvider.defaultOptions()
      );

      // Anchor 0.30+ new IDL format: Program constructor reads address from IDL
      return new Program(idl as any, provider);
    } catch (e) {
      console.warn("Failed to initialize Anchor program:", e);
      return null;
    }
  }, [connection, wallet]);
}

function getVaultPda(trackId: string) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), Buffer.from(trackId)],
    programId()
  );
}

function getVaultTokenPda(vaultPda: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault_token"), vaultPda.toBuffer()],
    programId()
  );
}

function getShareMintPda(vaultPda: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("share_mint"), vaultPda.toBuffer()],
    programId()
  );
}

function getUserPositionPda(vaultPda: PublicKey, user: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("position"), vaultPda.toBuffer(), user.toBuffer()],
    programId()
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

/** Initialize a vault for a track (called when vault doesn't exist yet) */
export function useInitializeVault(trackId: string) {
  const program = useProgram();
  const { publicKey } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cap: number) => {
      if (!program || !publicKey) throw new Error("Wallet not connected");

      const mint = usdcMint();
      const [vaultPda] = getVaultPda(trackId);
      const [vaultTokenAccount] = getVaultTokenPda(vaultPda);
      const [shareMint] = getShareMintPda(vaultPda);

      const tx = await (program.methods as any)
        .initializeVault(trackId, new BN(cap))
        .accounts({
          authority: publicKey,
          vault: vaultPda,
          usdcMint: mint,
          vaultTokenAccount,
          shareMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc();

      return tx;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vault", trackId] });
    },
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

      const mint = usdcMint();
      const [vaultPda] = getVaultPda(trackId);
      const [vaultTokenAccount] = getVaultTokenPda(vaultPda);
      const [shareMint] = getShareMintPda(vaultPda);
      const [userPosition] = getUserPositionPda(vaultPda, publicKey);

      const userUsdc = await getAssociatedTokenAddress(mint, publicKey);
      const userShares = await getAssociatedTokenAddress(shareMint, publicKey);

      // Check if user share account exists, if not create it
      let preIx: any[] = [];
      try {
        await getAccount(connection, userShares);
      } catch {
        preIx.push(
          createAssociatedTokenAccountInstruction(
            publicKey,
            userShares,
            publicKey,
            shareMint
          )
        );
      }

      const builder = (program.methods as any)
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
        });

      if (preIx.length > 0) {
        builder.preInstructions(preIx);
      }

      return await builder.rpc();
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

      const mint = usdcMint();
      const [vaultPda] = getVaultPda(trackId);
      const [vaultTokenAccount] = getVaultTokenPda(vaultPda);
      const [shareMint] = getShareMintPda(vaultPda);
      const [userPosition] = getUserPositionPda(vaultPda, publicKey);

      const userUsdc = await getAssociatedTokenAddress(mint, publicKey);
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
