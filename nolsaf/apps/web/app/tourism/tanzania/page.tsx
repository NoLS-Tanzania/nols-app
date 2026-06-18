import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, CreditCard, Globe2, Landmark, MapPin, Route, ShieldCheck } from "lucide-react";
import { SITE_URL } from "@/lib/seo";
import { paymentTrust, servicePages, tanzaniaDestinations, tanzaniaHub } from "@/lib/seoLandingContent";

export const metadata: Metadata = {
  title: tanzaniaHub.title,
  description: tanzaniaHub.description,
  keywords: tanzaniaHub.keywords,
  alternates: { canonical: `${SITE_URL}/tourism/tanzania` },
  openGraph: {
    title: `${tanzaniaHub.title} | NoLSAF`,
    description: tanzaniaHub.description,
    url: `${SITE_URL}/tourism/tanzania`,
    images: [{ url: `${SITE_URL}${tanzaniaHub.heroImage}`, width: 1200, height: 630, alt: "Tanzania tourism with NoLSAF" }],
  },
};

const internalLinks = [
  { label: "Verified accommodation", href: "/services/verified-accommodation-tanzania" },
  { label: "Tour packages", href: "/services/tanzania-tour-packages" },
  { label: "Airport transfers", href: "/services/airport-transfer-tanzania" },
  { label: "Trip cost estimator", href: "/services/tanzania-trip-cost-estimator" },
];

const proofCards = [
  { title: "70% Tanzania focus", body: "Deep pages for Tanzania destinations, travel services and booking needs.", Icon: MapPin },
  { title: "Verified stays", body: "Hotels, lodges, apartments, villas and guest houses with trust-first listing flows.", Icon: BadgeCheck },
  { title: "Tours and transport", body: "Tour packages, airport transfers, route movement and driver-supported travel.", Icon: Route },
  { title: "Friendly payments", body: "Mobile money/MNO, bank transfers and card payment support where available.", Icon: CreditCard },
];

const regionalCards = [
  {
    title: "Tanzania depth",
    value: "Primary",
    body: "Destination and service pages are written around Tanzania search demand: safari, island travel, city stays, transport and payments.",
    Icon: MapPin,
  },
  {
    title: "East Africa context",
    value: "Regional",
    body: "The page also signals East Africa travel intent so NoLSAF can be understood beyond one country without losing Tanzania focus.",
    Icon: Globe2,
  },
  {
    title: "Booking trust",
    value: "Connected",
    body: "Accommodation, tour packages, driver transport, group stays and payment methods are connected as one tourism ecosystem.",
    Icon: ShieldCheck,
  },
];

