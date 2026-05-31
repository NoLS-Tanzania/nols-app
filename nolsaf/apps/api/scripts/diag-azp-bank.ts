/**
 * AzamPay BANK diagnostic — reproduces the exact two calls the bank route makes:
 *   1. POST {AUTH_URL}/AppRegistration/GenerateToken
 *   2. POST {API_URL}/api/v1/Partner/BankCheckout
 * and prints the real HTTP status / body so we can see WHY the route returns 503/502.
 *
 * Secrets are never printed — only key presence, URLs, status codes, and response bodies
 * (AzamPay error bodies do not echo our credentials).
 *
 * Usage:
 *   npx tsx scripts/diag-azp-bank.ts
 *   npx tsx scripts/diag-azp-bank.ts --bank=NMB --amount=1000
 */

import "../src/env.js";

const AUTH_URL = (process.env.AZAMPAY_AUTH_URL || "https://authenticator.azampay.co.tz").replace(/\/$/, "");
const API_URL  = (process.env.AZAMPAY_API_URL  || "https://api.azampay.co.tz").replace(/\/$/, "");

function arg(name: string, def: string): string {
  const m = process.argv.slice(2).find((a) => a.startsWith(`--${name}=`));
  return m ? m.split("=")[1] : def;
}

async function main() {
  const appName      = process.env.AZAMPAY_APP_NAME || "";
  const clientId     = process.env.AZAMPAY_CLIENT_ID || "";
  const clientSecret = process.env.AZAMPAY_CLIENT_SECRET || "";

  console.log("── Config ──────────────────────────────────────────");
  console.log("AUTH_URL          :", AUTH_URL);
  console.log("API_URL           :", API_URL);
  console.log("AZAMPAY_APP_NAME  :", appName || "(MISSING)");
  console.log("AZAMPAY_CLIENT_ID :", clientId ? `present(len=${clientId.length})` : "(MISSING)");
  console.log("CLIENT_SECRET     :", clientSecret ? `present(len=${clientSecret.length})` : "(MISSING)");
  console.log("");

  // ── 1. Token ──────────────────────────────────────────────────────────────
  console.log("── 1. GenerateToken ────────────────────────────────");
  let token = "";
  {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10_000);
    const t0 = Date.now();
    try {
      const res = await fetch(`${AUTH_URL}/AppRegistration/GenerateToken`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appName, clientId, clientSecret }),
        signal: ctrl.signal,
      });
      const text = await res.text();
      console.log(`HTTP ${res.status} in ${Date.now() - t0}ms`);
      let body: any;
      try { body = JSON.parse(text); } catch { body = null; }
      if (body) {
        console.log("success flag :", body?.success);
        console.log("message      :", body?.message ?? "(none)");
        token = body?.data?.accessToken || "";
        console.log("accessToken  :", token ? `received(len=${token.length})` : "(NONE)");
      } else {
        console.log("non-JSON body:", text.slice(0, 300));
      }
    } catch (err: any) {
      console.log(`FETCH THREW after ${Date.now() - t0}ms`);
      console.log("name  :", err?.name);
      console.log("cause :", err?.cause?.code ?? err?.cause?.message ?? err?.message ?? "unknown");
    } finally {
      clearTimeout(timer);
    }
  }
  console.log("");

  if (!token) {
    console.log(">>> Token step FAILED — this is the source of the 503. See above.");
    return;
  }

  // ── 2. BankCheckout ─────────────────────────────────────────────────────────
  const bankCode = arg("bank", "NMB");
  const amount   = arg("amount", "1000");
  console.log("── 2. BankCheckout ─────────────────────────────────");
  console.log(`provider=${bankCode} amount=${amount}`);
  const azampayBody = {
    amount,
    currencyCode: "TZS",
    merchantAccountNumber: "",
    merchantMobileNumber: "",
    merchantName: appName || "NoLSAF",
    otp: "",
    provider: bankCode,
    referenceId: `DIAG-${Date.now()}`,
    additionalProperties: { invoiceId: "0", bookingId: "0" },
  };
  {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10_000);
    const t0 = Date.now();
    try {
      const res = await fetch(`${API_URL}/api/v1/Partner/BankCheckout`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(azampayBody),
        signal: ctrl.signal,
      });
      const text = await res.text();
      console.log(`HTTP ${res.status} in ${Date.now() - t0}ms`);
      console.log("body:", text.slice(0, 800) || "(empty)");
    } catch (err: any) {
      console.log(`FETCH THREW after ${Date.now() - t0}ms`);
      console.log("name  :", err?.name);
      console.log("cause :", err?.cause?.code ?? err?.cause?.message ?? err?.message ?? "unknown");
    } finally {
      clearTimeout(timer);
    }
  }
}

main().catch((e) => { console.error("diag error:", e); process.exit(1); });
