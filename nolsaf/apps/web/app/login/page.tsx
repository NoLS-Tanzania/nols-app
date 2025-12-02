"use client";
import { useState } from "react";
import { Lock } from 'lucide-react';
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "OWNER" | "DRIVER" | "USER">("USER");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
  // DEV: bypass API login; set stub cookies and redirect
  const token = `dev.${btoa(email || 'user')}.$${Date.now()}`;
  document.cookie = `token=${token}; path=/`;
  document.cookie = `role=${role}; path=/`;
  if (role === "ADMIN") router.push("/admin");
  else if (role === "OWNER") router.push("/owner");
  else if (role === "DRIVER") router.push("/driver");
  else router.push("/");
    } catch (err: any) {
      setError(err?.message || "Login error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <form onSubmit={onSubmit} className="card w-full max-w-sm p-6 space-y-4">
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
          />
        </label>
        <div className="text-right">
          <button type="button" onClick={() => router.push('/account/forgot-password')} className="text-sm text-slate-600 hover:underline inline-flex items-center gap-2">
            <Lock className="w-4 h-4" />
            <span>Forgot password?</span>
          </button>
        </div>
        <label className="block text-sm">
          <span className="block mb-1">Role</span>
          <select
            className="select w-full"
            value={role}
            onChange={(e) => setRole(e.target.value as any)}
          >
            <option value="USER">USER</option>
            <option value="DRIVER">DRIVER</option>
            <option value="OWNER">OWNER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </label>
        {error && <div className="text-sm text-rose-700">{error}</div>}
        <button className="btn btn-solid w-full" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
