import { Router, Request, Response } from "express";
import { supabase } from "../../lib/supabase";

const router = Router();

// POST /api/db/artists — upsert an artist after registration
router.post("/", async (req: Request, res: Response) => {
  const { audius_user_id, audius_handle, audius_name, solana_wallet, terms_accepted } =
    req.body as {
      audius_user_id?: string;
      audius_handle?: string;
      audius_name?: string;
      solana_wallet?: string;
      terms_accepted?: boolean;
    };

  if (!audius_user_id || !audius_handle || !audius_name || !solana_wallet) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const { data, error } = await supabase
    .from("artists")
    .upsert(
      { audius_user_id, audius_handle, audius_name, solana_wallet, terms_accepted: terms_accepted ?? true },
      { onConflict: "audius_user_id" }
    )
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json(data);
});

// GET /api/db/artists/:audiusUserId
router.get("/:audiusUserId", async (req: Request, res: Response) => {
  const { audiusUserId } = req.params;

  const { data, error } = await supabase
    .from("artists")
    .select("*")
    .eq("audius_user_id", audiusUserId)
    .single();

  if (error && error.code === "PGRST116") {
    return res.status(404).json({ error: "Artist not found" });
  }
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

export default router;
