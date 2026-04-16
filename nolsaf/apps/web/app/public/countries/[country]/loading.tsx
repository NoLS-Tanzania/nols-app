export default function CountryPageLoading() {
  return (
    <main className="relative min-h-screen text-slate-900 header-offset overflow-hidden">
      {/* background blobs */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-50 via-white to-slate-50" />
        <div className="absolute -top-28 -left-28 h-[28rem] w-[28rem] rounded-full bg-emerald-200/35 blur-3xl" />
        <div className="absolute top-24 -right-40 h-[34rem] w-[34rem] rounded-full bg-teal-200/30 blur-3xl" />
        <div className="absolute -bottom-48 left-1/3 h-[36rem] w-[36rem] rounded-full bg-lime-200/25 blur-3xl" />
      </div>

      <section className="public-container py-8 sm:py-10 animate-pulse">
        {/* hero card skeleton */}
        <div className="overflow-hidden rounded-[28px] bg-[#02665e]/90 shadow-[0_28px_80px_rgba(2,6,23,0.28)]">
          {/* flag bar */}
          <div className="h-[5px] w-full bg-white/10" />
          <div className="px-6 py-10 sm:px-12 sm:py-14">
            {/* pill */}
            <div className="mx-auto flex justify-center">
              <div className="h-6 w-40 rounded-full bg-white/15" />
            </div>
            {/* headline */}
            <div className="mt-6 mx-auto max-w-[420px] space-y-3">
              <div className="h-8 rounded-xl bg-white/15" />
              <div className="h-8 w-3/4 mx-auto rounded-xl bg-white/10" />
            </div>
            {/* body */}
            <div className="mt-5 mx-auto max-w-[360px] space-y-2">
              <div className="h-3.5 rounded-full bg-white/10" />
              <div className="h-3.5 w-5/6 mx-auto rounded-full bg-white/10" />
              <div className="h-3.5 w-3/4 mx-auto rounded-full bg-white/10" />
            </div>
            {/* steps */}
            <div className="mt-8 flex items-center justify-center gap-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-white/15" />
                  <div className="h-3 w-20 rounded-full bg-white/10" />
                </div>
              ))}
            </div>
            {/* CTA buttons */}
            <div className="mt-9 flex justify-center gap-3">
              <div className="h-11 w-40 rounded-full bg-white/20" />
              <div className="h-11 w-36 rounded-full bg-white/10" />
            </div>
          </div>
        </div>

        {/* filter row skeleton */}
        <div className="mt-5 rounded-2xl border border-slate-200/60 bg-white/90 px-4 py-4 sm:px-5">
          <div className="mb-3 h-3 w-28 rounded-full bg-slate-200" />
          <div className="flex flex-wrap gap-2">
            {[80, 112, 96, 128, 88].map((w, i) => (
              <div key={i} className="h-8 rounded-full bg-slate-100" style={{ width: w }} />
            ))}
          </div>
        </div>

        {/* site card grid skeleton */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[0, 1].map((col) => (
            <div
              key={col}
              className="rounded-3xl bg-white/55 backdrop-blur-xl overflow-hidden"
            >
              {/* section header */}
              <div className="px-5 sm:px-6 py-5 flex items-center justify-between">
                <div className="h-5 w-36 rounded-full bg-slate-200" />
                <div className="h-5 w-8 rounded-full bg-slate-100" />
              </div>
              {/* site card rows */}
              <ul className="list-none px-2 sm:px-3 pb-3 grid grid-cols-2 gap-2">
                {Array.from({ length: col === 0 ? 4 : 5 }).map((_, j) => (
                  <li
                    key={j}
                    className="rounded-2xl bg-gradient-to-br from-white/80 via-white/60 to-emerald-50/60 shadow-sm px-3 sm:px-5 py-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="h-4 rounded-full bg-slate-200" style={{ width: `${55 + ((j * 17) % 35)}%` }} />
                      <div className="h-5 w-8 rounded-full bg-slate-100 shrink-0" />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
