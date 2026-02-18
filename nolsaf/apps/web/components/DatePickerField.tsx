"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Popover, Transition } from "@headlessui/react";
import DatePicker from "@/components/ui/DatePicker";
import { Calendar } from "lucide-react";

type Props = {
  label: string;
  value: string;
  onChangeAction: (nextIso: string) => void;
  min?: string;
  max?: string;
  widthClassName?: string;
  size?: "sm" | "md";
  allowPast?: boolean;
  twoMonths?: boolean;
};

function formatDisplay(iso?: string) {
  if (!iso) return "";
  const parts = String(iso).split("-");
  if (parts.length !== 3) return String(iso);
  const [y, m, d] = parts;
  if (!y || !m || !d) return String(iso);

  const monthIndex = Number(m);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const monthLabel =
    Number.isFinite(monthIndex) && monthIndex >= 1 && monthIndex <= 12 ? months[monthIndex - 1] : m;
  const day2 = String(d).padStart(2, "0");
  return `${day2} ${monthLabel} ${y}`;
}

function PopoverPositioner({ open, computePos }: { open: boolean; computePos: () => void }) {
  useEffect(() => {
    if (!open) return;
    if (typeof window === "undefined") return;

    computePos();
    window.addEventListener("resize", computePos);
    window.addEventListener("scroll", computePos, true);
    return () => {
      window.removeEventListener("resize", computePos);
      window.removeEventListener("scroll", computePos, true);
    };
  }, [open, computePos]);

  return null;
}

export default function DatePickerField({
  label,
  value,
  onChangeAction,
  min,
  max,
  widthClassName = "sm:w-[220px]",
  size = "md",
  allowPast,
  twoMonths: twoMonthsProp,
}: Props) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const [twoMonths, setTwoMonths] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof twoMonthsProp === "boolean") {
      setTwoMonths(twoMonthsProp);
      return;
    }
    const update = () => setTwoMonths(window.innerWidth >= 768);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [twoMonthsProp]);

  const computePos = useCallback(() => {
    const el = buttonRef.current;
    if (!el) return;
    if (typeof window === "undefined") return;

    const rect = el.getBoundingClientRect();
    const width = Math.min(720, Math.max(320, window.innerWidth - 32));
    const rawLeft = rect.left;
    const left = Math.max(16, Math.min(rawLeft, window.innerWidth - 16 - width));
    const top = rect.bottom + 8;
    setPanelPos({ top, left, width });
  }, []);

  const pretty = formatDisplay(value);
  const isSm = size === "sm";

  return (
    <Popover className="relative">
      {({ open, close }) => {
        return (
          <>
            <PopoverPositioner open={open} computePos={computePos} />

            <Popover.Button
              ref={buttonRef}
              type="button"
              className={
                (isSm ? "h-10" : "h-12") +
                " w-full " +
                widthClassName +
                " relative rounded-xl border border-gray-200 bg-white text-sm text-gray-900 shadow-sm " +
                (isSm ? "px-3 pl-10" : "px-4 pl-11") +
                " text-left focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand hover:bg-brand/5 transition"
              }
              aria-label={label}
              title={label}
              onClick={() => {
                if (typeof window !== "undefined") {
                  setTimeout(() => {
                    try {
                      computePos();
                    } catch {
                      // ignore
                    }
                  }, 0);
                }
              }}
            >
              <Calendar
                className={
                  "absolute left-" +
                  (isSm ? "3" : "4") +
                  " top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500"
                }
                aria-hidden
              />
              <span className={pretty ? "font-semibold" : "text-gray-400"}>{pretty || "DD Mon YYYY"}</span>
            </Popover.Button>

            {mounted
              ? createPortal(
                  <Transition
                    as={Fragment}
                    show={open}
                    enter="transition ease-out duration-150"
                    enterFrom="opacity-0 translate-y-1"
                    enterTo="opacity-100 translate-y-0"
                    leave="transition ease-in duration-120"
                    leaveFrom="opacity-100 translate-y-0"
                    leaveTo="opacity-0 translate-y-1"
                  >
                    <Popover.Panel
                      static
                      className="fixed z-[10000] rounded-xl border border-gray-200 bg-white shadow-2xl p-3 nolsaf-date-popper"
                      style={
                        panelPos
                          ? { top: panelPos.top, left: panelPos.left, width: panelPos.width }
                          : { top: 0, left: 0, width: Math.min(720, Math.max(320, window.innerWidth - 32)) }
                      }
                    >
                      <DatePicker
                        selected={value || undefined}
                        allowRange={false}
                        allowPast={allowPast ?? true}
                        minDate={min}
                        maxDate={max}
                        twoMonths={twoMonths}
                        initialViewDate={value || min || max}
                        onSelectAction={(s) => {
                          const iso = Array.isArray(s) ? s[0] : s;
                          if (!iso) return;
                          onChangeAction(String(iso));
                          close();
                        }}
                        onCloseAction={() => close()}
                      />
                    </Popover.Panel>
                  </Transition>,
                  document.body
                )
              : null}
          </>
        );
      }}
    </Popover>
  );
}
