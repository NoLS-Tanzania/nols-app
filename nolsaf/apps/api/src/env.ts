import fs from "fs";
import path from "path";
import dotenv from "dotenv";

function tryLoadEnvFile(filePath: string) {
  try {
    if (!fs.existsSync(filePath)) return;
    dotenv.config({ path: filePath, override: false });
  } catch {
    // ignore
  }
}

// Load env in a way that works whether the API is started from repo root or from apps/api.
// Order matters: load .env.local BEFORE .env so local wins without overriding real OS env vars.
const cwd = process.cwd();
const candidates = [
  path.resolve(cwd, ".env.local"),
  path.resolve(cwd, ".env"),
  path.resolve(cwd, "..", ".env.local"),
  path.resolve(cwd, "..", ".env"),
  path.resolve(cwd, "..", "..", ".env.local"),
  path.resolve(cwd, "..", "..", ".env"),
];

const seen = new Set<string>();
for (const p of candidates) {
  const normalized = path.normalize(p);
  if (seen.has(normalized)) continue;
  seen.add(normalized);
  tryLoadEnvFile(normalized);
}

// Best-effort fallback: many dev setups store Mapbox tokens only in apps/web/.env.local.
// Load it last so API-specific env files still win, and we never override real OS env vars.
const webCandidates = [
  path.resolve(cwd, "apps", "web", ".env.local"),
  path.resolve(cwd, "apps", "web", ".env"),
  path.resolve(cwd, "..", "web", ".env.local"),
  path.resolve(cwd, "..", "web", ".env"),
];

for (const p of webCandidates) {
  const normalized = path.normalize(p);
  if (seen.has(normalized)) continue;
  seen.add(normalized);
  tryLoadEnvFile(normalized);
}
