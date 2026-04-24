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
// Development: apps/api-level files can override inherited shell vars.
// Production: never override platform-provided env vars (Elastic Beanstalk/App Runner/etc).
const cwd = process.cwd();
const isProduction = process.env.NODE_ENV === "production";

// Resolve the apps/api directory regardless of where the process was started from.
// __dirname is apps/api/src so two levels up is apps/api.
const apiDir = path.resolve(__dirname, "..", "..");

const seen = new Set<string>();

// 1) apps/api level
const apiLevelCandidates = isProduction
  ? [
      path.resolve(apiDir, ".env.production.local"),
      path.resolve(apiDir, ".env.production"),
    ]
  : [
      path.resolve(apiDir, ".env.local"),
      path.resolve(apiDir, ".env"),
    ];

for (const p of apiLevelCandidates) {
  const normalized = path.normalize(p);
  if (seen.has(normalized)) continue;
  seen.add(normalized);
  tryLoadEnvFile(normalized, !isProduction);
}

// 2) cwd level (may be same as apiDir; deduped)
const cwdCandidates = isProduction
  ? [
      path.resolve(cwd, ".env.production.local"),
      path.resolve(cwd, ".env.production"),
    ]
  : [
      path.resolve(cwd, ".env.local"),
      path.resolve(cwd, ".env"),
    ];

for (const p of cwdCandidates) {
  const normalized = path.normalize(p);
  if (seen.has(normalized)) continue;
  seen.add(normalized);
  tryLoadEnvFile(normalized, false);
}

// 3) Monorepo root — lowest priority
const rootCandidates = isProduction
  ? [
      path.resolve(cwd, "..", ".env.production.local"),
      path.resolve(cwd, "..", ".env.production"),
      path.resolve(cwd, "..", "..", ".env.production.local"),
      path.resolve(cwd, "..", "..", ".env.production"),
    ]
  : [
      path.resolve(cwd, "..", ".env.local"),
      path.resolve(cwd, "..", ".env"),
      path.resolve(cwd, "..", "..", ".env.local"),
      path.resolve(cwd, "..", "..", ".env"),
    ];

for (const p of rootCandidates) {
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