import "dotenv/config";
import express from "express";
import cors from "cors";
import { PORT } from "./lib/constants";

import rpcRouter from "./routes/rpc";
import verifyTrackRouter from "./routes/audius/verifyTrack";
import backTrackRouter from "./routes/actions/backTrack";
import artistsRouter from "./routes/db/artists";
import vaultsRouter from "./routes/db/vaults";
import depositsRouter from "./routes/db/deposits";

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

// Health check
app.get("/health", (_, res) => res.json({ ok: true }));

// Solana RPC proxy
app.use("/rpc", rpcRouter);

// Audius
app.use("/api/audius/verify-track", verifyTrackRouter);

// Solana Actions (Blinks)
app.use("/api/actions/back-track", backTrackRouter);

// Database
app.use("/api/db/artists", artistsRouter);
app.use("/api/db/vaults", vaultsRouter);
app.use("/api/db/deposits", depositsRouter);

app.listen(PORT, () => {
  console.log(`MusicValue backend running on http://localhost:${PORT}`);
});
