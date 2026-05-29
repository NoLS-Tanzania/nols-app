/**
 * AzamPay Sandbox Stability Test
 *
 * Hammers each channel/bank-code with N identical requests using a single valid
 * token, then prints a per-target success/failure breakdown and a copy-paste
 * report block for AzamPay support.
 *
 * It proves (in)stability: with a valid token and identical payloads, a healthy
 * gateway returns the SAME status every time. Random 200/404/ECONNRESET = the
 * gateway is unstable — which is exactly what this report demonstrates.
 *
 * NOTHING here charges anyone — sandbox checkout calls with dummy refs.
 * No secrets are printed (only key presence + URLs + status codes).
 *
 * Usage:
 *   npx tsx scripts/azp-stability-test.ts
 *   npx tsx scripts/azp-stability-test.ts --runs=20
 *   npx tsx scripts/azp-stability-test.ts --runs=15 --channel=bank
 *   npx tsx scripts/azp-stability-test.ts --runs=15 --channel=bank --banks=CRDB,NMB,NBC
 *   npx tsx scripts/azp-stability-test.ts --runs=10 --channel=card
 *   npx tsx scripts/azp-stability-test.ts --runs=15 --channel=mno
 *   npx tsx scripts/azp-stability-test.ts --runs=15 --channel=mno --phone=+255712345678
 *   npx tsx scripts/azp-stability-test.ts --runs=10 --channel=all
 */

import "../src/env.js";

const AUTH_URL = (process.env.AZAMPAY_AUTH_URL || "https://authenticator.azampay.co.tz").replace(/\/$/, "");
const API_URL  = (process.env.AZAMPAY_API_URL  || "https://api.azampay.co.tz").replace(/\/$/, "");
const APP_NAME = process.env.AZAMPAY_APP_NAME || "NoLSAF";

const ALL_BANKS = ["CRDB","NMB","NBC","STANBIC","EQUITY","IM","ABSA","TCB","BOA","DTB","UBA","AZANIA","KCB","NCBA","YETU"];

// MNO providers (AzamPay PostCheckout). Each needs a phone with a matching network prefix.
// Override the phone for ALL providers with --phone=+255XXXXXXXXX.
const MNO_PROVIDERS: Array<{ name: string; phone: string }> = [
  { name: "Airtel",   phone: "+255786666666" },
  { name: "Mixx",     phone: "+255716666666" }, // Tigo / Mixx by Yas
  { name: "MPESA",    phone: "+255746666666" }, // Vodacom
  { name: "Halopesa", phone: "+255626666666" }, // Halotel
];

const FETCH_TIMEOUT_MS = 10_000;

function arg(name: string, def: string): string {
  const m = process.argv.slice(2).find((a) => a.startsWith(`--${name}=`));
  return m ? m.split("=")[1] : def;
}

const RUNS    = Math.max(1, Math.min(200, Number(arg("runs", "15")) || 15));
const CHANNEL = arg("channel", "bank").toLowerCase();        // bank | card | mno | all
const PHONE_OVERRIDE = arg("phone", "").trim();              // applies to all MNO providers
const BANKS   = arg("banks", "").trim()
  ? arg("banks", "").split(",").map((s) => s.trim().toUpperCase()).filter(Boolean)
  : ALL_BANKS;

interface Outcome { status: number | "RESET" | "TIMEOUT" | "ERROR"; emptyBody: boolean; ms: number; }

