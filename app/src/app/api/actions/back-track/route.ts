/**
 * Solana Actions API endpoint for "Back this track"
 *
 * GET  - Returns action metadata (title, icon, description, buttons)
 * POST - Returns a serialized deposit transaction for the user to sign
 *
 * Follows the Solana Actions spec: https://solana.com/developers/guides/advanced/actions
 * Compatible with Blinks via dial.to and wallet extensions.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import { SOLANA_RPC_URL, APP_URL, AUDIUS_API_BASE } from "@/lib/constants";

// CORS headers required by Solana Actions spec
const ACTIONS_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, Content-Encoding, Accept-Encoding",
};

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

    const connection = new Connection(SOLANA_RPC_URL);
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash();

    // Build a placeholder transaction
    // In production, this would construct the actual deposit instruction
    // For MVP, we create a memo transaction as a placeholder
    const transaction = new Transaction({
      feePayer: userPubkey,
      blockhash,
      lastValidBlockHeight,
    }).add(
      SystemProgram.transfer({
        fromPubkey: userPubkey,
        toPubkey: userPubkey, // self-transfer as placeholder
        lamports: 0,
      })
    );

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
