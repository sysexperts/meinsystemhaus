import express from "express";
import path from "node:path";
import fs from "node:fs";
import { initDatabase } from "../electron/db";
import { createApiRouter } from "./routes";

const PORT = Number(process.env.PORT) || 3001;
const isProd = process.env.NODE_ENV === "production";

// Datenverzeichnis: per Env DATA_DIR ueberschreibbar (Docker-Volume),
// sonst ./data relativ zum Projekt.
const dataDir = process.env.DATA_DIR || path.join(process.cwd(), "data");
fs.mkdirSync(dataDir, { recursive: true });
initDatabase(path.join(dataDir, "meinsystemhaus.db"));

const app = express();
app.use(express.json({ limit: "5mb" }));

// REST-API unter /api
app.use("/api", createApiRouter());

// Health-Check fuer Docker / Reverse-Proxy
app.get("/healthz", (_req, res) => res.json({ status: "ok" }));

// Im Produktivbetrieb das gebaute Frontend (dist/) ausliefern und fuer
// Client-Routing immer index.html zurueckgeben (SPA-Fallback).
if (isProd) {
  const distDir = path.join(process.cwd(), "dist");
  app.use(express.static(distDir));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distDir, "index.html"));
  });
}

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`MeinSystemhaus API laeuft auf http://localhost:${PORT}`);
});
