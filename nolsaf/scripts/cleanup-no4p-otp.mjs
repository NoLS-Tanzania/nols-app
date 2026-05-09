#!/usr/bin/env node
/**
 * Delete No4P OTP audit rows older than the hot-retention window.
 *
 * Usage:
 *   node scripts/cleanup-no4p-otp.mjs
 *   NO4P_OTP_RETENTION_DAYS=30 node scripts/cleanup-no4p-otp.mjs
 *
 * Schedule daily with cron, Windows Task Scheduler, PM2, or your hosting scheduler.
 */

import dotenv from "dotenv";
import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import prismaPkg from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

dotenv.config({ path: "apps/api/.env" });
dotenv.config();

const { PrismaClient } = prismaPkg;
const retentionDays = Number(process.env.NO4P_OTP_RETENTION_DAYS || 30);
const dryRun = process.argv.includes("--dry-run");
const skipArchive = process.argv.includes("--no-archive");
const archiveDir = process.env.NO4P_OTP_ARCHIVE_DIR || "archives/no4p-otp";

if (!Number.isFinite(retentionDays) || retentionDays < 1) {
  throw new Error("NO4P_OTP_RETENTION_DAYS must be a positive number.");
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required. Configure apps/api/.env or the process environment.");
}

const adapter = createMariaDbAdapterFromDatabaseUrl(databaseUrl);
const prisma = new PrismaClient({ adapter });
const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
const where = {
  action: { in: ["NO4P_OTP_SENT", "NO4P_OTP_USED"] },
  createdAt: { lt: cutoff },
};

try {
  const count = await prisma.auditLog.count({ where });
  if (dryRun) {
    console.log(JSON.stringify({ ok: true, dryRun: true, retentionDays, cutoff: cutoff.toISOString(), rowsMatched: count, archiveDir }));
    process.exit(0);
  }

  const archivePath = count > 0 && !skipArchive ? await archiveRowsToCsv() : null;
  const deleted = await prisma.auditLog.deleteMany({ where });
  console.log(JSON.stringify({ ok: true, retentionDays, cutoff: cutoff.toISOString(), rowsMatched: count, rowsDeleted: deleted.count, archivePath }));
} finally {
  await prisma.$disconnect();
}

async function archiveRowsToCsv() {
  await mkdir(archiveDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filePath = path.join(archiveDir, `no4p-otp-audit-before-${cutoff.toISOString().slice(0, 10)}-${stamp}.csv`);
  const out = createWriteStream(filePath, { encoding: "utf8" });
  out.write([
    "id",
    "action",
    "entity",
    "actorId",
    "actorRole",
    "entityId",
    "createdAt",
    "ip",
    "ua",
    "beforeJson",
    "afterJson",
  ].join(",") + "\n");

  let cursor = undefined;
  const batchSize = 1000;
  for (;;) {
    const batch = await prisma.auditLog.findMany({
      where,
      orderBy: { id: "asc" },
      take: batchSize,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    if (!batch.length) break;

    for (const row of batch) {
      out.write([
        csvCell(row.id),
        csvCell(row.action),
        csvCell(row.entity),
        csvCell(row.actorId),
        csvCell(row.actorRole),
        csvCell(row.entityId),
        csvCell(row.createdAt),
        csvCell(row.ip),
        csvCell(row.ua),
        csvCell(row.beforeJson == null ? "" : JSON.stringify(row.beforeJson)),
        csvCell(row.afterJson == null ? "" : JSON.stringify(row.afterJson)),
      ].join(",") + "\n");
    }

    cursor = batch[batch.length - 1].id;
    if (batch.length < batchSize) break;
  }

  await new Promise((resolve, reject) => {
    out.end(resolve);
    out.on("error", reject);
  });
  return filePath;
}

function csvCell(value) {
  if (value == null) return "";
  const raw = value instanceof Date ? value.toISOString() : String(value);
  return /[",\r\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}

function createMariaDbAdapterFromDatabaseUrl(urlString) {
  const url = new URL(urlString);
  const database = url.pathname.replace(/^\/+/, "");
  const allowPublicKeyRetrievalParam = url.searchParams.get("allowPublicKeyRetrieval");
  const allowPublicKeyRetrieval = allowPublicKeyRetrievalParam !== "false" && allowPublicKeyRetrievalParam !== "0";
  const sslAccept = url.searchParams.get("sslaccept");
  const sslMode = url.searchParams.get("ssl-mode") || url.searchParams.get("sslmode");
  const wantsSsl = Boolean(sslAccept || sslMode);
  const shouldRejectUnauthorized = sslAccept
    ? sslAccept !== "accept_invalid_certs"
    : sslMode
      ? !["REQUIRED", "required", "DISABLED", "disabled"].includes(sslMode)
      : false;
  const ssl = wantsSsl
    ? { rejectUnauthorized: shouldRejectUnauthorized }
    : process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : undefined;

  return new PrismaMariaDb({
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: url.username ? decodeURIComponent(url.username) : undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    database: database || undefined,
    allowPublicKeyRetrieval,
    ssl,
    connectTimeout: 10000,
    socketTimeout: 60000,
    connectionLimit: 2,
    idleTimeout: 60000,
  });
}
