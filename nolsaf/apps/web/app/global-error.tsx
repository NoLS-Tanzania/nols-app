"use client";

import { AlertTriangle, Mail, RefreshCw } from "lucide-react";

function toSafeErrorMessage(error: unknown): string {
  if (!error) return "Unknown error";
  if (typeof error === "string") return error;

  if (typeof error === "object") {
    const asRecord = error as Record<string, unknown>;
    const msg = asRecord.message;
    if (typeof msg === "string" && msg.trim()) return msg;

    try {
      return JSON.stringify(error);
    } catch {
      return "An unexpected error occurred";
    }
  }

  return String(error);
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const safeMessage = toSafeErrorMessage(error);
  const isDev = process.env.NODE_ENV === "development";

  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900">
        <main className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
          <section className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="grid gap-0 sm:grid-cols-[156px_1fr]">
              <div className="flex items-center justify-center border-b border-slate-100 bg-[#f3faf8] px-6 py-8 sm:border-b-0 sm:border-r">
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-[#02665e]/15">
                  <div className="absolute inset-2 rounded-full bg-[#02665e]/10" />
                  <AlertTriangle className="relative h-9 w-9 text-[#02665e]" aria-hidden="true" />
                </div>
              </div>

              <div className="px-6 py-7 sm:px-8">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#02665e]">
                  Temporary issue
                </p>
                <h1 className="text-2xl font-bold leading-tight tracking-tight text-slate-900">
                  Something went wrong
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
                  Sorry, we hit a temporary server problem. Please retry in a few moments.
                </p>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={() => reset()}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#02665e] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#02514b] focus:outline-none focus:ring-2 focus:ring-[#02665e] focus:ring-offset-2"
                  >
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    Retry
                  </button>

                  <a
                    href="mailto:support@nolsaf.com"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:border-[#02665e]/30 hover:bg-[#f3faf8] hover:text-[#02665e] focus:outline-none focus:ring-2 focus:ring-[#02665e] focus:ring-offset-2"
                  >
                    <Mail className="h-4 w-4" aria-hidden="true" />
                    Contact support
                  </a>
                </div>

                {isDev ? (
                  <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">
                    {safeMessage}
                  </div>
                ) : null}

                <p className="mt-5 text-xs leading-5 text-slate-500">
                  If the problem continues, email{" "}
                  <a
                    href="mailto:support@nolsaf.com"
                    className="font-semibold text-[#02665e] underline underline-offset-2"
                  >
                    support@nolsaf.com
                  </a>
                  .
                </p>
              </div>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
