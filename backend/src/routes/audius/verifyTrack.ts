import { Router, Request, Response } from "express";
import { AUDIUS_API_BASE, AUDIUS_API_KEY } from "../../lib/constants";

const router = Router();

function audiusHeaders(): Record<string, string> {
  const h: Record<string, string> = { Accept: "application/json" };
  if (AUDIUS_API_KEY) h["Authorization"] = `Bearer ${AUDIUS_API_KEY}`;
  return h;
}

router.post("/", async (req: Request, res: Response) => {
  try {
    const { jwt, trackId } = req.body as { jwt?: string; trackId?: string };

    if (!jwt || !trackId) {
      return res.status(400).json({ error: "Missing jwt or trackId" });
    }

    // 1. Verify JWT with Audius to get the requesting user's ID
    const verifyUrl = new URL(`${AUDIUS_API_BASE}/users/verify_token`);
    verifyUrl.searchParams.set("token", jwt);

    const verifyRes = await fetch(verifyUrl.toString(), {
      headers: audiusHeaders(),
    });

    if (!verifyRes.ok) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const verifyJson = await verifyRes.json() as { data?: any; userId?: string; user_id?: string; id?: string };
    const d = verifyJson.data ?? verifyJson;
    const userId: string | undefined = d?.userId ?? d?.user_id ?? d?.id;

    if (!userId) {
      return res.status(401).json({
        error: `Token missing userId (keys: ${Object.keys(d ?? {}).join(", ")})`,
      });
    }

    // 2. Fetch track from Audius to get the track owner's ID
    const trackRes = await fetch(`${AUDIUS_API_BASE}/tracks/${trackId}`, {
      headers: audiusHeaders(),
    });

    if (!trackRes.ok) {
      return res.status(404).json({ error: "Track not found" });
    }

    const trackJson = await trackRes.json() as { data?: { user?: { id?: string } } };
    const trackOwnerId: string | undefined = trackJson.data?.user?.id;

    if (!trackOwnerId) {
      return res.status(500).json({ error: "Could not determine track owner" });
    }

    // 3. Ownership check
    if (userId !== trackOwnerId) {
      return res.status(403).json({ error: "You do not own this track" });
    }

    return res.status(200).json({ ok: true, userId, trackOwnerId });
  } catch (err: any) {
    return res
      .status(500)
      .json({ error: err.message || "Internal server error" });
  }
});

export default router;
