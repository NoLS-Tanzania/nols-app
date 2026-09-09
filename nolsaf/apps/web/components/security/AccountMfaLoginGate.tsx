"use client";

import { useState } from "react";

export type AccountMfaStart = { mfaRequired: true; challengeId: string; method: "TOTP" };

export default function AccountMfaLoginGate({ initial, onVerified, onCancel }: {
  initial: AccountMfaStart;
  onVerified: (data: { token: string; user: { id: number; role: string } }) => Promise<void>;
  onCancel: () => void;
}) {
  const [code, setCode] = useState("");
  const [backup, setBackup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);
  return (
    <section className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" aria-labelledby="account-mfa-title">
      <h2 id="account-mfa-title" className="text-xl font-semibold text-slate-900">Verify your sign-in</h2>
      <p className="mt-2 text-sm text-slate-600">
        {backup ? "Enter one of the backup codes saved when you enabled two-factor authentication." : "Enter the six-digit code from your authenticator app to finish signing in."}
      </p>
      <form className="mt-5 space-y-4" onSubmit={async (event) => {
        event.preventDefault();
        if (busy || expired) return;
        setBusy(true); setError("");
        try {
          const response = await fetch("/api/auth/mfa/verify", {
            method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ challengeId: initial.challengeId, code: code.trim(), useBackupCode: backup }),
          });
          const data = await response.json();
          if (!response.ok || !data?.ok || !data?.token || !data?.user?.role) {
            setError(data?.message || "Verification failed. Please try again.");
            if ([401, 403, 429, 503].includes(response.status) || data?.code === "MFA_REPLAY") setExpired(true);
            return;
          }
          await onVerified(data);
        } catch { setError("Unable to verify your code. Please try again."); }
        finally { setBusy(false); }
      }}>
        <label className="block text-sm font-medium text-slate-700" htmlFor="account-mfa-code">{backup ? "Backup code" : "Authenticator code"}</label>
        <input id="account-mfa-code" name="code" autoFocus autoComplete="one-time-code"
          inputMode={backup ? "text" : "numeric"} type="text" required
          pattern={backup ? undefined : "[0-9]{6}"} maxLength={backup ? 128 : 6}
          value={code} onChange={(e) => setCode(e.target.value)} disabled={busy || expired}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-[#02665e]" />
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={busy || expired} className="min-h-11 w-full rounded-xl bg-[#02665e] px-4 py-3 font-semibold text-white disabled:opacity-50">
          {busy ? "Verifying…" : "Verify and sign in"}
        </button>
        <button type="button" disabled={busy || expired} onClick={() => { setBackup(!backup); setCode(""); setError(""); }}
          className="block min-h-11 w-full text-sm font-medium text-[#02665e] disabled:opacity-50">
          {backup ? "Use my authenticator app" : "Use a backup code"}
        </button>
        <button type="button" disabled={busy} onClick={onCancel} className="block min-h-11 w-full text-sm text-slate-600">Back to sign in</button>
        <p className="text-xs text-slate-500">Lost access to your authenticator and backup codes? Contact NoLSAF support for account recovery.</p>
      </form>
    </section>
  );
}
