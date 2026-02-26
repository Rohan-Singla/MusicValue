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
import { getTrack, AudiusTrack } from "@/services/audius";

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
          royaltyPct: (vault.royaltyPct as number) ?? 0,
          distributionInterval: (vault.distributionInterval as number) ?? 0,
          vaultDurationMonths: (vault.vaultDurationMonths as number) ?? 0,
          pledgeNote: (vault.pledgeNote as string) ?? "",
          totalYieldDistributed: (vault.totalYieldDistributed as BN).toNumber(),
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

export interface InitializeVaultParams {
  cap: number;
  royaltyPct: number;
  distributionInterval: number; // 0=monthly, 1=quarterly, 2=milestone
  vaultDurationMonths: number;  // 0 = ongoing
  pledgeNote: string;
}

/** Initialize a vault for a track with a royalty pledge */
export function useInitializeVault(trackId: string) {
  const program = useProgram();
  const { publicKey } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: InitializeVaultParams) => {
      if (!program || !publicKey) throw new Error("Wallet not connected");

      const mint = usdcMint();
      const [vaultPda] = getVaultPda(trackId);
      const [vaultTokenAccount] = getVaultTokenPda(vaultPda);
      const [shareMint] = getShareMintPda(vaultPda);

      const tx = await (program.methods as any)
        .initializeVault(
          trackId,
          new BN(params.cap),
          params.royaltyPct,
          params.distributionInterval,
          params.vaultDurationMonths,
          params.pledgeNote
        )
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

/** Distribute yield into the vault (artist/authority only) */
export function useDistributeYield(trackId: string) {
  const program = useProgram();
  const { publicKey } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (amountUsdc: number) => {
      if (!program || !publicKey) throw new Error("Wallet not connected");

      const mint = usdcMint();
      const [vaultPda] = getVaultPda(trackId);
      const [vaultTokenAccount] = getVaultTokenPda(vaultPda);
      const authorityUsdc = await getAssociatedTokenAddress(mint, publicKey);

      const tx = await (program.methods as any)
        .distributeYield(new BN(amountUsdc))
        .accounts({
          authority: publicKey,
          vault: vaultPda,
          authorityUsdc,
          vaultTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      return tx;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vault", trackId] });
    },
  });
}

/** Read-only program (no wallet needed — for fetching all vault accounts on the homepage) */
function useReadonlyProgram() {
  const { connection } = useConnection();
  return useMemo(() => {
    try {
      const dummy = {
        publicKey: new PublicKey("11111111111111111111111111111111"),
        signTransaction: async (tx: any) => tx,
        signAllTransactions: async (txs: any[]) => txs,
      };
      const provider = new AnchorProvider(connection, dummy as any, AnchorProvider.defaultOptions());
      return new Program(idl as any, provider);
    } catch {
      return null;
    }
  }, [connection]);
}

export interface VaultInfo {
  address: PublicKey;
  audiusTrackId: string;
  totalDeposited: number;
  cap: number;
  totalShares: number;
  authority: PublicKey;
  shareMint: PublicKey;
  // Royalty pledge fields
  royaltyPct: number;
  distributionInterval: number; // 0=monthly, 1=quarterly, 2=milestone
  vaultDurationMonths: number;  // 0 = ongoing
  pledgeNote: string;
  totalYieldDistributed: number;
}

export interface VaultedTrack {
  vault: VaultInfo;
  track: AudiusTrack;
}

/** Fetch every TrackVault account on-chain (works without a connected wallet) */
export function useAllVaults() {
  const program = useReadonlyProgram();

  return useQuery({
    queryKey: ["all-vaults"],
    queryFn: async (): Promise<VaultInfo[]> => {
      if (!program) return [];
      const accounts = await (program.account as any).trackVault.all();
      return accounts.map((a: any) => ({
        address: a.publicKey as PublicKey,
        audiusTrackId: a.account.audiusTrackId as string,
        totalDeposited: (a.account.totalDeposited as BN).toNumber(),
        cap: (a.account.cap as BN).toNumber(),
        totalShares: (a.account.totalShares as BN).toNumber(),
        authority: a.account.authority as PublicKey,
        shareMint: a.account.shareMint as PublicKey,
        royaltyPct: (a.account.royaltyPct as number) ?? 0,
        distributionInterval: (a.account.distributionInterval as number) ?? 0,
        vaultDurationMonths: (a.account.vaultDurationMonths as number) ?? 0,
        pledgeNote: (a.account.pledgeNote as string) ?? "",
        totalYieldDistributed: (a.account.totalYieldDistributed as BN).toNumber(),
      }));
    },
    enabled: !!program,
    staleTime: 30_000,
  });
}

/** Fetch all vaults and hydrate each with Audius track metadata */
export function useVaultedTracks() {
  const { data: vaults } = useAllVaults();

  return useQuery({
    queryKey: ["vaulted-tracks", vaults?.map((v) => v.audiusTrackId).join(",")],
    queryFn: async (): Promise<VaultedTrack[]> => {
      if (!vaults || vaults.length === 0) return [];
      const results = await Promise.allSettled(vaults.map((v) => getTrack(v.audiusTrackId)));
      return vaults
        .map((vault, i) => {
          const r = results[i];
          return r.status === "fulfilled" ? { vault, track: r.value } : null;
        })
        .filter(Boolean) as VaultedTrack[];
    },
    enabled: Array.isArray(vaults),
    staleTime: 60_000,
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
