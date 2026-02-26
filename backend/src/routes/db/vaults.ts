import { Router, Request, Response } from "express";
import { PublicKey } from "@solana/web3.js";
import { supabase } from "../../lib/supabase";
import { PROGRAM_ID_STR } from "../../lib/constants";

const router = Router();

function deriveVaultAddress(trackId: string): string {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), Buffer.from(trackId)],
    new PublicKey(PROGRAM_ID_STR)
  );
  return pda.toBase58();
}

// POST /api/db/vaults — register a vault after on-chain creation
router.post("/", async (req: Request, res: Response) => {
  const { track_id, track_title, audius_user_id, artist_wallet, cap } =
    req.body as {
      track_id?: string;
      track_title?: string;
      audius_user_id?: string;
      artist_wallet?: string;
      cap?: number;
    };

  if (!track_id || !track_title || !audius_user_id || !artist_wallet || cap == null) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  let vault_address: string;
  try {
    vault_address = deriveVaultAddress(track_id);
  } catch {
    return res.status(400).json({ error: "Invalid track_id — cannot derive vault PDA" });
  }

  const { data, error } = await supabase
    .from("vaults")
    .upsert(
      { track_id, track_title, vault_address, audius_user_id, artist_wallet, cap },
      { onConflict: "track_id" }
    )
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json(data);
});

// GET /api/db/vaults — list all vaults
router.get("/", async (_req: Request, res: Response) => {
  const { data, error } = await supabase
    .from("vaults")
    .select("*, artists(audius_handle, audius_name)")
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// GET /api/db/vaults/track/:trackId
router.get("/track/:trackId", async (req: Request, res: Response) => {
  const { trackId } = req.params;

  const { data, error } = await supabase
    .from("vaults")
    .select("*, artists(audius_handle, audius_name)")
    .eq("track_id", trackId)
    .single();

  if (error && error.code === "PGRST116") {
    return res.status(404).json({ error: "Vault not found" });
  }
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// GET /api/db/vaults/artist/:audiusUserId — vaults owned by an artist
router.get("/artist/:audiusUserId", async (req: Request, res: Response) => {
  const { audiusUserId } = req.params;

  const { data, error } = await supabase
    .from("vaults")
    .select("*")
    .eq("audius_user_id", audiusUserId)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data ?? []);
});

export default router;
