import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2, CreditCard, ShieldCheck } from "lucide-react";
import { SITE_URL } from "@/lib/seo";
import { paymentTrust, servicePages } from "@/lib/seoLandingContent";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return servicePages.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const page = servicePages.find((item) => item.slug === slug);
  if (!page) return {};

  return {
    title: page.title,
    description: page.description,
    keywords: page.keywords,
    alternates: { canonical: `${SITE_URL}/services/${page.slug}` },
    openGraph: {
      title: `${page.title} | NoLSAF`,
      description: page.description,
      url: `${SITE_URL}/services/${page.slug}`,
      images: [{ url: `${SITE_URL}${page.heroImage}`, width: 1200, height: 630, alt: page.title }],
    },
  };
}

export default async function ServiceSeoPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const page = servicePages.find((item) => item.slug === slug);
  if (!page) notFound();

  return (
    <main className="bg-[#f6f8f7] text-slate-950">
      <section className="px-4 pt-4">
        <div className="relative overflow-hidden rounded-[28px] bg-slate-950 text-white shadow-xl shadow-slate-950/15">
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: `url("${page.heroImage}")`, backgroundSize: "cover", backgroundPosition: "center" }} />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/86 to-[#02665e]/72" />
          <div className="relative mx-auto max-w-6xl px-5 py-16 sm:py-20">
            <p className="text-sm font-bold text-emerald-300">NoLSAF service page</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight sm:text-5xl">{page.title}</h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-white/75">{page.description}</p>
          </div>
        </div>
      </section>

      <section className="seo-reveal mx-auto grid max-w-6xl gap-8 px-5 py-12 lg:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-lg leading-9 text-slate-700">{page.intro}</p>
          <h2 className="mt-10 text-2xl font-black">What this service covers</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {page.focus.map((item) => (
              <div key={item} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-700">{item}</div>
            ))}
          </div>

          <h2 className="mt-10 text-2xl font-black">Why use NoLSAF</h2>
          <div className="mt-5 space-y-3">
            {page.nolsafValue.map((item) => (
              <div key={item} className="flex gap-3">
                <CheckCircle2 className="mt-1 h-5 w-5 flex-none text-[#02665e]" />
                <p className="text-sm leading-7 text-slate-700">{item}</p>
              </div>
            ))}
          </div>
        </article>

        <aside className="space-y-4">
          <div className="rounded-[24px] border border-[#02665e]/20 bg-[#02665e]/5 p-5 shadow-sm">
            <ShieldCheck className="h-7 w-7 text-[#02665e]" />
            <h2 className="mt-4 text-xl font-black">Connected travel flow</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              NoLSAF links accommodation, tour packages, transport, group stays, cost estimation and payment records so the traveler journey is easier to verify.
            </p>
          </div>
          <div
            className="relative overflow-hidden rounded-[24px] border border-[#02665e]/20 bg-[#06111b] p-5 text-white shadow-sm"
            style={{
              backgroundImage:
                "linear-gradient(135deg, rgba(2,102,94,0.88), rgba(6,17,27,0.96)), radial-gradient(rgba(255,255,255,0.22) 1px, transparent 1px)",
              backgroundSize: "auto, 18px 18px",
            }}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/12 ring-1 ring-white/18">
              <CreditCard className="h-7 w-7 text-emerald-200" />
            </div>
            <h2 className="mt-4 text-xl font-black">Payment methods</h2>
            <p className="mt-2 text-sm leading-7 text-white/76">{paymentTrust.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {["MNO", "Bank", "Cards", "Diaspora"].map((method) => (
                <span key={method} className="rounded-2xl border border-white/15 bg-white/12 px-3 py-1.5 text-xs font-black text-white">
                  {method}
                </span>
              ))}
            </div>
            <Link href="/services/payments-tanzania-east-africa" className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#02665e] no-underline transition hover:-translate-y-0.5 hover:bg-emerald-50">
              Read payment page
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </aside>
      </section>

      <section className="seo-reveal mx-auto max-w-6xl px-5 pb-16">
        <div
          className="rounded-[28px] border border-[#02665e]/20 bg-[#02665e] p-6 text-white shadow-sm"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.26) 1px, transparent 1px)",
            backgroundSize: "18px 18px",
          }}
        >
          <h2 className="text-2xl font-black">Questions people search</h2>
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
