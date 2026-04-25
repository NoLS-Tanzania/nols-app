/**
 * fix-encoding.mjs
 * Fixes Windows-1252 mojibake in TSX/TS source files.
 * Only processes files that contain mojibake-indicator characters (those that
 * appear ONLY as part of broken UTF-8 sequences, never in clean JSX code).
 * Run ONCE on original files. Running twice is safe (indicator check prevents re-processing).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIR = path.resolve(__dirname, "../apps/web");

function walk(dir, results = []) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (!["node_modules", ".next", "dist", "build", ".turbo"].includes(f)) walk(full, results);
    } else if (/\.(tsx?|jsx?)$/.test(f) && !f.endsWith(".bak")) {
      results.push(full);
    }
  }
  return results;
}

// Chars that appear ONLY in mojibake sequences (Windows-1252 code points > U+00FF)
// These never legitimately appear in JSX/TS source code.
const MOJIBAKE_INDICATORS = new Set([
  0x20AC, // euro sign, W1252 0x80, appears in sequences
  0x2122, // trade mark, W1252 0x99, part of broken apostrophe
  0x0152, // OE ligature, W1252 0x8C
  0x0153, // oe ligature, W1252 0x9C, part of broken left double quote
  0x02DC, // small tilde, W1252 0x98, part of broken star character
  0x2039, // left angle quote, W1252 0x8B
  0x203A, // right angle quote, W1252 0x9B
  0x017D, // Z with caron, W1252 0x8E
  0x0178, // Y with diaeresis, W1252 0x9F
]);

// Windows-1252 special chars (0x80-0x9F range) to their byte values
const W1252_TO_BYTE = {
  0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84, 0x2026: 0x85,
  0x2020: 0x86, 0x2021: 0x87, 0x02C6: 0x88, 0x2030: 0x89, 0x0160: 0x8A,
  0x2039: 0x8B, 0x0152: 0x8C, 0x017D: 0x8E, 0x2018: 0x91, 0x2019: 0x92,
  0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B, 0x0153: 0x9C,
  0x017E: 0x9E, 0x0178: 0x9F,
};

function fixMojibake(content) {
  const bytes = [];
  for (const ch of content) {
    const cp = ch.codePointAt(0);
    if (cp <= 0x7F) {
      bytes.push(cp);
    } else if (cp >= 0x80 && cp <= 0xFF) {
      // Latin-1 range maps directly to bytes
      bytes.push(cp);
    } else if (W1252_TO_BYTE[cp] !== undefined) {
      // Windows-1252 special char -> its byte value
      bytes.push(W1252_TO_BYTE[cp]);
    } else {
      // Legitimate high Unicode char (e.g. CJK, emoji) -> pass through as UTF-8 bytes
      const b = Buffer.from(ch, "utf8");
      for (const byte of b) bytes.push(byte);
    }
  }
  return Buffer.from(bytes).toString("utf8");
}

const files = walk(WEB_DIR);
let fixed = 0;
let skipped = 0;
let warned = 0;

for (const f of files) {
  const txt = fs.readFileSync(f, "utf8");

  // Quick scan: only process files with indicator chars
  let hasMojibake = false;
  for (const ch of txt) {
    if (MOJIBAKE_INDICATORS.has(ch.codePointAt(0))) { hasMojibake = true; break; }
  }
  if (!hasMojibake) { skipped++; continue; }

  const result = fixMojibake(txt);

  // Safety check: no U+FFFD replacement chars introduced
  const bad = [...result].filter(c => c.codePointAt(0) === 0xFFFD).length;
  if (bad > 0) {
    console.warn(`WARNING: ${bad} U+FFFD in ${f.replace(WEB_DIR, "web")} — skipping`);
    warned++;
    continue;
  }

  fs.writeFileSync(f, result, "utf8");
  fixed++;
}

console.log(`Done. Fixed: ${fixed}  Skipped (clean): ${skipped}  Warnings: ${warned}`);
