import fs from "fs";
import path from "path";
import dotenv from "dotenv";

function tryLoadEnvFile(filePath: string, override = false) {
  try {
    if (!fs.existsSync(filePath)) return;
    dotenv.config({ path: filePath, override });
  } catch {
    // ignore
  }
}

// Load env in a way that works whether the API is started from repo root or from apps/api.
// apps/api-level files ALWAYS override inherited env vars (override: true),
// so a stale DATABASE_URL set in the shell never wins over the project's .env.
// Root-level files load with override: false (lowest priority).
const cwd = process.cwd();

// Resolve the apps/api directory regardless of where the process was started from.
// __dirname is apps/api/src so two levels up is apps/api.
const apiDir = path.resolve(__dirname, "..", "..");

const seen = new Set<string>();

// 1) apps/api level — highest priority, override: true so shell-inherited vars don't win
for (const p of [
  path.resolve(apiDir, ".env.local"),
  path.resolve(apiDir, ".env"),
]) {
  const normalized = path.normalize(p);
  if (seen.has(normalized)) continue;
  seen.add(normalized);
  tryLoadEnvFile(normalized, true);
}

// 2) cwd level (may be same as apiDir; deduped)
for (const p of [
  path.resolve(cwd, ".env.local"),
  path.resolve(cwd, ".env"),
]) {
  const normalized = path.normalize(p);
  if (seen.has(normalized)) continue;
  seen.add(normalized);
  tryLoadEnvFile(normalized, false);
}

// 3) Monorepo root — lowest priority
for (const p of [
  path.resolve(cwd, "..", ".env.local"),
  path.resolve(cwd, "..", ".env"),
  path.resolve(cwd, "..", "..", ".env.local"),
  path.resolve(cwd, "..", "..", ".env"),
]) {
  const normalized = path.normalize(p);
  if (seen.has(normalized)) continue;
  seen.add(normalized);
  tryLoadEnvFile(normalized, false);
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