"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { KeyRound, Shield, Settings as SettingsIcon } from "lucide-react";
import LogoSpinner from "@/components/LogoSpinner";

const api = axios.create({ baseURL: "", withCredentials: true });

type AccountMe = {
  id: number;
  role?: string | null;
  twoFactorEnabled?: boolean | null;
  twoFactorMethod?: string | null;
};

export default function AgentSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [me, setMe] = useState<AccountMe | null>(null);

  const twoFactorOn = Boolean(me?.twoFactorEnabled);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setAuthRequired(false);
        setForbidden(false);

        const res = await api.get("/api/account/me");
        if (!alive) return;
        const nextMe = (res.data || null) as AccountMe | null;
        setMe(nextMe);

        const role = String((nextMe as any)?.role ?? "").toUpperCase();
        if (role && role !== "AGENT") {
          setForbidden(true);
        }
      } catch (e: any) {
        if (!alive) return;
        if (e?.response?.status === 401) {
          setAuthRequired(true);
          setForbidden(false);
          setMe(null);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="w-full py-2 sm:py-4">
      <div className="mb-6 relative rounded-3xl border border-slate-200/70 bg-white/70 text-slate-900 backdrop-blur shadow-card overflow-hidden ring-1 ring-slate-900/5">
        <div className="absolute inset-0 bg-gradient-to-br from-brand/10 via-white/80 to-slate-50" aria-hidden />
        <div className="absolute -top-28 -right-24 h-72 w-72 rounded-full bg-brand/15 blur-3xl" aria-hidden />
        <div className="absolute -bottom-32 -left-28 h-80 w-80 rounded-full bg-slate-200/40 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/80" aria-hidden />

        <div className="relative p-5 sm:p-7">
          <div className="relative overflow-hidden rounded-[28px] border border-slate-200/70 bg-white/60 backdrop-blur px-5 py-4 sm:px-6 sm:py-5 shadow-card ring-1 ring-slate-900/5">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/70 via-transparent to-brand/10" aria-hidden />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/90" aria-hidden />

            <div className="relative">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Settings</h1>
                  <p className="text-sm sm:text-base text-slate-600 mt-1 leading-relaxed">Security and agent workspace preferences.</p>
                </div>

                <div className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200/70 bg-white/75 shadow-card ring-1 ring-slate-900/5 text-slate-700">
                  <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-brand/10 via-transparent to-transparent" aria-hidden />
                  <SettingsIcon className="relative h-5 w-5" aria-hidden />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <LogoSpinner size="lg" className="mb-4" ariaLabel="Loading settings" />
          <p className="text-sm text-slate-600">Loading settings...</p>
        </div>
      ) : authRequired ? (
        <div className="rounded-2xl border border-slate-200 bg-white/70 backdrop-blur p-6 shadow-card">
          <div className="text-sm font-bold text-slate-900">Sign in required</div>
          <div className="text-sm text-slate-600 mt-1">Log in to manage your security settings.</div>
          <div className="mt-4">
            <Link
              href="/account/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand text-white font-semibold no-underline hover:bg-brand-700 shadow-card transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>
      ) : forbidden ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
          <div className="text-sm font-bold">Access restricted</div>
          <div className="text-sm text-amber-800 mt-1">This page is available to agent accounts only.</div>
          <div className="mt-4">
            <Link
              href="/account"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 text-white font-semibold no-underline hover:bg-amber-700 shadow-card transition-colors"
            >
              Go to account
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 rounded-2xl border border-slate-200/70 bg-white/70 backdrop-blur shadow-card overflow-hidden ring-1 ring-slate-900/5">
            <div className="p-5 sm:p-6 border-b border-slate-200/70 bg-gradient-to-br from-white/70 via-slate-50/60 to-brand/5">
              <div className="text-sm font-bold text-slate-900">Security</div>
              <div className="text-sm text-slate-600 mt-1">Password, sessions, and two-factor authentication.</div>
            </div>
            <div className="p-5 sm:p-6 space-y-3">
              <Link
                href="/account/security"
                className="group relative flex items-center justify-between gap-4 overflow-hidden rounded-2xl border border-slate-200/70 bg-white/75 p-4 no-underline shadow-card ring-1 ring-slate-900/5 transition-all hover:-translate-y-[1px] hover:border-slate-300/70 hover:bg-white/85 hover:shadow-md"
              >
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/80 via-transparent to-brand/10 opacity-80" aria-hidden />
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/90" aria-hidden />
                <div className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-brand/10 blur-3xl" aria-hidden />

                <div className="flex items-start gap-3">
                  <div className="relative h-10 w-10 rounded-2xl border border-slate-200/70 bg-white/70 flex items-center justify-center text-brand shadow-card ring-1 ring-slate-900/5">
                    <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-brand/15 via-white/70 to-transparent" aria-hidden />
                    <Shield className="relative h-5 w-5" aria-hidden />
                  </div>
                  <div className="relative">
                    <div className="text-sm font-extrabold text-slate-900">Account security</div>
                    <div className="text-sm text-slate-600 mt-1">Update password and manage 2FA.</div>
                    <div
                      className={
                        twoFactorOn
                          ? "mt-2 inline-flex items-center rounded-full border border-success/20 bg-success/10 px-3 py-1 text-xs font-semibold text-success shadow-card"
                          : "mt-2 inline-flex items-center rounded-full border border-danger/20 bg-danger/10 px-3 py-1 text-xs font-semibold text-danger shadow-card"
                      }
                    >
                      2FA: {twoFactorOn ? `On${me?.twoFactorMethod ? ` (${me.twoFactorMethod})` : ""}` : "Off"}
                    </div>
                  </div>
                </div>
              </Link>

              <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-card">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-center text-slate-700 shadow-card">
                    <KeyRound className="h-5 w-5" aria-hidden />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">Sessions</div>
                    <div className="text-sm text-slate-600 mt-1">Manage active sessions and log out from devices.</div>
                    <div className="text-xs text-slate-500 mt-2">Available in the Security page.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 rounded-2xl border border-slate-200/70 bg-white/70 backdrop-blur shadow-card overflow-hidden ring-1 ring-slate-900/5">
            <div className="p-5 sm:p-6 border-b border-slate-200/70 bg-gradient-to-br from-white/70 via-slate-50/60 to-brand/5">
              <div className="text-sm font-bold text-slate-900">Profile</div>
              <div className="text-sm text-slate-600 mt-1">Update your personal details and review your agent profile.</div>
            </div>
            <div className="p-5 sm:p-6 space-y-3">
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-white shadow-card ring-1 ring-white/10 backdrop-blur">
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-brand/15" aria-hidden />
                <div className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-brand/20 blur-3xl" aria-hidden />
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/10" aria-hidden />

                <div className="relative flex items-start gap-3">
                  <div className="relative h-10 w-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/80 shadow-card ring-1 ring-white/10">
                    <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-brand/25 via-transparent to-transparent" aria-hidden />
                    <Shield className="relative h-5 w-5" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-white">Cyber security</div>
                    <div className="text-sm text-white/70 mt-1">
                      Keep your agent account safe by following these basics:
                    </div>
                    <ul className="mt-3 space-y-1 text-sm text-white/70 list-disc pl-5">
                      <li>Use a strong password and never share it.</li>
                      <li>Enable 2FA and keep your recovery options updated.</li>
                      <li>Watch out for phishing links and suspicious messages.</li>
                      <li>Log out on shared devices and avoid saving passwords on public computers.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
