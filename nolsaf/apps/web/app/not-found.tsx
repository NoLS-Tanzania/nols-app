import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: { absolute: "404" },
  description: "NoLSAF page not found",
};

export default function NotFoundPage() {
  return (
    <main className="min-h-[72vh] overflow-x-hidden bg-slate-50 text-slate-900">
      <section className="max-w-3xl mx-auto py-8 px-4">
        <div className="text-center p-6 sm:p-8">
          <p className="text-3xl font-extrabold tracking-tight text-[#02665e] sm:text-4xl">😢 Oops!</p>

          <p className="mt-5 text-6xl font-black leading-none tracking-tight text-[#02665e] sm:text-7xl md:text-8xl" aria-label="404">
            4<span className="mx-1 inline-block align-middle text-5xl animate-[spin_4s_linear_infinite] sm:text-6xl md:text-7xl">🌍</span>4
          </p>

          <h1 className="mt-6 text-xl sm:text-2xl font-bold leading-tight tracking-tight text-slate-600">
            Sorry, we could not find that page
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-500">
            Please check the link or head back to our{" "}
            <Link href="/" className="font-semibold text-[#02665e] underline underline-offset-2 hover:text-[#0f6a63]">
              homepage
            </Link>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
