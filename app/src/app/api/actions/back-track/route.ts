import { NextRequest, NextResponse } from "next/server";
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  getAccount,
} from "@solana/spl-token";
import {
  SOLANA_RPC_URL,
  APP_URL,
  AUDIUS_API_BASE,
  PROGRAM_ID_STR,
  USDC_MINT_STR,
  USDC_DECIMALS,
} from "@/lib/constants";
import { ACTIONS_CORS_HEADERS } from "@/lib/actions";

// IDL discriminators from the compiled program
const DEPOSIT_DISCRIMINATOR = Buffer.from([242, 35, 198, 137, 82, 225, 242, 182]);

function programId() {
  return new PublicKey(PROGRAM_ID_STR);
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

export const OPTIONS = () => {
  return NextResponse.json(null, { headers: ACTIONS_CORS_HEADERS });
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const trackId = searchParams.get("trackId");

  if (!trackId) {
    return NextResponse.json(
      { error: "trackId is required" },
      { status: 400, headers: ACTIONS_CORS_HEADERS }
    );
  }

  // Fetch track info from Audius for metadata
  let title = "Back this track";
  let description = "Deposit USDC into the music vault and earn yield";
  let icon = `${APP_URL}/musicvalue-icon.png`;

  try {
    const res = await fetch(`${AUDIUS_API_BASE}/tracks/${trackId}`, {
      headers: {
        Accept: "application/json",
      },
    });
    if (res.ok) {
      const data = await res.json();
      const track = data.data;
      if (track) {
        title = `Back "${track.title}" by ${track.user?.name || "Unknown"}`;
        description = `Deposit USDC into the music vault for ${track.title}. Earn DeFi yield while supporting the artist. ${track.play_count?.toLocaleString() || 0} plays on Audius.`;
        if (track.artwork?.["480x480"]) {
          icon = track.artwork["480x480"];
        }
      }
    }
  } catch {
    // Use defaults if Audius API fails
  }

  const payload = {
    type: "action" as const,
    icon,
    title,
    description,
    label: "Back Track",
    links: {
      actions: [
        {
          type: "transaction" as const,
          label: "Back with $10",
          href: `${APP_URL}/api/actions/back-track?trackId=${trackId}&amount=10`,
        },
        {
          type: "transaction" as const,
          label: "Back with $25",
          href: `${APP_URL}/api/actions/back-track?trackId=${trackId}&amount=25`,
        },
        {
          type: "transaction" as const,
          label: "Back with $50",
          href: `${APP_URL}/api/actions/back-track?trackId=${trackId}&amount=50`,
        },
        {
          type: "transaction" as const,
          label: "Custom Amount",
          href: `${APP_URL}/api/actions/back-track?trackId=${trackId}&amount={amount}`,
          parameters: [
            {
              type: "number" as const,
              name: "amount",
              label: "USDC Amount",
              required: true,
              min: 1,
              max: 10000,
            },
          ],
        },
      ],
    },
  };

  return NextResponse.json(payload, { headers: ACTIONS_CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const trackId = searchParams.get("trackId");
  const amountStr = searchParams.get("amount");

  if (!trackId || !amountStr) {
    return NextResponse.json(
      { error: "trackId and amount are required" },
      { status: 400, headers: ACTIONS_CORS_HEADERS }
    );
  }

  const body = await req.json();
  const account = body.account;

  if (!account) {
    return NextResponse.json(
      { error: "account is required in request body" },
      { status: 400, headers: ACTIONS_CORS_HEADERS }
    );
  }

  try {
    const userPubkey = new PublicKey(account);
    const amount = parseFloat(amountStr);

    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid amount" },
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

    const connection = new Connection(SOLANA_RPC_URL, "confirmed");
    const mint = new PublicKey(USDC_MINT_STR);
    const [vaultPda] = getVaultPda(trackId);
    const [vaultTokenAccount] = getVaultTokenPda(vaultPda);
    const [shareMint] = getShareMintPda(vaultPda);
    const [userPosition] = getUserPositionPda(vaultPda, userPubkey);

    const userUsdc = await getAssociatedTokenAddress(mint, userPubkey);
    const userShares = await getAssociatedTokenAddress(shareMint, userPubkey);

    const lamports = Math.floor(amount * 10 ** USDC_DECIMALS);

    // Build instruction data: 8-byte discriminator + 8-byte u64 amount (little-endian)
    const amountBuf = Buffer.alloc(8);
    amountBuf.writeBigUInt64LE(BigInt(lamports));
    const data = Buffer.concat([DEPOSIT_DISCRIMINATOR, amountBuf]);

    const instructions: TransactionInstruction[] = [];

    // Create user share token account if it doesn't exist
    try {
      await getAccount(connection, userShares);
    } catch {
      instructions.push(
        createAssociatedTokenAccountInstruction(
          userPubkey,
          userShares,
          userPubkey,
          shareMint
        )
      );
    }

    // Build the deposit instruction matching the IDL account order
    instructions.push(
      new TransactionInstruction({
        programId: programId(),
        keys: [
          { pubkey: userPubkey, isSigner: true, isWritable: true },
          { pubkey: vaultPda, isSigner: false, isWritable: true },
          { pubkey: userPosition, isSigner: false, isWritable: true },
          { pubkey: userUsdc, isSigner: false, isWritable: true },
          { pubkey: vaultTokenAccount, isSigner: false, isWritable: true },
          { pubkey: shareMint, isSigner: false, isWritable: true },
          { pubkey: userShares, isSigner: false, isWritable: true },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data,
      })
    );

    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash("confirmed");

    const transaction = new Transaction({
      feePayer: userPubkey,
      blockhash,
      lastValidBlockHeight,
    }).add(...instructions);

    const serializedTx = transaction
      .serialize({ requireAllSignatures: false })
      .toString("base64");

    return NextResponse.json(
      {
        transaction: serializedTx,
        message: `Backing track with $${amount} USDC`,
      },
      { headers: ACTIONS_CORS_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to create transaction" },
      { status: 500, headers: ACTIONS_CORS_HEADERS }
    );
  }
}
