export default function AdminLoading() {
  return (
    <div className="h-screen overflow-hidden flex flex-col bg-slate-50">
      {/* Header skeleton */}
      <div className="h-14 w-full border-b border-slate-200 bg-white px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-slate-200 animate-pulse" />
          <div className="h-5 w-32 rounded-full bg-slate-200 animate-pulse" />
          <div className="h-5 w-20 rounded-full bg-slate-100 animate-pulse" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-8 w-36 rounded-full bg-slate-200 animate-pulse" />
          <div className="h-8 w-8 rounded-full bg-slate-200 animate-pulse" />
          <div className="h-8 w-8 rounded-full bg-slate-200 animate-pulse" />
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar skeleton — admin has a wider nav */}
        <div className="hidden md:flex flex-col w-60 shrink-0 border-r border-slate-200 bg-white px-3 py-4 gap-2">
          {/* Section label */}
          <div className="h-3 w-20 rounded-full bg-slate-100 animate-pulse mb-1" />
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-9 w-full rounded-xl bg-slate-100 animate-pulse" style={{ opacity: 1 - i * 0.08 }} />
          ))}
          {/* Second section */}
          <div className="h-3 w-24 rounded-full bg-slate-100 animate-pulse mt-4 mb-1" />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-9 w-full rounded-xl bg-slate-100 animate-pulse" style={{ opacity: 0.7 - i * 0.1 }} />
          ))}
        </div>

        {/* Main content skeleton */}
        <div className="flex-1 overflow-auto p-6 space-y-5">
          {/* Page title + action button */}
          <div className="flex items-center justify-between">
            <div className="h-7 w-40 rounded-full bg-slate-200 animate-pulse" />
            <div className="h-9 w-28 rounded-xl bg-slate-200 animate-pulse" />
          </div>

          {/* KPI stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-white border border-slate-200 animate-pulse" />
            ))}
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 h-56 rounded-2xl bg-white border border-slate-200 animate-pulse" />
            <div className="h-56 rounded-2xl bg-white border border-slate-200 animate-pulse" />
          </div>

          {/* Data table */}
          <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-5 w-36 rounded-full bg-slate-200 animate-pulse" />
              <div className="h-8 w-24 rounded-xl bg-slate-100 animate-pulse" />
            </div>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-11 w-full rounded-xl bg-slate-100 animate-pulse" style={{ opacity: 1 - i * 0.1 }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
