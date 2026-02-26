import { Router, Request, Response } from "express";
import { supabase } from "../../lib/supabase";

const router = Router();

// POST /api/db/deposits — record a confirmed deposit
router.post("/", async (req: Request, res: Response) => {
  const { tx_signature, track_id, backer_wallet, amount_usdc } =
    req.body as {
      tx_signature?: string;
      track_id?: string;
      backer_wallet?: string;
      amount_usdc?: number;
    };

  if (!tx_signature || !track_id || !backer_wallet || amount_usdc == null) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const { data, error } = await supabase
    .from("deposits")
    .upsert(
      { tx_signature, track_id, backer_wallet, amount_usdc },
      { onConflict: "tx_signature" }
    )
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json(data);
});

// GET /api/db/deposits/track/:trackId — all deposits for a vault
router.get("/track/:trackId", async (req: Request, res: Response) => {
  const { trackId } = req.params;

  const { data, error } = await supabase
    .from("deposits")
    .select("*")
    .eq("track_id", trackId)
    .order("deposited_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data ?? []);
});

// GET /api/db/deposits/backer/:wallet — all deposits by a wallet
router.get("/backer/:wallet", async (req: Request, res: Response) => {
  const { wallet } = req.params;

  const { data, error } = await supabase
    .from("deposits")
    .select("*, vaults(track_title, vault_address)")
    .eq("backer_wallet", wallet)
    .order("deposited_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data ?? []);
});

export default router;