async function getToken(): Promise<string> {
  const res = await fetch(`${AUTH_URL}/AppRegistration/GenerateToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      appName: APP_NAME,
      clientId: process.env.AZAMPAY_CLIENT_ID || "",
      clientSecret: process.env.AZAMPAY_CLIENT_SECRET || "",
    }),
  });
  const body: any = await res.json().catch(() => ({}));
  if (!body?.data?.accessToken) throw new Error(`token fetch failed: HTTP ${res.status} success=${body?.success} msg=${body?.message ?? ""}`);
  return body.data.accessToken;
}

async function callOnce(path: string, payload: object, token: string): Promise<Outcome> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  const t0 = Date.now();
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    const text = await res.text().catch(() => "");
    return { status: res.status, emptyBody: !text.trim(), ms: Date.now() - t0 };
  } catch (err: any) {
    const cause = err?.cause?.code ?? err?.message ?? "";
    const status: Outcome["status"] =
      cause === "ECONNRESET" ? "RESET" :
      err?.name === "AbortError" ? "TIMEOUT" : "ERROR";
    return { status, emptyBody: true, ms: Date.now() - t0 };
  } finally {
    clearTimeout(timer);
  }
}

function bankPayload(bankCode: string) {
  return {
    amount: "1000", currencyCode: "TZS", merchantAccountNumber: "",
    merchantMobileNumber: "", merchantName: APP_NAME, otp: "",
    provider: bankCode, referenceId: `STAB-BANK-${bankCode}-${Date.now()}`,
    additionalProperties: { test: "stability" },
  };
}
function cardPayload() {
  return {
    amount: "1000", currency: "TZS", externalId: `STAB-CARD-${Date.now()}`,
    merchantName: APP_NAME, returnUrl: "http://localhost:4000/api/payments/azampay/card/callback",
    additionalProperties: { test: "stability" },
  };
}
function mnoPayload(provider: string, phone: string) {
  return {
    accountNumber: phone, amount: "1000", currency: "TZS",
    externalId: `STAB-MNO-${provider}-${Date.now()}`, language: "SW", provider,
    additionalProperties: { test: "stability" },
  };
}

async function runTarget(
  label: string,
  path: string,
  makePayload: () => object,
  token: string,
  channel: "bank" | "card" | "mno",
) {
  const tally: Record<string, number> = {};
  const times: number[] = [];
  for (let i = 0; i < RUNS; i++) {
    const o = await callOnce(path, makePayload(), token);
    const key = o.status === 200 ? (o.emptyBody ? "200(empty)" : "200(body)") : String(o.status);
    tally[key] = (tally[key] || 0) + 1;
    times.push(o.ms);
  }
  const ok = (tally["200(body)"] || 0) + (tally["200(empty)"] || 0);
  const pct = ((ok / RUNS) * 100).toFixed(0);
  const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
  const breakdown = Object.entries(tally).sort().map(([k, v]) => `${k}=${v}`).join("  ");
  // For MNO an empty 200 IS the expected success (USSD push ack); annotate it.
  const note = channel === "mno" && (tally["200(empty)"] || 0) > 0 ? "  [200(empty)=push-sent OK]" : "";
  console.log(`  ${label.padEnd(10)} 200:${String(ok).padStart(2)}/${RUNS} (${pct.padStart(3)}%)  avg ${avg}ms   ${breakdown}${note}`);
  return { label, ok, runs: RUNS, breakdown, avg, channel };
}

(async () => {
  console.log("════════════════════════════════════════════════════════════════");
  console.log(" AzamPay Sandbox Stability Test");
  console.log("════════════════════════════════════════════════════════════════");
  console.log(`Time        : ${new Date().toISOString()}`);
  console.log(`Auth URL    : ${AUTH_URL}`);
  console.log(`API URL     : ${API_URL}`);
  console.log(`App name    : ${APP_NAME}`);
  console.log(`Runs/target : ${RUNS}    Channel: ${CHANNEL}`);
  console.log("");

  let token: string;
  try { token = await getToken(); console.log("Token       : OK (auth is healthy — failures below are NOT auth)\n"); }
  catch (e: any) { console.log("Token       : FAILED →", e.message); return; }

  const results: Array<{ label: string; ok: number; runs: number; breakdown: string; avg: number; channel: "bank" | "card" | "mno" }> = [];

  if (CHANNEL === "mno" || CHANNEL === "all") {
    console.log("── MNO (POST /api/v1/Partner/PostCheckout) — empty 200 = success ──");
    for (const p of MNO_PROVIDERS) {
      const phone = PHONE_OVERRIDE || p.phone;
      results.push(await runTarget(`${p.name}`, "/api/v1/Partner/PostCheckout", () => mnoPayload(p.name, phone), token, "mno"));
    }
    console.log("");
  }
  if (CHANNEL === "bank" || CHANNEL === "all") {
    console.log("── BANK (POST /api/v1/Partner/BankCheckout) ──────────────────────");
    for (const b of BANKS) results.push(await runTarget(b, "/api/v1/Partner/BankCheckout", () => bankPayload(b), token, "bank"));
    console.log("");
  }
  if (CHANNEL === "card" || CHANNEL === "all") {
    console.log("── CARD (POST /api/v1/Partner/CardCheckout) ──────────────────────");
    results.push(await runTarget("CARD", "/api/v1/Partner/CardCheckout", () => cardPayload(), token, "card"));
    console.log("");
  }

  // ── Report block for AzamPay ──────────────────────────────────────────────
  const unstable = results.filter((r) => r.ok > 0 && r.ok < r.runs);
  // MNO empty-200 is success, so only flag bank/card as "possibly not enabled".
  const deadEmpty = results.filter(
    (r) => r.channel !== "mno" && r.breakdown.includes("200(empty)") && !r.breakdown.includes("200(body)"),
  );
  const mnoPerfect = results.filter((r) => r.channel === "mno" && r.ok === r.runs);
  console.log("════════════════════════════════════════════════════════════════");
  console.log(" COPY-PASTE REPORT FOR AZAMPAY SUPPORT");
  console.log("════════════════════════════════════════════════════════════════");
  console.log(`Environment : ${API_URL}`);
  console.log(`Tested at   : ${new Date().toISOString()}`);
  console.log(`Method      : ${RUNS} identical requests per target, single valid Bearer token.`);
  console.log(`Auth        : token generated successfully (HTTP 200) — auth is not the issue.`);
  console.log(`Note        : MNO/PostCheckout returns an empty HTTP 200 as the USSD-push`);
  console.log(`              acknowledgment — for MNO that IS success.`);
  console.log("");
  console.log("Per-target results:");
  for (const r of results) {
    const tag = r.channel === "mno" ? " [MNO: empty 200 = push sent OK]" : "";
    console.log(`  - ${r.label}: ${r.ok}/${r.runs} succeeded | ${r.breakdown}${tag}`);
  }
  console.log("");
  if (mnoPerfect.length) {
    console.log("WORKING — MNO providers returning a consistent success on every attempt:");
    for (const r of mnoPerfect) console.log(`  - ${r.label}: ${r.ok}/${r.runs} (100%)`);
    console.log("");
  }
  if (unstable.length) {
    console.log("UNSTABLE — same valid request returns DIFFERENT statuses across attempts:");
    for (const r of unstable) console.log(`  - ${r.label}: ${r.breakdown}`);
    console.log("");
  }
  if (deadEmpty.length) {
    console.log("ALWAYS empty-200 (Bank/Card — please confirm enabled for our app):");
    for (const r of deadEmpty) console.log(`  - ${r.label}`);
    console.log("");
  }
  console.log("Request: please (1) confirm Bank/Card checkout are enabled for our app,");
  console.log("         and (2) investigate the intermittent 404/ECONNRESET on stable endpoints.");
  console.log("════════════════════════════════════════════════════════════════");
})();
