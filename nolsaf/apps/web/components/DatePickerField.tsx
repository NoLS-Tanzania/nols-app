"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { Popover, Transition } from "@headlessui/react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  label: string;
  value: string;
  onChange: (nextIso: string) => void;
  min?: string;
  max?: string;
  widthClassName?: string;
};

function isoToDate(iso?: string) {
  if (!iso) return undefined;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function dateToIso(d?: Date) {
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDisplay(iso?: string) {
  if (!iso) return "";
  const parts = String(iso).split("-");
  if (parts.length !== 3) return String(iso);
  const [y, m, d] = parts;
  if (!y || !m || !d) return String(iso);
  return `${d} / ${m} / ${y}`;
}

export default function DatePickerField({
  label,
  value,
  onChange,
  min,
  max,
  widthClassName = "sm:w-[220px]",
}: Props) {
  const selected = useMemo(() => isoToDate(value), [value]);
  const minDate = useMemo(() => isoToDate(min), [min]);
  const maxDate = useMemo(() => isoToDate(max), [max]);

  const [month, setMonth] = useState<Date>(() => selected ?? new Date());
  const [months, setMonths] = useState(1);

  useEffect(() => {
    setMonth(selected ?? new Date());
  }, [value]);

  useEffect(() => {
    const update = () => setMonths(window.innerWidth >= 768 ? 2 : 1);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const isDisabled = (d: Date) => {
    if (minDate && d < minDate) return true;
    if (maxDate && d > maxDate) return true;
    return false;
  };

  const pretty = formatDisplay(value);

  return (
    <Popover className="relative">
      {({ close }) => (
        <>
          <Popover.Button
            type="button"
            className={
              "h-12 w-full " +
              widthClassName +
              " rounded-xl border border-gray-200 bg-white text-sm text-gray-900 shadow-sm px-4 pl-11 text-left focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand hover:bg-brand/5 transition"
            }
            aria-label={label}
            title={label}
          >
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" aria-hidden />
            <span className={pretty ? "font-semibold tracking-wide" : "text-gray-400"}>
              {pretty || "dd / mm / yyyy"}
            </span>
          </Popover.Button>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-150"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-120"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            <Popover.Panel
              className="absolute z-30 mt-2 rounded-xl border border-gray-200 bg-white shadow-xl p-3 w-[min(720px,calc(100vw-2rem))] nolsaf-date-popper"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs text-gray-500">{label}</div>
                  <div className="text-sm font-semibold text-gray-900 truncate">{pretty || "Select a date"}</div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700"
                    aria-label="Previous month"
                  >
                    <ChevronLeft className="h-5 w-5" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700"
                    aria-label="Next month"
                  >
                    <ChevronRight className="h-5 w-5" aria-hidden />
                  </button>
                </div>
              </div>

              <div className="mt-2">
                <DayPicker
                  mode="single"
                  selected={selected}
                  onSelect={(d) => {
                    if (!d) return;
                    if (isDisabled(d)) return;
                    onChange(dateToIso(d));
                    close();
                  }}
                  month={month}
                  onMonthChange={(m) => setMonth(m)}
                  numberOfMonths={months}
                  disabled={isDisabled}
                />
              </div>
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  );
}
