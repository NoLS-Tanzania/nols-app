import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Version | NoLSAF",
  description: "NoLSAF platform version and release information.",
};

const RELEASES = [
  {
    version: "v0.1.0",
    date: "February 2026",
    label: "Initial Release",
    highlights: [
      "Public property listings (Hotels, Guest Houses, Conference Rooms, Tour Sites)",
      "Online booking with check-in code generation",
      "Owner dashboard — manage properties, bookings, and check-ins",
      "Admin panel — full booking management, cancellations, refunds",
      "Driver portal — trip assignments and disbursement tracking",
      "Group booking support",
      "Cancellation and refund workflow with progressive owner notifications",
      "SMS & email alerts via Africa's Talking",
      "Real-time events via Socket.IO",
      "Redis-backed response caching",
    ],
  },
];

export default function VersionPage() {
  const latest = RELEASES[0];

  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 to-slate-800 text-white py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm font-semibold uppercase tracking-widest mb-3 text-[#4ecdc4]">
            Platform Release
          </p>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
            NoLSAF&nbsp;
            <span className="text-[#4ecdc4]">{latest.version}</span>
          </h1>
          <p className="text-slate-300 text-lg">
            {latest.label} &mdash; {latest.date}
          </p>
        </div>
      </section>

      {/* Release notes */}
      <section className="max-w-3xl mx-auto px-4 py-12">
        <h2 className="text-xl font-bold text-slate-800 mb-6">
          What&rsquo;s included
        </h2>
        <ul className="space-y-3">
          {latest.highlights.map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-[#02665e]" />
              <span className="text-slate-700 text-sm leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Footer nav */}
      <section className="border-t border-slate-100 py-8 px-4">
        <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-between gap-4 text-sm text-slate-500">
          <span>
            &copy; {new Date().getFullYear()} NoLSAF &mdash; All rights reserved.
          </span>
          <div className="flex gap-4">
            <Link href="/" className="text-[#02665e] font-semibold hover:underline">
              Home
            </Link>
            <Link href="/about/who" className="text-[#02665e] font-semibold hover:underline">
              About
            </Link>
            <Link href="/updates" className="text-[#02665e] font-semibold hover:underline">
              Updates
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
