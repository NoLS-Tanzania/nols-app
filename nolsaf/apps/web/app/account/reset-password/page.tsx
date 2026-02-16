"use client";
import React, { useEffect, useState } from "react";
import { Eye, EyeOff, Lock, AlertCircle, CheckCircle2, ArrowLeft, Check } from 'lucide-react';
import { useRouter, useSearchParams } from "next/navigation";

export default function ResetPasswordPage() {
  const search = useSearchParams();
  const router = useRouter();
  const token = search?.get("token") ?? "";
  const id = search?.get("id") ?? "";
  const method = search?.get("method") ?? "email";
  const nextRaw = search?.get("next") ?? "";

  const next = (() => {
    const v = String(nextRaw || "").trim();
    if (!v) return "";
    if (!v.startsWith("/")) return "";
    if (v.startsWith("//")) return "";
    return v;
  })();

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
    if (!token || !id) {
      setError("Reset link missing token or id. Please request a new password reset link.");
    }
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
        setTimeout(() => router.push(next || "/account/login"), 2200);
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
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg overflow-hidden border border-slate-100 box-border">
        {/* Header */}
        <div className="h-1 bg-[#02665e]" />
        
        <div className="px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(next || "/account/login")}
              className="w-10 h-10 rounded-lg border border-slate-300 flex items-center justify-center hover:bg-slate-50 transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#02665e]/10 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-[#02665e]" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Reset Password</h1>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Enter a new password for your account
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 min-w-0 overflow-hidden">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-sm text-red-800">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span className="flex-1 min-w-0 break-words">{error}</span>
            </div>
          )}

          {reasons.length > 0 && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 min-w-0">
              <div className="font-semibold mb-1.5">Password requirements:</div>
              <ul className="pl-5 list-disc space-y-0.5">
                {reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          {success ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2.5 min-w-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-emerald-900 mb-1">Password Reset Successful</h3>
                <p className="text-xs text-emerald-700">Redirecting to sign-in...</p>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4 min-w-0">
              <div className="space-y-2 min-w-0">
                <label className="block text-sm font-semibold text-slate-900">New password</label>
                <div className="relative min-w-0">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full max-w-full px-3 pr-10 py-2.5 text-sm border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] transition-all box-border"
                    placeholder="New password"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none border-none bg-transparent p-0"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Strength meter */}
                {password && (
                  <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 min-w-0">
                    <div className="flex gap-1 mb-2 min-w-0">
                      {[0,1,2,3,4].map((i) => (
                        <div 
                          key={i} 
                          className={`h-2 flex-1 min-w-0 rounded transition-all ${
                            i < strengthScore 
                              ? strengthScore <= 2 
                                ? 'bg-red-400' 
                                : strengthScore === 3 
                                ? 'bg-amber-400' 
                                : strengthScore === 4
                                ? 'bg-emerald-500'
                                : 'bg-emerald-600'
                              : 'bg-slate-200'
                          }`} 
                        />
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-xs min-w-0">
                      <span className={`font-medium flex-shrink-0 ${
                        strengthScore <= 2 ? 'text-red-600' : 
                        strengthScore === 3 ? 'text-amber-600' : 
                        'text-emerald-600'
                      }`}>
                        {strengthLabel} {password ? `(${strengthScore}/5)` : ''}
                      </span>
                      {clientReasons.length > 0 && (
                        <span className="text-slate-500 flex-shrink-0 ml-2">
                          {clientReasons.length} requirement{clientReasons.length > 1 ? 's' : ''} remaining
                        </span>
                      )}
                    </div>
                    {clientReasons.length > 0 && (
                      <ul className="mt-2 pl-4 text-xs text-slate-600 list-disc space-y-0.5 min-w-0">
                        {clientReasons.slice(0, 3).map((r, i) => (
                          <li key={i} className="break-words">{r}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2 min-w-0">
                <label className="block text-sm font-semibold text-slate-900">Confirm password</label>
                <div className="relative min-w-0">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="w-full max-w-full px-3 pr-10 py-2.5 text-sm border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] transition-all box-border"
                    placeholder="Confirm password"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none border-none bg-transparent p-0"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirm && password !== confirm && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Passwords do not match
                  </p>
                )}
                {confirm && password === confirm && password.length >= 8 && (
                  <p className="text-xs text-emerald-600 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Passwords match
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 min-w-0 gap-3">
                <button
                  type="submit"
                  disabled={loading || !token || !id || password.length < 8 || password !== confirm}
                  className="flex-1 min-w-0 px-6 py-2.5 bg-[#02665e] hover:bg-[#014e47] text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:shadow-md box-border"
                >
                  {loading ? (
                    <span className="flex items-center gap-1.5 justify-center">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin flex-shrink-0" />
                      <span className="truncate">Resetting...</span>
                    </span>
                  ) : (
                    <span className="truncate">Reset password</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/account/register')}
                  className="flex-shrink-0 text-sm text-slate-600 hover:text-[#02665e] transition-colors flex items-center gap-1.5 whitespace-nowrap"
                >
                  <ArrowLeft className="w-4 h-4 flex-shrink-0" />
                  <span>Back to sign in</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
