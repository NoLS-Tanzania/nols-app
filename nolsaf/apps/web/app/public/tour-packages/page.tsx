import type { Metadata } from "next";
import TourPackagesFilterPanel from "./TourPackagesFilterPanel";
import { SITE_URL, seoKeywords } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Tanzania & East Africa Tour Packages",
  description:
    "Browse Tanzania and East Africa tour packages from approved operators, including safari, cultural, beach, hiking, family and local tourism experiences.",
  keywords: [
    "Tanzania safari packages",
    "East Africa tour packages",
    "Africa tour operators",
    "Zanzibar beach holidays",
    "Serengeti safari",
    "Ngorongoro crater tours",
    "Kilimanjaro travel",
    ...seoKeywords,
  ],
  alternates: { canonical: `${SITE_URL}/public/tour-packages` },
  openGraph: {
    title: "Tanzania & East Africa Tour Packages | NoLSAF",
    description: "Compare verified safari, cultural, beach and local tourism packages from approved operators.",
    url: `${SITE_URL}/public/tour-packages`,
  },
};

const serviceSteps = [
  {
    title: "Discover",
    description: "Browse approved operators and curated tour packages.",
  },
  {
    title: "Compare",
    description: "See price, inclusions, exclusions, and itinerary value side-by-side.",
  },
  {
    title: "Verify",
    description: "Confirm operator badges, service confidence, and transparent totals.",
  },
  {
    title: "Book",
    description: "Choose best-fit package and move directly into booking actions.",
  },
];

export default function PublicTourPackagesPage() {
  return (
    <main className="min-h-screen bg-white">
      <section className="public-container py-10 sm:py-12">
        <div className="rounded-3xl border border-[#02665e]/15 bg-white p-5 shadow-[0_16px_45px_rgba(2,102,94,0.10)] sm:p-8">
          <div
            className="overflow-hidden rounded-3xl px-5 py-8 text-center shadow-[0_22px_50px_rgba(2,102,94,0.22)] sm:px-8 sm:py-10"
            style={{
              backgroundColor: "#02665e",
              backgroundImage:
                "radial-gradient(circle at 18% 18%, rgba(255,255,255,0.16) 0 1px, transparent 1.2px), radial-gradient(circle at 78% 30%, rgba(255,255,255,0.10), transparent 28%), linear-gradient(135deg, #027a70 0%, #02665e 46%, #014840 100%)",
              backgroundSize: "28px 28px, auto, auto",
            }}
          >
            <p className="mx-auto inline-flex rounded-full border border-white/24 bg-white/14 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white shadow-sm">
              Public Listing
            </p>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-white drop-shadow-sm sm:text-5xl">Tour Packages</h1>
            <p className="mx-auto mt-4 max-w-3xl rounded-2xl border border-white/14 bg-white/10 px-4 py-3 text-sm font-medium leading-6 text-white/90 shadow-sm backdrop-blur-sm sm:text-base">
              Explore tour packages from approved operators and compare options in one place.
            </p>
          </div>

          <div className="mx-auto mt-7 w-full max-w-5xl overflow-hidden rounded-3xl border border-[#02665e]/15 bg-white p-4 shadow-[0_10px_28px_rgba(2,102,94,0.06)] sm:p-5">
            <div className="grid gap-3 md:grid-cols-4 md:gap-3">
              {serviceSteps.map((item, idx) => (
                <article
                  key={item.title}
                  className="group relative overflow-visible rounded-2xl border border-[#02665e]/15 bg-white px-4 py-4 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#02665e]/35 hover:shadow-[0_10px_26px_rgba(2,102,94,0.12)]"
                >
                  {idx < serviceSteps.length - 1 && (
                    <>
                      <div className="pointer-events-none absolute -bottom-4 left-1/2 z-20 h-8 w-[2px] -translate-x-1/2 bg-[#02665e]/25 md:hidden" />
                      <div className="pointer-events-none absolute right-[-20px] top-1/2 z-20 hidden h-[2px] w-10 -translate-y-1/2 md:block">
                        <div className="absolute inset-0 rounded-full bg-[#02665e]/25" />
                        <span className="absolute -right-1 top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 border-r-2 border-t-2 border-[#02665e]/45" />
                      </div>
                    </>
                  )}

                  <div className="relative mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#02665e] text-[11px] font-bold text-white shadow-sm transition-transform duration-300 group-hover:scale-105">
                    {idx + 1}
                  </div>

                  <p className="relative mt-1 text-sm font-semibold text-[#02665e]">{item.title}</p>
                  <p className="relative mt-1 text-xs leading-5 text-slate-700">{item.description}</p>
                </article>
              ))}
            </div>

          </div>

          <TourPackagesFilterPanel />
        </div>
      </section>
    </main>
  );
}
