import type { Metadata } from "next";
import Link from "next/link";
import { Globe, ChevronRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Explore by Country",
  description:
    "Browse NoLSAF destinations by country. Discover verified accommodation, transport, and travel planning across East Africa.",
  alternates: { canonical: "https://nolsaf.com/public/countries" },
};

const COUNTRIES = [
  {
    slug: "tanzania",
    name: "Tanzania",
    subtitle: "Safaris, parks, mountains, and islands",
    flag: "🇹🇿",
  },
];

export default function CountriesPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          Explore by Country
        </h1>
        <p className="mt-2 text-slate-500 text-sm leading-relaxed">
          Discover verified stays, parks, and transport options across East Africa.
        </p>
      </div>

      <div className="grid gap-4">
        {COUNTRIES.map((c) => (
          <Link
            key={c.slug}
            href={`/public/countries/${c.slug}`}
            className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm hover:border-[#02665e]/40 hover:bg-[#02665e]/5 transition-colors"
          >
            <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-xl bg-slate-100 text-2xl group-hover:bg-[#02665e]/10 transition-colors">
              {c.flag}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-base font-bold text-slate-900">{c.name}</div>
              <div className="text-sm text-slate-500 mt-0.5">{c.subtitle}</div>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-[#02665e] transition-colors flex-shrink-0" />
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Globe className="h-3.5 w-3.5" />
        More countries coming soon
      </div>
    </div>
  );
}
