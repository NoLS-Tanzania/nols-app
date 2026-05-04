import { Suspense } from "react";
import EmailVerifyClient from "./EmailVerifyClient";

export default function EmailVerifyPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-50 px-4 py-12 flex items-center justify-center">
          <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.14)]">
            <p className="text-sm font-semibold text-slate-600">Loading verification...</p>
          </section>
        </main>
      }
    >
      <EmailVerifyClient />
    </Suspense>
  );
}
