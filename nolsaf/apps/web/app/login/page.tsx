"use client";
import { useState } from "react";
import { Lock } from 'lucide-react';
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const r = await fetch("/api/auth/login-password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        const errorMsg = data?.error || `Login failed (${r.status})`;
        throw new Error(errorMsg);
      }

      // Determine where to route based on the authenticated user role.
      const me = await fetch("/api/account/me", { credentials: "include" }).then((x) => (x.ok ? x.json() : null));
      const role = String(me?.role || "").toUpperCase();
      if (role === "ADMIN") router.push("/admin");
      else if (role === "OWNER") router.push("/owner");
      else if (role === "DRIVER") router.push("/driver");
      else router.push("/public");
    } catch (err: any) {
      setError(err?.message || "Login error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50" suppressHydrationWarning>
      <form onSubmit={onSubmit} className="card w-full max-w-sm p-6 space-y-4" suppressHydrationWarning>
        <h1 className="text-xl font-semibold">Sign in</h1>
        <label className="block text-sm">
          <span className="block mb-1">Email</span>
          <input
            type="email"
            required
            className="input w-full"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            suppressHydrationWarning
          />
        </label>
        <label className="block text-sm">
          <span className="block mb-1">Password</span>
          <input
            type="password"
            required
            className="input w-full"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            suppressHydrationWarning
          />
        </label>
        <div className="text-right">
          <button type="button" onClick={() => router.push('/account/forgot-password')} className="text-sm text-slate-600 hover:underline inline-flex items-center gap-2">
            <Lock className="w-4 h-4" />
            <span>Forgot password?</span>
          </button>
        </div>
        {error && <div className="text-sm text-rose-700">{error}</div>}
        <button className="btn btn-solid w-full" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
