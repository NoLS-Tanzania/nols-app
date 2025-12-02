"use client";
import React, { useEffect, useState } from "react";
import { Eye, EyeOff } from 'lucide-react';
import { useRouter, useSearchParams } from "next/navigation";

export default function ResetPasswordPage() {
  const search = useSearchParams();
  const router = useRouter();
  const token = search?.get("token") ?? "";
  const id = search?.get("id") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reasons, setReasons] = useState<string[]>([]);
  const [clientReasons, setClientReasons] = useState<string[]>([]);
  const [strengthScore, setStrengthScore] = useState<number>(0);
  const [strengthLabel, setStrengthLabel] = useState<string>("");
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (!token || !id) setError("Reset link missing token or id.");
  }, [token, id]);

  const computeStrength = (pw: string) => {
    const checks = [
      { ok: pw.length >= 8, label: 'At least 8 characters' },
      { ok: /[a-z]/.test(pw), label: 'Include a lowercase letter' },
      { ok: /[A-Z]/.test(pw), label: 'Include an uppercase letter' },
      { ok: /\d/.test(pw), label: 'Include a number' },
      { ok: /[^A-Za-z0-9]/.test(pw), label: 'Include a special character' },
    ];
    const score = checks.reduce((s, c) => s + (c.ok ? 1 : 0), 0);
    const missing = checks.filter((c) => !c.ok).map((c) => c.label);
    let label = '';
    if (score <= 2) label = 'Weak';
    else if (score === 3) label = 'Fair';
    else if (score === 4) label = 'Strong';
    else label = 'Very strong';
    return { score, missing, label };
  };

  useEffect(() => {
    const { score, missing, label } = computeStrength(password);
    setStrengthScore(score);
    setClientReasons(missing);
    setStrengthLabel(label);
  }, [password]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setReasons([]);
    if (!token || !id) return setError("Missing token or id.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, userId: id, password }),
      });
      const data = await res.json();
      if (res.ok && data && data.ok) {
        setSuccess(true);
        setTimeout(() => router.push("/account/login"), 2200);
      } else {
        if (data && data.message === "weak_password" && Array.isArray(data.reasons)) {
          setReasons(data.reasons);
        } else if (data && data.message) {
          setError(String(data.message));
        } else {
          setError("Failed to reset password. Try again.");
        }
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4">
      <div className="w-full max-w-md bg-white shadow-md rounded-lg p-6">
        <h1 className="text-2xl font-semibold text-slate-800 mb-2">Reset Password</h1>
        <p className="text-sm text-slate-500 mb-4">Enter a new password for your account.</p>

        {error && (
          <div className="mb-4 text-sm text-red-700 bg-red-50 p-3 rounded">{error}</div>
        )}

        {reasons.length > 0 && (
          <div className="mb-4 text-sm text-yellow-800 bg-yellow-50 p-3 rounded">
            <div className="font-medium">Password requirements:</div>
            <ul className="mt-1 pl-5 list-disc">
              {reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        )}

        {success ? (
          <div className="p-4 bg-green-50 text-green-800 rounded">Password reset. Redirecting to sign-in...</div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">New password</label>
              <div className="mt-1 relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-md border-slate-200 shadow-sm pr-24 focus:border-slate-400 focus:ring-slate-300"
                  placeholder="New password"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-800 p-0 bg-transparent border-0 focus:outline-none"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Strength meter */}
              <div className="mt-3">
                <div className="flex gap-1 mb-2">
                  {[0,1,2,3,4].map((i) => (
                    <div key={i} className={`h-2 flex-1 rounded ${i < strengthScore ? (strengthScore <=2 ? 'bg-rose-400' : strengthScore===3 ? 'bg-amber-400' : 'bg-emerald-500') : 'bg-slate-100'}`} />
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <div>{strengthLabel}{password ? ` (${strengthScore}/5)` : ''}</div>
                  {clientReasons.length > 0 && <div className="text-right">{clientReasons.length} requirement{clientReasons.length>1?'s':''} remaining</div>}
                </div>
                {clientReasons.length > 0 && (
                  <ul className="mt-2 pl-5 text-xs text-slate-600 list-disc">
                    {clientReasons.slice(0,3).map((r,i) => <li key={i}>{r}</li>)}
                  </ul>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Confirm password</label>
              <div className="mt-1 relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="block w-full rounded-md border-slate-200 shadow-sm pr-24 focus:border-slate-400 focus:ring-slate-300"
                  placeholder="Confirm password"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-800 p-0 bg-transparent border-0 focus:outline-none"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center rounded-md bg-slate-800 text-white px-4 py-2 text-sm hover:bg-slate-900 disabled:opacity-60"
              >
                {loading ? "Resetting..." : "Reset password"}
              </button>
              <a className="text-sm text-slate-600 hover:underline cursor-pointer" onClick={() => router.push('/account/login')}>Back to sign in</a>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
