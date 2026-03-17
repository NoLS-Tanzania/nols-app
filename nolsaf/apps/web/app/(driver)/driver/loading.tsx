export default function DriverLoading() {
  return (
    <div className="h-screen overflow-hidden flex flex-col bg-slate-50">
      {/* Header skeleton */}
      <div className="h-14 w-full border-b border-slate-200 bg-white px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-slate-200 animate-pulse" />
          <div className="h-5 w-28 rounded-full bg-slate-200 animate-pulse" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-slate-200 animate-pulse" />
          <div className="h-8 w-20 rounded-full bg-slate-200 animate-pulse" />
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar skeleton */}
        <div className="hidden md:flex flex-col w-56 shrink-0 border-r border-slate-200 bg-white px-3 py-4 gap-2">
          {/* Driver avatar / profile stub */}
          <div className="flex items-center gap-3 px-2 pb-3 border-b border-slate-100 mb-2">
            <div className="h-10 w-10 rounded-full bg-slate-200 animate-pulse shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="h-4 w-24 rounded-full bg-slate-200 animate-pulse" />
              <div className="h-3 w-16 rounded-full bg-slate-100 animate-pulse" />
            </div>
          </div>
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-9 w-full rounded-xl bg-slate-100 animate-pulse" style={{ opacity: 1 - i * 0.09 }} />
          ))}
        </div>

        {/* Main content skeleton */}
        <div className="flex-1 overflow-auto p-6 space-y-5">
          {/* Page title */}
          <div className="h-7 w-36 rounded-full bg-slate-200 animate-pulse" />

          {/* Today's summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-white border border-slate-200 animate-pulse" />
            ))}
          </div>

          {/* Active trip / map card */}
          <div className="h-44 rounded-2xl bg-white border border-slate-200 animate-pulse" />

          {/* Trip list */}
          <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3">
            <div className="h-5 w-28 rounded-full bg-slate-200 animate-pulse" />
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-14 w-full rounded-xl bg-slate-100 animate-pulse" style={{ opacity: 1 - i * 0.15 }} />
            ))}
          </div>
        </div>
      </div>

      {/* Mobile bottom nav skeleton */}
      <div className="md:hidden h-16 border-t border-slate-200 bg-white flex items-center justify-around px-4 shrink-0">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className="h-6 w-6 rounded-lg bg-slate-200 animate-pulse" />
            <div className="h-2.5 w-10 rounded-full bg-slate-100 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
