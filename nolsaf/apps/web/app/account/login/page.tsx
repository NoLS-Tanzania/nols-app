"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export const dynamic = "force-dynamic";

function safeNextPath(raw: string | null): string | undefined {
  if (typeof raw !== "string") return undefined;
  const v = raw.trim();
  if (!v) return undefined;
  if (!v.startsWith("/") || v.startsWith("//")) return undefined;
  return v;
}

export default function AccountLoginRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const nextPath = useMemo(() => safeNextPath(searchParams.get("next")), [searchParams]);

  const targetHref = useMemo(() => {
    const next = nextPath;
    const role = searchParams.get("role")?.trim() || undefined;
    const ref = searchParams.get("ref")?.trim() || undefined;

    const params = new URLSearchParams();
    params.set("mode", "login");
    if (next) params.set("next", next);
    if (role) params.set("role", role);
    if (ref) params.set("ref", ref);

    const qs = params.toString();
    return `/account/register${qs ? `?${qs}` : ""}`;
  }, [searchParams]);

  useEffect(() => {
    router.replace(targetHref);
  }, [router, targetHref]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-14 bg-gradient-to-b from-white via-emerald-50/30 to-slate-50">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="p-8">
          <div className="flex items-start gap-4">
            <div className="h-11 w-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-semibold tracking-wide shadow-sm">
              N
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <h1 className="text-2xl font-semibold text-slate-900">Secure sign-in</h1>
                <div className="h-5 w-5 rounded-full border-2 border-emerald-200 border-t-emerald-600 animate-spin" aria-label="Loading" />
              </div>
              <p className="mt-1 text-sm text-slate-600">
                Redirecting you to the unified sign-in experience.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 px-5 py-4">
              <p className="text-sm text-slate-700 leading-6">
                Continue with phone OTP or email + password. After signing in, we’ll bring you back automatically.
              </p>
              {nextPath ? (
                <p className="mt-2 text-xs text-slate-500">
                  Return to: <span className="font-medium text-slate-700">{nextPath}</span>
                </p>
              ) : null}
            </div>

            <div className="flex items-center gap-3">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-600 animate-pulse" />
              <span className="text-xs text-slate-500">If this takes more than a moment, use the button below.</span>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link
              href={targetHref}
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition"
            >
              Continue to Sign In
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Go Home
            </Link>
          </div>
        </div>

        <div className="px-8 py-4 bg-slate-50 border-t border-slate-200">
          <p className="text-xs text-slate-500">
            Tip: Use your account area for bookings, group stays, and plan requests.
          </p>
        </div>
      </div>
    </div>
  );
}
