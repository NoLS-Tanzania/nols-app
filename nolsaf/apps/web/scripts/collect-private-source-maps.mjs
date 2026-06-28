import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(scriptDir, "..");
const staticRoot = path.join(webRoot, ".next", "static");
const repositoryRoot = path.resolve(webRoot, "../..");
const packageJson = JSON.parse(await fs.readFile(path.join(webRoot, "package.json"), "utf8"));
const release = sanitizeSegment(
  process.env.VERCEL_GIT_COMMIT_SHA
    || process.env.RAILWAY_GIT_COMMIT_SHA
    || process.env.GIT_COMMIT_SHA
    || process.env.APP_VERSION
    || packageJson.version
    || "unknown"
);
const artifactRoot = path.join(repositoryRoot, "artifacts", "source-maps", release);

const files = await walk(staticRoot).catch(() => []);
let mapCount = 0;

for (const file of files) {
  if (!file.endsWith(".map")) continue;
  const relative = path.relative(staticRoot, file);
  const destination = path.join(artifactRoot, "_next", "static", relative);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.copyFile(file, destination);
  await fs.rm(file, { force: true });
  mapCount += 1;
}

// Remove browser-visible map references after extracting the private maps.
for (const file of files) {
  if (!/\.(?:js|mjs)$/.test(file)) continue;
  const source = await fs.readFile(file, "utf8");
  const stripped = source.replace(/\n?\/\/[#@]\s*sourceMappingURL=.*?(?=\r?\n|$)/g, "");
  if (stripped !== source) await fs.writeFile(file, stripped, "utf8");
}

console.log(`[source-maps] collected ${mapCount} private map${mapCount === 1 ? "" : "s"} for release ${release}`);

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  }));
  return nested.flat();
}

function sanitizeSegment(value) {
  return String(value).trim().replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 160) || "unknown";
}
