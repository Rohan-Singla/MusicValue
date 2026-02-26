import { Router, Request, Response } from "express";
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
  ACTIONS_CORS_HEADERS,
} from "../../lib/constants";

const router = Router();

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

// OPTIONS preflight
router.options("/", (_, res) => {
  res.set(ACTIONS_CORS_HEADERS).sendStatus(200);
});

// GET — action metadata
router.get("/", async (req: Request, res: Response) => {
  const trackId = req.query.trackId as string | undefined;

  if (!trackId) {
    return res
      .status(400)
      .set(ACTIONS_CORS_HEADERS)
      .json({ error: "trackId is required" });
  }

  let title = "Back this track";
  let description = "Deposit USDC into the music vault and earn yield";
  let icon = `${APP_URL}/musicvalue-icon.png`;

  try {
    const apiRes = await fetch(`${AUDIUS_API_BASE}/tracks/${trackId}`, {
      headers: { Accept: "application/json" },
    });
    if (apiRes.ok) {
      const data = await apiRes.json() as { data?: any };
      const track = data.data;
      if (track) {
        title = `Back "${track.title}" by ${track.user?.name || "Unknown"}`;
        description = `Deposit USDC into the music vault for ${track.title}. Earn DeFi yield while supporting the artist. ${track.play_count?.toLocaleString() || 0} plays on Audius.`;
        if (track.artwork?.["480x480"]) icon = track.artwork["480x480"];
      }
    }
  } catch {
    // use defaults
  }

  const payload = {
    type: "action",
    icon,
    title,
    description,
    label: "Back Track",
    links: {
      actions: [
        {
          type: "transaction",
          label: "Back with $10",
          href: `${APP_URL}/api/actions/back-track?trackId=${trackId}&amount=10`,
        },
        {
          type: "transaction",
          label: "Back with $25",
          href: `${APP_URL}/api/actions/back-track?trackId=${trackId}&amount=25`,
        },
        {
          type: "transaction",
          label: "Back with $50",
          href: `${APP_URL}/api/actions/back-track?trackId=${trackId}&amount=50`,
        },
        {
          type: "transaction",
          label: "Custom Amount",
          href: `${APP_URL}/api/actions/back-track?trackId=${trackId}&amount={amount}`,
          parameters: [
            {
              type: "number",
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

  return res.set(ACTIONS_CORS_HEADERS).json(payload);
});

// POST — build transaction
router.post("/", async (req: Request, res: Response) => {
  const trackId = req.query.trackId as string | undefined;
  const amountStr = req.query.amount as string | undefined;

  if (!trackId || !amountStr) {
    return res
      .status(400)
      .set(ACTIONS_CORS_HEADERS)
      .json({ error: "trackId and amount are required" });
  }

  const account = req.body?.account as string | undefined;
  if (!account) {
    return res
      .status(400)
      .set(ACTIONS_CORS_HEADERS)
      .json({ error: "account is required in request body" });
  }

  try {
    const userPubkey = new PublicKey(account);
    const amount = parseFloat(amountStr);

    if (isNaN(amount) || amount <= 0) {
      return res
        .status(400)
        .set(ACTIONS_CORS_HEADERS)
        .json({ error: "Invalid amount" });
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

    const amountBuf = Buffer.alloc(8);
    amountBuf.writeBigUInt64LE(BigInt(lamports));
    const data = Buffer.concat([DEPOSIT_DISCRIMINATOR, amountBuf]);

    const instructions: TransactionInstruction[] = [];

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

    return res.set(ACTIONS_CORS_HEADERS).json({
      transaction: serializedTx,
      message: `Backing track with $${amount} USDC`,
    });
  } catch (err: any) {
    return res
      .status(500)
      .set(ACTIONS_CORS_HEADERS)
      .json({ error: err.message || "Failed to create transaction" });
  }
});

export default router;
