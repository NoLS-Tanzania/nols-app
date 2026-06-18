import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarDays, CheckCircle2, Landmark, MapPin, Route, WalletCards } from "lucide-react";
import { SITE_URL } from "@/lib/seo";
import { paymentTrust, tanzaniaDestinations } from "@/lib/seoLandingContent";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return tanzaniaDestinations.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const page = tanzaniaDestinations.find((item) => item.slug === slug);
  if (!page) return {};

  return {
    title: page.title,
    description: page.description,
    keywords: page.keywords,
    alternates: { canonical: `${SITE_URL}/tourism/tanzania/${page.slug}` },
    openGraph: {
      title: `${page.title} | NoLSAF`,
      description: page.description,
      url: `${SITE_URL}/tourism/tanzania/${page.slug}`,
      images: [{ url: `${SITE_URL}${page.heroImage}`, width: 1200, height: 630, alt: page.title }],
    },
  };
}

export default async function TanzaniaDestinationSeoPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const page = tanzaniaDestinations.find((item) => item.slug === slug);
  if (!page) notFound();

  return (
    <main className="bg-[#f6f8f7] font-sans text-slate-950">
      <section className="px-4 pt-4">
        <div className="rounded-[28px] bg-[#06111b] text-white shadow-xl shadow-slate-950/15">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:py-16">
          <Link href="/tourism/tanzania" className="inline-flex items-center gap-2 text-sm font-bold text-emerald-200 no-underline">
            <ArrowRight className="h-4 w-4 rotate-180" />
            Tanzania tourism
          </Link>

          <div className="mt-10 max-w-4xl">
            <div className="inline-flex items-center gap-2 border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-xs font-bold text-emerald-200">
              <Landmark className="h-4 w-4" />
              Tanzania destination guide
            </div>
            <h1 className="mt-5 text-4xl font-black leading-[1.08] sm:text-5xl">{page.title}</h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-white/78">{page.description}</p>
          </div>

          <div className="mt-9 grid gap-3 sm:grid-cols-3">
            {[
              { label: "Destination", value: page.shortTitle },
              { label: "Travel flow", value: "Stay, tour and transport" },
              { label: "Payments", value: "MNO, bank and cards" },
            ].map((item) => (
              <div key={item.label} className="border border-white/12 bg-white/[0.06] p-4">
                <div className="text-xs font-semibold text-white/55">{item.label}</div>
                <div className="mt-2 text-sm font-black text-white">{item.value}</div>
              </div>
            ))}
          </div>
        </div>
        </div>
      </section>

      <section className="seo-reveal mx-auto grid max-w-6xl gap-6 px-5 py-10 lg:grid-cols-[1.35fr_0.65fr]">
        <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Route className="h-6 w-6 text-[#02665e]" />
            <h2 className="text-xl font-black">Destination overview</h2>
          </div>
          <p className="mt-5 text-lg leading-9 text-slate-700">{page.intro}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/public/properties" className="inline-flex items-center gap-2 rounded-2xl bg-[#02665e] px-4 py-3 text-sm font-black text-white no-underline">
              Verified stays
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/public/tour-packages" className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-900 no-underline">
              Tour packages
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </article>

        <aside
          className="rounded-[28px] border border-[#02665e]/20 bg-[#06111b] p-5 text-white shadow-sm"
          style={{
            backgroundImage:
              "linear-gradient(135deg, rgba(2,102,94,0.9), rgba(6,17,27,0.96)), radial-gradient(rgba(255,255,255,0.22) 1px, transparent 1px)",
            backgroundSize: "auto, 18px 18px",
          }}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/12 ring-1 ring-white/18">
            <WalletCards className="h-6 w-6 text-emerald-200" />
          </div>
          <h2 className="mt-4 text-xl font-black">{paymentTrust.title}</h2>
          <p className="mt-2 text-sm leading-7 text-white/76">{paymentTrust.description}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {["MNO", "Bank", "Cards", "Travel record"].map((method) => (
              <span key={method} className="rounded-2xl border border-white/15 bg-white/12 px-3 py-1.5 text-xs font-black text-white">
                {method}
              </span>
            ))}
          </div>
          <Link href="/services/payments-tanzania-east-africa" className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#02665e] no-underline transition hover:-translate-y-0.5 hover:bg-emerald-50">
            Payment methods
            <ArrowRight className="h-4 w-4" />
          </Link>
        </aside>
      </section>

      <section className="seo-reveal mx-auto max-w-6xl px-5 pb-10">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <MapPin className="h-6 w-6 text-[#02665e]" />
            <h2 className="text-xl font-black">What travelers usually need</h2>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {page.focus.map((item) => (
              <div key={item} className="flex gap-3 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <MapPin className="mt-0.5 h-5 w-5 flex-none text-[#02665e]" />
                <span className="text-sm font-semibold leading-6 text-slate-700">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="seo-reveal mx-auto max-w-6xl px-5 pb-10">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black">How NoLSAF helps</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {page.nolsafValue.map((item) => (
              <div key={item} className="flex gap-3">
                <CheckCircle2 className="mt-1 h-5 w-5 flex-none text-[#02665e]" />
                <p className="text-sm leading-7 text-slate-700">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="seo-reveal mx-auto grid max-w-6xl gap-6 px-5 pb-16 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <CalendarDays className="h-6 w-6 text-[#02665e]" />
          <h2 className="mt-4 text-xl font-black">Related NoLSAF pages</h2>
          <div className="mt-4 grid gap-2">
            <Link href="/public/properties" className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 no-underline">Verified accommodation</Link>
            <Link href="/public/tour-packages" className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 no-underline">Tour packages</Link>
            <Link href="/public/nolscope" className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 no-underline">Trip cost estimator</Link>
          </div>
        </div>

        <div
          className="rounded-[28px] border border-[#02665e]/20 bg-[#02665e] p-6 text-white shadow-sm"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.26) 1px, transparent 1px)",
            backgroundSize: "18px 18px",
          }}
        >
          <h2 className="text-2xl font-black">Questions travelers ask</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {page.faqs.map((faq) => (
              <article key={faq.question} className="rounded-[24px] border border-white/18 bg-white/95 p-5 text-slate-950 shadow-sm">
                <h3 className="font-black">{faq.question}</h3>
                <p className="mt-2 text-sm italic leading-7 text-slate-600">{faq.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
