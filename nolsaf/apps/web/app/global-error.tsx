"use client";

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
        <div className="max-w-3xl mx-auto py-8 px-4">
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <div className="p-6">
              <h1 className="mb-2 text-center text-xl sm:text-2xl font-bold leading-tight tracking-tight text-slate-600">
                Something went wrong
              </h1>
              <p className="text-sm leading-relaxed text-slate-500 mb-1">
                Sorry, we hit a temporary server problem.
              </p>
              <p className="text-sm leading-relaxed text-slate-500 mb-1">Please try again in a few moments.</p>
              <p className="text-sm leading-relaxed text-slate-500">
                If it keeps happening, contact
                <a
                  href="mailto:support@nolsaf.com"
                  className="ml-1 font-semibold text-[#02665e] underline underline-offset-2"
                >
                  support@nolsaf.com
                </a>
                .
              </p>

              {isDev ? (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {safeMessage}
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => reset()}
                className="mt-4 inline-flex items-center rounded-xl bg-[#02665e] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#02514b]"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
