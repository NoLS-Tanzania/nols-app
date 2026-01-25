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

  const targetHref = useMemo(() => {
    const next = safeNextPath(searchParams.get("next"));
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
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-14 bg-gradient-to-b from-white to-slate-50">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-8">
          <div className="flex items-start gap-4">
            <div className="h-11 w-11 rounded-xl bg-slate-900 text-white flex items-center justify-center font-semibold tracking-wide">
              N
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold text-slate-900">Hello</h1>
              <p className="mt-1 text-sm text-slate-600">
                Redirecting you to secure sign-in.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <p className="text-sm text-slate-700 leading-6">
              We use a single, modern sign-in experience for everyone. You can continue with phone OTP or
              email and password, then we’ll take you back to where you were.
            </p>
            <div className="flex items-center gap-3">
              <div className="h-2.5 w-2.5 rounded-full bg-slate-900 animate-pulse" />
              <span className="text-xs text-slate-500">If this takes more than a moment, use the button below.</span>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link
              href={targetHref}
              className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800 transition"
            >
              Continue to Sign In
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              Go Home
            </Link>
          </div>
        </div>

        <div className="px-8 py-4 bg-slate-50 border-t border-slate-200">
          <p className="text-xs text-slate-500">
            Tip: Bookmark your role portal (Owner, Driver, Admin) for the fastest access.
          </p>
        </div>
      </div>
    </div>
  );
}
