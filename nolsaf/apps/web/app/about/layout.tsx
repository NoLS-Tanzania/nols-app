import type { ReactNode } from "react";
import Link from "next/link";

import LayoutFrame from "@/components/LayoutFrame";
import PublicFooter from "@/components/PublicFooter";
import PublicHeader from "@/components/PublicHeader";

const ABOUT_NAV = [
  { href: "/about/who", label: "Who are we" },
  { href: "/about/what", label: "What we do" },
  { href: "/about/why", label: "Why us" },
  { href: "/about/story", label: "Our Best Story" },
] as const;

export default function AboutLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PublicHeader />

      <main className="min-h-screen bg-white text-slate-900">
        <LayoutFrame heightVariant="sm" topVariant="sm" colorVariant="muted" variant="solid" />

        <section className="bg-slate-800 text-white">
          <div className="public-container py-10 sm:py-12">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">About NoLSAF</h1>
            <p className="mt-2 max-w-2xl text-sm sm:text-base text-white/80">
              Quality stays for every wallet — built on trust, verification, and local expertise.
            </p>
          </div>
        </section>

        <section className="bg-[#f7f9fb] py-6 sm:py-8">
          <div className="public-container">
            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
              <aside className="lg:sticky lg:top-24 h-fit rounded-lg border border-slate-200 bg-slate-800 text-white p-5">
                <h2 className="text-sm font-semibold tracking-wide text-white/90">About NoLSAF</h2>
                <nav className="mt-4">
                  <ul className="m-0 list-none p-0 space-y-2">
                    {ABOUT_NAV.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className="block rounded-md px-3 py-2 text-sm text-white/90 hover:bg-white/10"
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              </aside>

              <div className="w-full rounded-lg border border-slate-200 bg-white p-5 sm:p-8">
                {children}
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter withRail={false} />
    </>
  );
}
