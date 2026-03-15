"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Search, X, Plane, Bus, Ship, Check } from "lucide-react";
import {
  TANZANIA_LOCATIONS,
  LOCATION_CATEGORIES,
  type TanzaniaLocation,
} from "@/lib/tanzania-locations";

const CATEGORY_ICON: Record<TanzaniaLocation["category"], React.ReactNode> = {
  airport:      <Plane  className="w-4 h-4" />,
  bus_terminal: <Bus    className="w-4 h-4" />,
  ferry_port:   <Ship   className="w-4 h-4" />,
};

const CATEGORY_COLOR: Record<TanzaniaLocation["category"], string> = {
  airport:      "bg-sky-100 text-sky-700",
  bus_terminal: "bg-emerald-100 text-emerald-700",
  ferry_port:   "bg-violet-100 text-violet-700",
};

const CATEGORY_HEADER_CLS: Record<TanzaniaLocation["category"], string> = {
  airport:      "border-sky-200 text-sky-800 bg-sky-50",
  bus_terminal: "border-emerald-200 text-emerald-800 bg-emerald-50",
  ferry_port:   "border-violet-200 text-violet-800 bg-violet-50",
};

type Props = {
  open: boolean;
  selectedId: string;
  onSelectAction: (id: string) => void;
  onCloseAction: () => void;
};

export default function LocationPickerModal({ open, selectedId, onSelectAction, onCloseAction }: Props) {
  const [query, setQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setTimeout(() => searchRef.current?.focus(), 80);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onCloseAction(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onCloseAction]);

  if (!mounted || !open) return null;

  const q = query.trim().toLowerCase();
  const filtered = q
    ? TANZANIA_LOCATIONS.filter(
        (l) =>
          l.label.toLowerCase().includes(q) ||
          l.city.toLowerCase().includes(q) ||
          (l.iataCode?.toLowerCase().includes(q) ?? false)
      )
    : TANZANIA_LOCATIONS;

  const grouped = LOCATION_CATEGORIES.map((cat) => ({
    ...cat,
    items: filtered.filter((l) => l.category === cat.key),
  })).filter((g) => g.items.length > 0);

  return createPortal(
    /* Outer overlay — inline style guarantees rendering regardless of Tailwind purge */
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onCloseAction}
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
        }}
      />

      {/* Sheet card */}
      <div
        id="lpm-sheet"
        style={{
          position: "relative",
          zIndex: 1,
          backgroundColor: "#ffffff",
          width: "100%",
          maxWidth: "32rem",
          borderRadius: "1rem 1rem 0 0",
          boxShadow: "0 -4px 32px rgba(0,0,0,0.18)",
          display: "flex",
          flexDirection: "column",
          maxHeight: "88vh",
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        {/* Fix box-sizing for all children (preflight is disabled in this project) */}
        <style>{`#lpm-sheet, #lpm-sheet * { box-sizing: border-box !important; }`}</style>
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="font-bold text-slate-800 text-base">Select Arrival Point</h2>
            <p className="text-xs text-slate-500 mt-0.5">Airport, bus terminal, or ferry port</p>
          </div>
          <button
            onClick={onCloseAction}
            className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-500"
            aria-label="Close picker"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search city, terminal, or IATA code…"
              className="w-full pl-9 pr-9 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all bg-slate-50 placeholder:text-slate-400"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="overflow-y-auto flex-1 px-4 pb-4 space-y-4">
          {grouped.length === 0 && (
            <div className="text-center py-10 text-slate-400">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No results for &ldquo;{query}&rdquo;</p>
            </div>
          )}

          {grouped.map((group) => (
            <div key={group.key}>
              {/* Category header */}
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border mb-2 ${CATEGORY_HEADER_CLS[group.key]}`}>
                <span className="text-sm">{group.icon}</span>
                <span className="text-xs font-bold uppercase tracking-wide">{group.label}</span>
                <span className="ml-auto text-xs font-medium opacity-60">{group.items.length}</span>
              </div>

              {/* Items */}
              <div className="space-y-1">
                {group.items.map((loc) => {
                  const isSelected = selectedId === loc.id;
                  return (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => { onSelectAction(loc.id); onCloseAction(); }}
                      className={[
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all",
                        isSelected
                          ? "bg-violet-600 text-white shadow-md"
                          : "hover:bg-slate-50 active:bg-slate-100 text-slate-800",
                      ].join(" ")}
                    >
                      {/* Category icon badge */}
                      <span
                        className={[
                          "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
                          isSelected ? "bg-white/20 text-white" : CATEGORY_COLOR[loc.category],
                        ].join(" ")}
                      >
                        {CATEGORY_ICON[loc.category]}
                      </span>

                      {/* Text */}
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold truncate">{loc.label}</span>
                        <span className={`block text-xs truncate ${isSelected ? "text-white/70" : "text-slate-500"}`}>
                          {loc.city}
                          {loc.iataCode && (
                            <span className={`ml-1.5 font-mono font-bold ${isSelected ? "text-white/90" : "text-slate-400"}`}>
                              {loc.iataCode}
                            </span>
                          )}
                        </span>
                      </span>

                      {/* Check */}
                      {isSelected && <Check className="w-4 h-4 flex-shrink-0 text-white" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
