"use client";
import React from "react";

type Props = { children: React.ReactNode };

export default class ClientErrorBoundary extends React.Component<Props, { error: Error | null }> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: any) {
    console.error('ClientErrorBoundary caught', error, info);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("nols:client-error", {
        detail: {
          message: error.message,
          source: "react-error-boundary",
          stack: error.stack,
          componentStack: typeof info?.componentStack === "string" ? info.componentStack : undefined,
        },
      }));
    }
  }

  handleReload = () => {
    // Force a full reload to attempt fetching fresh chunks
    if (typeof window !== 'undefined') window.location.reload();
  };

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-[60vh] w-full items-center justify-center p-6">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-[0_8px_30px_-12px_rgba(0,0,0,0.15)]">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50">
              <svg className="h-7 w-7 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-slate-900">Something didn&apos;t load</h2>
            <p className="mt-2 text-sm text-slate-500">A component failed to load. During development this usually means code changed and chunks are being rebuilt — reloading the page fixes it.</p>
            <button
              onClick={this.handleReload}
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-[#02665e] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[#02665e]/30"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
              </svg>
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children as React.ReactElement;
  }
}