export default function TanzaniaTourismSeoPage() {
  return (
    <main className="bg-[#f6f8f7] text-slate-950">
      <section className="bg-[#f6f8f7] px-4 pt-4">
        <div className="relative overflow-hidden rounded-[28px] bg-[#06111b] text-white shadow-xl shadow-slate-950/15">
          <img
            src="/assets/NoLSAF_SE0.png"
            alt=""
            className="pointer-events-none absolute inset-y-0 right-0 h-full w-full object-cover opacity-[0.45]"
            aria-hidden="true"
          />
        <div className="absolute inset-0 bg-gradient-to-r from-[#06111b] via-[#06111b]/92 to-[#06111b]/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#06111b]/70 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-6xl px-5 py-14 sm:py-16">
          <div className="relative max-w-4xl">
            <p className="text-sm font-bold text-emerald-300">East Africa tourism visibility, Tanzania-first depth</p>
            <h1 className="mt-4 max-w-3xl text-3xl font-black leading-[1.12] sm:text-4xl">
              Tourism search map for Tanzania stays, safaris, transport and payments.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-white/76">
              NoLSAF gives search engines clear destination, service and payment context for Tanzania while still
              connecting the wider East Africa travel story.
            </p>
            <div className="mt-8 grid max-w-3xl gap-3 sm:grid-cols-2">
              {internalLinks.map((item) => (
                <Link key={item.href} href={item.href} className="inline-flex min-h-12 items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/95 px-4 py-3 text-sm font-bold text-slate-950 no-underline shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-50">
                  {item.label}
                  <ArrowRight className="h-4 w-4 flex-none" />
                </Link>
              ))}
            </div>
            <Link href="/tourism/east-africa" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#02665e]/85 px-4 py-3 text-sm font-black text-white no-underline transition hover:-translate-y-0.5 hover:bg-[#02665e]">
              East Africa overview
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
        </div>
      </section>

      <section className="seo-reveal mx-auto grid max-w-6xl gap-4 px-5 py-8 md:grid-cols-4">
        {proofCards.map(({ title, body, Icon }) => (
          <article key={title} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-[#02665e]/30 hover:shadow-md">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#02665e]/10">
              <Icon className="h-5 w-5 text-[#02665e]" />
            </div>
            <h2 className="mt-4 text-base font-black text-slate-950">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
          </article>
        ))}
      </section>

      <section className="seo-reveal mx-auto max-w-6xl px-5 py-6">
        <div className="grid gap-4 lg:grid-cols-3">
          {regionalCards.map(({ title, value, body, Icon }) => (
            <article key={title} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-[#02665e]/35 hover:shadow-md">
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="rounded-2xl bg-[#02665e]/10 px-3 py-1 text-xs font-black text-[#02665e]">{value}</span>
              </div>
              <h2 className="mt-5 text-xl font-black text-slate-950">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="seo-reveal mx-auto max-w-6xl px-5 py-8">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-bold text-[#02665e]">Tanzania destinations</p>
            <h2 className="mt-2 text-3xl font-black">Destination guides arranged for search intent</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              Each card points search engines to a focused destination page while keeping the hub calm and easy to scan.
            </p>
          </div>
          <Link href="/public/countries/tanzania" className="inline-flex items-center gap-2 rounded-2xl border border-[#02665e]/20 bg-white px-4 py-3 text-sm font-black text-[#02665e] no-underline shadow-sm transition hover:-translate-y-0.5 hover:bg-[#02665e]/5">
            Country guide
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tanzaniaDestinations.map((item, index) => (
            <Link key={item.slug} href={`/tourism/tanzania/${item.slug}`} className="group relative overflow-hidden rounded-[24px] border border-slate-200 bg-white p-5 no-underline shadow-sm transition hover:-translate-y-1 hover:border-[#02665e]/45 hover:shadow-lg">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#02665e]/10 via-white to-emerald-50/70 opacity-80 transition group-hover:opacity-100" />
              <div className="pointer-events-none absolute -right-14 -top-14 h-32 w-32 rounded-full bg-[#02665e]/10 blur-2xl transition group-hover:bg-[#02665e]/16" />
              <div className="relative">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-sm font-black text-[#02665e] shadow-sm ring-1 ring-[#02665e]/10">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-500">Destination guide</div>
                      <h3 className="mt-1 text-xl font-black text-slate-950">{item.shortTitle}</h3>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-[#02665e] transition group-hover:translate-x-1" />
                </div>
                <p className="mt-5 line-clamp-3 text-sm leading-7 text-slate-600">{item.description}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {item.focus.slice(0, 3).map((focus) => (
                    <span key={focus} className="rounded-2xl bg-white/80 px-3 py-2 text-xs font-bold text-slate-600 shadow-sm ring-1 ring-slate-200 transition group-hover:bg-white group-hover:text-[#02665e]">
                      {focus}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
        </div>
      </section>

      <section className="seo-reveal mx-auto max-w-6xl px-5 py-8">
        <div className="rounded-[28px] border border-[#02665e]/20 bg-[#02665e] p-6 text-white shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <ShieldCheck className="h-7 w-7 text-emerald-200" />
              <h2 className="text-2xl font-black">{paymentTrust.title}</h2>
              <p className="mt-3 max-w-4xl text-sm leading-7 text-white/78">{paymentTrust.description}</p>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {paymentTrust.methods.map((method) => (
                  <div key={method} className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white/88">{method}</div>
                ))}
              </div>
              <Link href="/services/payments-tanzania-east-africa" className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#02665e] no-underline transition hover:-translate-y-0.5 hover:bg-emerald-50">
                Payment methods page
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="seo-reveal mx-auto max-w-6xl px-5 pb-16 pt-8">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-3">
          <Landmark className="h-6 w-6 text-[#02665e]" />
          <h2 className="text-3xl font-black">Connected NoLSAF service pages</h2>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {servicePages.slice(0, 6).map((item) => (
            <Link key={item.slug} href={`/services/${item.slug}`} className="rounded-[24px] border border-slate-200 bg-white p-5 no-underline shadow-sm transition hover:-translate-y-1 hover:border-[#02665e]/40 hover:bg-[#02665e]/5 hover:shadow-md">
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-base font-black text-slate-950">{item.shortTitle}</h3>
                <ArrowRight className="h-4 w-4 flex-none text-[#02665e]" />
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
            </Link>
          ))}
        </div>
        </div>
      </section>
    </main>
  );
}
