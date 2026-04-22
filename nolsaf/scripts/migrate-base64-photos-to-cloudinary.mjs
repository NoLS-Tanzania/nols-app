/**
 * migrate-base64-photos-to-cloudinary.mjs
 *
 * Finds all properties whose `photos` JSON field contains base64 data URIs,
 * uploads them to Cloudinary, replaces the base64 strings with Cloudinary URLs
 * in the `photos` field, and creates `property_images` rows.
 *
 * Usage:
 *   node scripts/migrate-base64-photos-to-cloudinary.mjs
 *
 * Reads Cloudinary credentials and DB connection from apps/api/.env
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import https from "https";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "../apps/api/.env");
dotenv.config({ path: envPath });

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY     = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET  = process.env.CLOUDINARY_API_SECRET;

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.error("Missing Cloudinary env vars. Check apps/api/.env");
  process.exit(1);
}

// ── DB connection ────────────────────────────────────────────────────────────
const DB_HOST = process.env.DB_HOST || "127.0.0.1";
const DB_PORT = Number(process.env.DB_PORT || 3306);
const DB_USER = process.env.DB_USER || "root";
const DB_PASS = process.env.DB_PASSWORD || "NoLSVersion@2";
const DB_NAME = process.env.DB_NAME || "railway";

// Parse DATABASE_URL if set (format: mysql://user:pass@host:port/db)
// Use regex to avoid URL constructor mishandling mysql:// scheme
const DATABASE_URL = process.env.DATABASE_URL;
let dbConfig = { host: DB_HOST, port: DB_PORT, user: DB_USER, password: DB_PASS, database: DB_NAME };
if (DATABASE_URL) {
  try {
    // mysql://user:pass@host:port/db  (pass may contain %40 for @)
    const m = DATABASE_URL.match(/^mysql2?:\/\/([^:]+):(.+)@([^@:]+):(\d+)\/(.+)$/i);
    if (m) {
      dbConfig = {
        user: decodeURIComponent(m[1]),
        password: decodeURIComponent(m[2]),
        host: m[3],
        port: Number(m[4]),
        database: m[5],
      };
    }
  } catch {}
}

// ── Cloudinary upload helper ─────────────────────────────────────────────────
import crypto from "crypto";

function cloudinarySign(params) {
  const toSign = Object.entries(params)
    .filter(([k]) => k !== "file" && k !== "api_key")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  return crypto.createHash("sha256").update(toSign + CLOUDINARY_API_SECRET).digest("hex");
}

async function uploadBase64ToCloudinary(dataUri, folder = "properties") {
  const timestamp = Math.floor(Date.now() / 1000);
  const params = { folder, timestamp };
  const signature = cloudinarySign(params);

  const body = JSON.stringify({
    file: dataUri,
    folder,
    api_key: CLOUDINARY_API_KEY,
    timestamp: String(timestamp),
    signature,
  });

  return new Promise((resolve, reject) => {
    const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
    const req = https.request(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          if (json.secure_url) resolve(json.secure_url);
          else reject(new Error(`Cloudinary error: ${JSON.stringify(json)}`));
        } catch (e) {
          reject(new Error(`Cloudinary parse error: ${data.slice(0, 200)}`));
        }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const conn = await mysql.createConnection({ ...dbConfig, multipleStatements: false });
  console.log(`Connected to ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);

  // Find all properties with base64 photos
  const [rows] = await conn.query(
    "SELECT id, title, status, photos FROM property WHERE photos IS NOT NULL"
  );

  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of rows) {
    let photos;
    try {
      photos = typeof row.photos === "string" ? JSON.parse(row.photos) : row.photos;
    } catch {
      console.log(`  [SKIP] property ${row.id}: photos not parseable`);
      skipped++;
      continue;
    }

    if (!Array.isArray(photos) || photos.length === 0) { skipped++; continue; }

    const hasBase64 = photos.some(p => typeof p === "string" && p.startsWith("data:"));
    const hasHttp   = photos.some(p => typeof p === "string" && p.startsWith("http"));

    if (!hasBase64) { skipped++; continue; }

    console.log(`\nProperty id=${row.id} title="${row.title}" status=${row.status}`);
    console.log(`  ${photos.length} photo(s): ${hasBase64 ? "has base64" : ""} ${hasHttp ? "has http" : ""}`);

    const newPhotos = [];
    for (let i = 0; i < photos.length; i++) {
      const p = photos[i];
      if (typeof p !== "string") { newPhotos.push(p); continue; }

      if (!p.startsWith("data:")) {
        // Already a URL — keep it
        newPhotos.push(p);
        continue;
      }

      // Estimate size (base64 encodes 3 bytes per 4 chars)
      const estimatedBytes = Math.floor((p.length * 3) / 4);
      if (estimatedBytes > 20 * 1024 * 1024) {
        console.log(`  [SKIP] photo ${i}: too large (${(estimatedBytes/1024/1024).toFixed(1)}MB)`);
        // Drop it — don't keep un-uploadable base64 in DB
        continue;
      }

      try {
        console.log(`  Uploading photo ${i} (~${(estimatedBytes/1024).toFixed(0)}KB)...`);
        const url = await uploadBase64ToCloudinary(p, "properties");
        console.log(`  → ${url}`);
        newPhotos.push(url);

        // Create property_images row
        const filename = url.split("/").pop() || url;
        const storageKey = `${row.id}:${filename}`.slice(0, 190);
        await conn.query(
          `INSERT INTO property_images (propertyId, storageKey, url, status, createdAt, updatedAt)
           VALUES (?, ?, ?, 'PENDING', NOW(), NOW())
           ON DUPLICATE KEY UPDATE url = VALUES(url)`,
          [row.id, storageKey, url]
        );
      } catch (err) {
        console.error(`  [ERROR] uploading photo ${i}:`, err.message);
        errors++;
        // Drop the un-uploadable base64 (don't persist it)
        continue;
      }
    }

    // Update the photos field
    await conn.query(
      "UPDATE property SET photos = ? WHERE id = ?",
      [JSON.stringify(newPhotos), row.id]
    );
    console.log(`  Updated property ${row.id} photos: [${newPhotos.join(", ").slice(0, 120)}]`);
    migrated++;
  }

  await conn.end();
  console.log(`\nDone. Migrated=${migrated} Skipped=${skipped} Errors=${errors}`);
}

main().catch(err => { console.error(err); process.exit(1); });
