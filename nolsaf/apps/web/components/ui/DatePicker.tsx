"use client";

import { useEffect, useRef, useState } from "react";
import axios from "axios";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

export default function DatePicker({
  selected,
  onSelect,
  onClose,
  allowRange = true,
}: {
  selected?: string | string[];
  onSelect: (s: string | string[]) => void;
  onClose?: () => void;
  allowRange?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const btnRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [focusedIdx, setFocusedIdx] = useState<number | null>(null);
  const [view, setView] = useState(() => {
    if (selected) {
      const d = new Date(selected + "T00:00:00");
      return { year: d.getFullYear(), month: d.getMonth() };
    }
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current) return;
      if (e.target && (e.target as Node) && !rootRef.current.contains(e.target as Node)) {
        onClose?.();
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [onClose]);

  function daysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
  }

  function firstDayOfMonth(year: number, month: number) {
    return new Date(year, month, 1).getDay();
  }

  const days = [] as Array<{ y: number; m: number; d: number; currentMonth: boolean }>;
  const first = firstDayOfMonth(view.year, view.month);
  const prevMonthDays = first; // number of blanks before day 1
  // previous month fill
  const prevMonth = view.month === 0 ? 11 : view.month - 1;
  const prevYear = view.month === 0 ? view.year - 1 : view.year;
  const prevDaysCount = daysInMonth(prevYear, prevMonth);
  for (let i = prevDaysCount - prevMonthDays + 1; i <= prevDaysCount; i++) {
    days.push({ y: prevYear, m: prevMonth, d: i, currentMonth: false });
  }
  // current month
  const dim = daysInMonth(view.year, view.month);
  for (let i = 1; i <= dim; i++) days.push({ y: view.year, m: view.month, d: i, currentMonth: true });
  // next month fill to complete weeks
  while (days.length % 7 !== 0) {
    const n = days.length - (prevMonthDays + dim) + 1;
    const nextMonth = (view.month + 1) % 12;
    const nextYear = view.month === 11 ? view.year + 1 : view.year;
    days.push({ y: nextYear, m: nextMonth, d: n, currentMonth: false });
  }

  const selectedArray = (() => {
    if (!selected) return [] as string[];
    if (Array.isArray(selected)) return selected as string[];
    return [selected as string];
  })();

  const isSelected = (y: number, m: number, d: number) => {
    if (!selectedArray || selectedArray.length === 0) return false;
    const iso = `${y}-${pad(m + 1)}-${pad(d)}`;
    if (selectedArray.length === 1) return selectedArray[0] === iso;
    const [a, b] = selectedArray.slice(0, 2).sort();
    return iso >= a && iso <= b;
  };

  // remember last clicked date to enable Shift+click range selection
  const [lastClicked, setLastClicked] = useState<string | null>(() => {
    if (Array.isArray(selected) && selected.length > 0) return selected[0];
    if (typeof selected === "string" && selected) return selected;
    return null;
  });

  // handle keyboard navigation and escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!rootRef.current) return;
      if (e.key === "Escape") {
        onClose?.();
        return;
      }
      // arrow navigation
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
        e.preventDefault();
        // ensure days array is available
        const total = days.length;
        if (total === 0) return;
        let idx = focusedIdx;
        if (idx === null) {
          // default focus to today's index if present
          idx = days.findIndex((c) => c.currentMonth && c.y === todayY && c.m === todayM && c.d === todayD);
          if (idx === -1) idx = 0;
        }
        if (e.key === "ArrowLeft") idx = Math.max(0, idx - 1);
        if (e.key === "ArrowRight") idx = Math.min(total - 1, idx + 1);
        if (e.key === "ArrowUp") idx = Math.max(0, idx - 7);
        if (e.key === "ArrowDown") idx = Math.min(total - 1, idx + 7);
        setFocusedIdx(idx);
        const btn = btnRefs.current[idx];
        btn?.focus();
      }
      if (e.key === "Enter") {
        // simulate click on focused button
        if (focusedIdx !== null) {
          const btn = btnRefs.current[focusedIdx];
          btn?.click();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedIdx, days, lastClicked]);

  const today = new Date();
  const todayY = today.getFullYear();
  const todayM = today.getMonth();
  const todayD = today.getDate();
  const [perDayCounts, setPerDayCounts] = useState<Record<string, { total: number; statuses: Record<string, number> }>>({});

  // fetch aggregated counts for the visible month
  useEffect(() => {
    const start = new Date(view.year, view.month, 1);
    const end = new Date(view.year, view.month + 1, 0);
    const isoStart = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
    const isoEnd = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
    (async () => {
      try {
        const base = process.env.NEXT_PUBLIC_API_URL || "";
        const r = await axios.get<Record<string, { total: number; statuses: Record<string, number> }>>(
          `${base}/admin/bookings/counts`,
          { params: { start: isoStart, end: isoEnd } }
        );
        if (r?.data) setPerDayCounts(r.data);
      } catch (e) {
        // ignore failures — calendar will still work without counts
      }
    })();
  }, [view.year, view.month]);

  return (
    <div ref={rootRef} className="bg-white border border-gray-200 rounded-xl shadow-2xl p-4 w-72 sm:w-80 backdrop-blur-sm">
      {/* Header with month/year navigation */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
        <button
          type="button"
          onClick={() => setView((v) => ({ year: v.month === 0 ? v.year - 1 : v.year, month: (v.month + 11) % 12 }))}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900"
          aria-label="Previous month"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="text-base font-semibold text-gray-900">
          {MONTHS[view.month]} {view.year}
        </div>
        <button
          type="button"
          onClick={() => setView((v) => ({ year: v.month === 11 ? v.year + 1 : v.year, month: (v.month + 1) % 12 }))}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900"
          aria-label="Next month"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-center text-xs font-semibold text-gray-500 py-2">
            {w}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((cell, idx) => {
          const isoKey = `${cell.y}-${pad(cell.m + 1)}-${pad(cell.d)}`;
          const sel = isSelected(cell.y, cell.m, cell.d);
          const cellDateY = cell.y;
          const cellDateM = cell.m;
          const cellDateD = cell.d;
          const isToday = cellDateY === todayY && cellDateM === todayM && cellDateD === todayD;
          // naive past check (only compare yyyy-mm-dd)
          let isPast = false;
          if (cellDateY < todayY) isPast = true;
          else if (cellDateY === todayY && cellDateM < todayM) isPast = true;
          else if (cellDateY === todayY && cellDateM === todayM && cellDateD < todayD) isPast = true;

          const hasCount = perDayCounts[isoKey] && perDayCounts[isoKey].total > 0;

          return (
            <button
              key={idx}
              ref={(el) => { btnRefs.current[idx] = el; }}
              type="button"
              onClick={(e) => {
                const iso = `${cell.y}-${pad(cell.m + 1)}-${pad(cell.d)}`;
                // Shift+click range selection (requires a previous click)
                if (allowRange && e.shiftKey && lastClicked) {
                  const start = lastClicked;
                  const end = iso;
                  const [a, b] = [start, end].sort();
                  const selectedDays: string[] = [];
                  const sDate = new Date(a + "T00:00:00");
                  const eDate = new Date(b + "T00:00:00");
                  for (let dt = new Date(sDate); dt <= eDate; dt.setDate(dt.getDate() + 1)) {
                    const y = dt.getFullYear();
                    const m = dt.getMonth();
                    const d = dt.getDate();
                    selectedDays.push(`${y}-${pad(m + 1)}-${pad(d)}`);
                  }
                  setLastClicked(null);
                  onSelect(selectedDays);
                  onClose?.();
                  return;
                }

                // Normal single selection: remember as lastClicked to allow Shift+click range
                setLastClicked(iso);
                onSelect(iso);
                // keep picker open to allow shift+click ranges; do not auto-close
              }}
              onFocus={() => setFocusedIdx(idx)}
              className={`
                relative aspect-square flex items-center justify-center rounded-lg text-sm font-medium
                transition-all duration-150 outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1
                ${!cell.currentMonth ? "text-gray-300" : ""}
                ${sel
                  ? "bg-emerald-600 text-white shadow-md scale-105"
                  : isToday
                  ? "bg-emerald-50 text-emerald-700 border-2 border-emerald-500 font-semibold"
                  : isPast
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-gray-700 hover:bg-gray-100 active:scale-95"}
                ${hasCount && !sel ? "font-semibold" : ""}
              `}
              title={(() => {
                const key = `${cell.y}-${pad(cell.m + 1)}-${pad(cell.d)}`;
                const c = perDayCounts[key];
                if (!c) return undefined;
                return Object.entries(c.statuses).map(([k, v]) => `${k}: ${v}`).join(", ");
              })()}
              disabled={isPast && !sel}
            >
              <span className="relative z-10">{cell.d}</span>
              {hasCount && !sel && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-500"></span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
