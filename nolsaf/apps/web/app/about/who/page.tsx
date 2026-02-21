import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Who are we",
  description:
    "Who we are at NoLSAF: a verification-first, end-to-end travel platform for accommodation, transport, payments, and planning — built to deliver Quality Stay For Every Wallet.",
};

export default function AboutWhoPage() {
  return (
    <article className="max-w-none space-y-6">
      <div className="not-prose -mx-5 sm:-mx-8">
        <section className="relative min-w-0 overflow-hidden rounded-lg border border-white/10 bg-[#02665e] shadow-card p-6 ring-1 ring-white/10 sm:p-7">
          <div className="prose prose-invert w-full min-w-0 max-w-3xl break-words">
            <h2>Who are we</h2>
            <p>
              NoLSAF is an end-to-end travel platform built around one promise:{" "}
              <strong>
                <em>Quality Stay For Every Wallet</em>
              </strong>
              . We treat accommodation as more than a listing it’s a form of recovery, comfort, and stability. In that sense, a good stay
              is not just a room; it’s part of a traveler’s well-being.
            </p>
            <p>
              That is why we focus on trust, clarity, and a smooth journey from discovery to arrival combining verified accommodation,
              transport coordination, flexible payments, and planning support in one platform.
            </p>
          </div>
        </section>
      </div>

      <div className="not-prose -mx-5 grid min-w-0 gap-4 sm:-mx-8 lg:grid-cols-2">
        <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card sm:p-7">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-[#02665e]/0 via-[#02665e]/35 to-[#02665e]/0" />
            <div className="absolute inset-0 bg-gradient-to-br from-white via-slate-50 to-white" />
            <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-[#02665e]/10 blur-3xl" />
          </div>

          <div className="relative">
            <div className="text-base font-semibold tracking-tight text-slate-900">Why we exist</div>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              Booking a stay often feels fragmented: you search for accommodation, then separately figure out how to get there, how to pay,
              what the area costs, and what to do after arrival. NoLSAF exists to reduce that friction and turn travel into a single,
              connected experience.
            </p>
          </div>
        </section>

        <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50 p-6 shadow-card sm:p-7">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-[#02665e]/0 via-[#02665e]/35 to-[#02665e]/0" />
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-50" />
            <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-[#02665e]/10 blur-3xl" />
          </div>

          <div className="relative">
            <div className="text-base font-semibold tracking-tight text-slate-900">What we stand for</div>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-700">
              <li className="flex min-w-0 gap-3">
                <span
                  aria-hidden
                  className="mt-[0.35rem] h-5 w-1 flex-none rounded-full bg-gradient-to-b from-[#02665e]/60 via-[#02665e]/35 to-[#02665e]/15"
                />
                <span className="min-w-0 flex-1 break-words">
                  <strong>Trust and verification:</strong> accurate listings, clear expectations, and a consistent booking experience.
                </span>
              </li>
              <li className="flex min-w-0 gap-3">
                <span
                  aria-hidden
                  className="mt-[0.35rem] h-5 w-1 flex-none rounded-full bg-gradient-to-b from-[#02665e]/60 via-[#02665e]/35 to-[#02665e]/15"
                />
                <span className="min-w-0 flex-1 break-words">
                  <strong>Budgetary freedom:</strong> choices that fit different budgets without leaving anyone behind.
                </span>
              </li>
              <li className="flex min-w-0 gap-3">
                <span
                  aria-hidden
                  className="mt-[0.35rem] h-5 w-1 flex-none rounded-full bg-gradient-to-b from-[#02665e]/60 via-[#02665e]/35 to-[#02665e]/15"
                />
                <span className="min-w-0 flex-1 break-words">
                  <strong>Local expertise:</strong> built for the realities of local travel and local markets.
                </span>
              </li>
              <li className="flex min-w-0 gap-3">
                <span
                  aria-hidden
                  className="mt-[0.35rem] h-5 w-1 flex-none rounded-full bg-gradient-to-b from-[#02665e]/60 via-[#02665e]/35 to-[#02665e]/15"
                />
                <span className="min-w-0 flex-1 break-words">
                  <strong>Support that shows up:</strong> planning and assistance that helps travelers make confident decisions.
                </span>
              </li>
            </ul>
          </div>
        </section>
      </div>

      <div className="not-prose -mx-5 grid min-w-0 gap-4 sm:-mx-8 lg:grid-cols-2">
        <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card sm:p-7">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-[#02665e]/0 via-[#02665e]/35 to-[#02665e]/0" />
            <div className="absolute inset-0 bg-gradient-to-br from-white via-[#02665e]/5 to-white" />
            <div className="absolute -top-20 -left-20 h-60 w-60 rounded-full bg-[#02665e]/12 blur-3xl" />
          </div>
          <div className="relative">
            <div className="text-base font-semibold tracking-tight text-slate-900">Who we serve</div>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              We serve solo travelers, families, and groups looking for safe and affordable stays plus property owners, agents, and event
              partners who want a reliable system that connects travelers with real-world services.
            </p>
          </div>
        </section>

        <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50 p-6 shadow-card sm:p-7">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-[#02665e]/0 via-[#02665e]/35 to-[#02665e]/0" />
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-50" />
            <div className="absolute -bottom-20 -right-20 h-60 w-60 rounded-full bg-[#02665e]/10 blur-3xl" />
          </div>
          <div className="relative">
            <div className="text-base font-semibold tracking-tight text-slate-900">Our belief: sleep is therapy</div>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              We take rest seriously. Sleeping is not only “closing eyes” it is a form of therapy that restores energy, focus, and
              emotional stability. NoLSAF is designed to help society regain that energy by making it easier to find the right stay, in the
              right place, with less stress and fewer surprises.
            </p>
          </div>
        </section>
      </div>
    </article>
  );
}
