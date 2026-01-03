import { appendFile, mkdir } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

// Resolve workspace root from this file location (stable even if process.cwd() changes).
// This file lives at: nolsaf/apps/api/src/lib/debugLog.ts
// Up 5 => workspace root: D:\nolsapp2.1
const HERE = dirname(fileURLToPath(import.meta.url));
const LOG_PATH = join(HERE, "..", "..", "..", "..", "..", ".cursor", "debug.log");

export async function debugLog(line: Record<string, unknown>) {
  try {
    await mkdir(dirname(LOG_PATH), { recursive: true });
    await appendFile(LOG_PATH, JSON.stringify(line) + "\n", "utf8");
  } catch {
    // Never crash the app due to logging.
  }
}


