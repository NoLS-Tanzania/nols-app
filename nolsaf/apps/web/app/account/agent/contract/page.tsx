export default function AgentContractPage() {
  return (
    <div className="w-full py-2 sm:py-4">
      <div className="mb-6 relative rounded-3xl border border-slate-200/70 bg-white/70 text-slate-900 backdrop-blur shadow-card overflow-hidden ring-1 ring-slate-900/5">
        <div className="absolute inset-0 bg-gradient-to-br from-brand/10 via-white/80 to-slate-50" aria-hidden />
        <div className="absolute -top-28 -right-24 h-72 w-72 rounded-full bg-brand/15 blur-3xl" aria-hidden />
        <div className="absolute -bottom-32 -left-28 h-80 w-80 rounded-full bg-slate-200/40 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/80" aria-hidden />

        <div className="relative p-5 sm:p-7">
          <div className="relative overflow-hidden rounded-[28px] border border-slate-200/70 bg-white/60 backdrop-blur px-5 py-4 sm:px-6 sm:py-5 shadow-card ring-1 ring-slate-900/5">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/70 via-transparent to-brand/10" aria-hidden />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/90" aria-hidden />

            <div className="relative">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">My Contract</h1>
              <p className="text-sm sm:text-base text-slate-600 mt-1 leading-relaxed">
                Employment/contract details will be available here.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white/70 backdrop-blur p-6 shadow-card">
        <div className="text-sm font-bold text-slate-900">Coming soon</div>
        <div className="text-sm text-slate-600 mt-1">
          For now, contact support if you need contract information.
        </div>
        <div className="mt-4">
          <a
            href="mailto:support@nolsaf.com"
            className="inline-flex items-center justify-center h-11 px-6 rounded-full bg-brand text-white font-semibold no-underline hover:bg-brand-700 shadow-card transition-colors"
          >
            Email support
          </a>
        </div>
      </div>
    </div>
  );
}
