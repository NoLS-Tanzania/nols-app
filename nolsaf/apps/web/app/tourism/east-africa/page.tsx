import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Globe2 } from "lucide-react";
import { SITE_URL } from "@/lib/seo";
import { eastAfricaPage } from "@/lib/seoLandingContent";

export const metadata: Metadata = {
  title: eastAfricaPage.title,
  description: eastAfricaPage.description,
  keywords: eastAfricaPage.keywords,
  alternates: { canonical: `${SITE_URL}/tourism/east-africa` },
  openGraph: {
    title: `${eastAfricaPage.title} | NoLSAF`,
    description: eastAfricaPage.description,
    url: `${SITE_URL}/tourism/east-africa`,
    images: [{ url: `${SITE_URL}${eastAfricaPage.heroImage}`, width: 1200, height: 630, alt: eastAfricaPage.title }],
  },
};

export default function EastAfricaTourismSeoPage() {
  return (
    <main className="bg-[#f6f8f7] text-slate-950">
      <section className="px-4 pt-4">
        <div className="relative overflow-hidden rounded-[28px] bg-slate-950 text-white shadow-xl shadow-slate-950/15">
          <div className="absolute inset-0 opacity-35" style={{ backgroundImage: `url("${eastAfricaPage.heroImage}")`, backgroundSize: "cover", backgroundPosition: "center" }} />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/82 to-[#02665e]/75" />
          <div className="relative mx-auto max-w-6xl px-5 py-16 sm:py-20">
            <p className="text-sm font-bold text-emerald-300">East Africa tourism</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight sm:text-5xl">{eastAfricaPage.title}</h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-white/75">{eastAfricaPage.description}</p>
            <Link href="/tourism/tanzania" className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950 no-underline">
              Start with Tanzania
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="seo-reveal mx-auto grid max-w-6xl gap-6 px-5 py-12 md:grid-cols-2">
        <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <Globe2 className="h-7 w-7 text-[#02665e]" />
          <h2 className="mt-4 text-2xl font-black">Tanzania-first, East Africa aware</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">{eastAfricaPage.intro}</p>
        </article>
        <article className="rounded-[28px] border border-[#02665e]/20 bg-[#02665e]/5 p-6 shadow-sm">
          <h2 className="text-2xl font-black">What NoLSAF connects</h2>
          <div className="mt-4 space-y-3">
            {eastAfricaPage.nolsafValue.map((item) => (
              <div key={item} className="flex gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-[#02665e]" />
                <p className="text-sm leading-6 text-slate-700">{item}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="seo-reveal mx-auto max-w-6xl px-5 pb-16">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-black">Useful next pages</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {(eastAfricaPage.links || []).map((link) => (
            <Link key={link.href} href={link.href} className="rounded-[24px] border border-slate-200 bg-white p-5 text-sm font-black text-slate-900 no-underline shadow-sm hover:border-[#02665e]/40">
              {link.label}
            </Link>
          ))}
        </div>
        </div>
      </section>
    </main>
  );
}
