import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Why us",
  description:
    "Why choose NoLSAF: end-to-end travel (accommodation + transport + payments + planning) with verification and a budget-friendly approach.",
};

export default function AboutWhyPage() {
  return (
    <article className="max-w-none min-w-0 space-y-6">
      <header className="max-w-3xl min-w-0">
        <div className="prose prose-slate hyphens-none">
          <h2>Why us</h2>
          <p>
            NoLSAF is designed to make travel feel connected and predictable. We reduce uncertainty through verification, simplify choices
            through smart organization, and support the journey beyond the booking.
          </p>
        </div>
      </header>

      <div className="not-prose -mx-5 sm:-mx-8">
        <div className="grid min-w-0 gap-4 lg:grid-cols-2">
          <section className="relative min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-5">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-[#02665e]/0 via-[#02665e]/35 to-[#02665e]/0" />
            <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-[#02665e]/6 blur-3xl" />
          </div>
          <div className="relative">
            <div className="text-base font-semibold tracking-tight text-slate-900">End-to-end, not fragmented</div>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              We don’t treat accommodation as an isolated transaction. The complete experience includes getting to the destination and
              knowing what to expect. NoLSAF brings these pieces together so users can engage in one platform.
            </p>
          </div>
          </section>

          <section className="relative min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-5">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-[#02665e]/0 via-[#02665e]/35 to-[#02665e]/0" />
            <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-[#02665e]/6 blur-3xl" />
          </div>
          <div className="relative">
            <div className="text-base font-semibold tracking-tight text-slate-900">Payment flexibility for different regions</div>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              We built NoLSAF to support both local and international payment methods. Users choose what matches their location and
              preference, which increases accessibility and reduces booking friction.
            </p>
          </div>
          </section>

          <section className="relative min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-5">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-[#02665e]/0 via-[#02665e]/35 to-[#02665e]/0" />
            <div className="absolute -top-16 -left-16 h-48 w-48 rounded-full bg-[#02665e]/6 blur-3xl" />
          </div>
          <div className="relative">
            <div className="text-base font-semibold tracking-tight text-slate-900">Faster discovery, less time filtering</div>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              We structure the experience so travelers don’t spend hours filtering. We focus on making it easy to navigate from towns to
              tourist sites and quickly find what fits.
            </p>
          </div>
          </section>

          <section className="relative min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-5">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-[#02665e]/0 via-[#02665e]/35 to-[#02665e]/0" />
            <div className="absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-[#02665e]/6 blur-3xl" />
          </div>

          <div className="relative">
            <div className="text-base font-semibold tracking-tight text-slate-900">Budget-friendly mechanisms that expand access</div>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-700">
              <li className="flex min-w-0 gap-3">
                <span aria-hidden className="mt-[0.55rem] h-[2px] w-4 flex-none rounded bg-[#02665e]/60" />
                <span className="min-w-0 flex-1 break-words">
                  <strong>Group Stay offers:</strong> guests can submit offers and owners can claim offers that fit.
                </span>
              </li>
              <li className="flex min-w-0 gap-3">
                <span aria-hidden className="mt-[0.55rem] h-[2px] w-4 flex-none rounded bg-[#02665e]/60" />
                <span className="min-w-0 flex-1 break-words">
                  <strong>Plan with Us:</strong> guidance and coordination for destinations where travelers need more information.
                </span>
              </li>
              <li className="flex min-w-0 gap-3">
                <span aria-hidden className="mt-[0.55rem] h-[2px] w-4 flex-none rounded bg-[#02665e]/60" />
                <span className="min-w-0 flex-1 break-words">
                  <strong>Agent and event collaboration:</strong> systems that support both clients and partners.
                </span>
              </li>
            </ul>
          </div>
          </section>
        </div>
      </div>

      <div className="not-prose -mx-5 sm:-mx-8">
        <section className="relative min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-5">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-[#02665e]/0 via-[#02665e]/45 to-[#02665e]/0" />
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-50" />
            <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-[#02665e]/10 blur-3xl" />
          </div>
          <div className="relative">
            <div className="text-base font-semibold tracking-tight text-slate-900">Rest and well-being as a real outcome</div>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-700">
              We believe sleep is therapy. By reducing stress in planning and booking, we help travelers arrive ready to rest and recover
              and we help hosts deliver the kind of experience that keeps guests coming back.
            </p>
          </div>
        </section>
      </div>
    </article>
  );
}
