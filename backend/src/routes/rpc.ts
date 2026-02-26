import { Router, Request, Response } from "express";
import { SOLANA_RPC_URL } from "../lib/constants";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  try {
    const upstream = await fetch(SOLANA_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });

    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err: any) {
    res.status(502).json({ error: "RPC proxy error", detail: err.message });
  }
});

export default router;
