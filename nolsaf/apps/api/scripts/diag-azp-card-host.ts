/**
 * Probe candidate AzamPay hosts for the CardCheckout endpoint.
 * Gets a real token, then POSTs a minimal CardCheckout to each host and reports
 * whether the connection completes (HTTP status) or resets (ECONNRESET).
 *
 * Usage: npx tsx scripts/diag-azp-card-host.ts
 */

import "../src/env.js";

const AUTH_URL = (process.env.AZAMPAY_AUTH_URL || "https://authenticator.azampay.co.tz").replace(/\/$/, "");

const HOSTS = [
  "https://sandbox.azampay.co.tz",     // current default (failing)
  "https://checkout.azampay.co.tz",    // AzamPay hosted-checkout host
  "https://api.azampay.co.tz",         // production API
];

async function getToken(): Promise<string> {
  const res = await fetch(`${AUTH_URL}/AppRegistration/GenerateToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      appName: process.env.AZAMPAY_APP_NAME || "",
      clientId: process.env.AZAMPAY_CLIENT_ID || "",
      clientSecret: process.env.AZAMPAY_CLIENT_SECRET || "",
    }),
  });
  const body: any = await res.json().catch(() => ({}));
  if (!body?.data?.accessToken) throw new Error(`token fetch failed: HTTP ${res.status} success=${body?.success}`);
  return body.data.accessToken;
}

async function probe(host: string, token: string) {
  const url = `${host}/api/v1/Partner/CardCheckout`;
  const payload = {
    amount: "1000",
    currency: "TZS",
    externalId: `DIAG-${Date.now()}`,
    merchantName: process.env.AZAMPAY_APP_NAME || "NoLSAF",
    returnUrl: "http://localhost:4000/api/payments/azampay/card/callback",
    additionalProperties: { invoiceId: "0", bookingId: "0" },
  };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10_000);
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    const text = await res.text();
    console.log(`  ${host}  → HTTP ${res.status} in ${Date.now() - t0}ms  body: ${text.slice(0, 200) || "(empty)"}`);
  } catch (err: any) {
    const cause = err?.cause?.code ?? err?.cause?.message ?? err?.message ?? "unknown";
    console.log(`  ${host}  → FAILED in ${Date.now() - t0}ms  (${err?.name}: ${cause})`);
  } finally {
    clearTimeout(timer);
  }
}

(async () => {
  console.log("Getting token...");
  let token: string;
  try { token = await getToken(); console.log("Token OK\n"); }
  catch (e: any) { console.log("Token FAILED:", e.message); return; }

  console.log("Probing CardCheckout on candidate hosts:");
  for (const h of HOSTS) await probe(h, token);
  console.log("\nThe host that returns an HTTP status (even 400/422) is the right one.");
  console.log("ECONNRESET / FAILED = that host does not serve CardCheckout.");
})();
