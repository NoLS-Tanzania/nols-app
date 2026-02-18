"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Fragment, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { AlertTriangle, ClipboardList, FileText, Printer, RefreshCw, Sliders, Users } from "lucide-react";
import { Popover, Transition } from "@headlessui/react";

import Chart from "@/components/Chart";
import DatePickerField from "@/components/DatePickerField";
import { escapeAttr, escapeHtml } from "@/utils/html";

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function startOfTodayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function addDaysUtc(dateUtc: Date, days: number): Date {
  return new Date(dateUtc.getTime() + days * 864e5);
}

async function safeJson(response: Response) {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text.substring(0, 160)}`);
  }
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const text = await response.text();
    throw new Error(`Expected JSON but got ${contentType}: ${text.substring(0, 160)}`);
  }
  return response.json();
}

function fmtDateTime(isoOrDate: string | Date) {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(d.getTime())) return String(isoOrDate);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDateOnly(iso: string | Date | null | undefined) {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

type TotalsState = {
  single: {
    total: number | null;
    byStatus: Record<string, number | null>;
  };
  groupStays: {
    total: number | null;
    byStatus: Record<string, number | null>;
  };
  planWithUs: {
    total: number | null;
    byStatus: Record<string, number | null>;
  };
};

function pctOf(total: number, count: number) {
  if (!total) return 0;
  const v = Math.round((count / total) * 100);
  return Math.max(0, Math.min(100, v));
}

function PercentBarRow({
  label,
  pct,
  colorClassName,
}: {
  label: string;
  pct: number;
  colorClassName: string;
}) {
  const clip = "polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%)";

  return (
    <div className="flex items-center gap-3">
      <div className="w-[130px] text-[11px] font-semibold text-gray-700 truncate" title={label}>
        {label}
      </div>

      <div className="flex-1">
        <div className="h-10 bg-gray-100 rounded-sm overflow-hidden">
          {pct > 0 ? (
            <div
              className={"h-full flex items-center justify-end " + colorClassName}
              style={{ width: `${pct}%`, minWidth: "76px" }}
            >
              <div
                className="h-full flex items-center px-3 text-white font-extrabold tracking-tight border-l-2 border-white/80"
                style={{ clipPath: clip }}
              >
                {pct}%
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center px-2">
              <div
                className="h-8 px-3 bg-white border border-gray-200 text-gray-700 text-sm font-extrabold flex items-center"
                style={{ clipPath: clip }}
              >
                0%
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function fmtInt(n: number | null) {
  if (n === null) return "—";
  const v = Math.round(n);
  return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function fmtAmount(v: unknown) {
  const n = numOrNull(v);
  if (n === null) return "—";
  return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function normalizeCount(v: number | null | undefined) {
  return Number.isFinite(Number(v)) ? Number(v) : 0;
}

function RangePill({
  label,
  hint,
  accentClassName,
  active,
  onClick,
}: {
  label: string;
  hint: string;
  accentClassName: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={hint}
      aria-label={hint}
      className={
        "group relative h-12 px-4 rounded-xl border bg-white text-sm font-semibold shadow-sm transition hover:bg-brand/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 " +
        (active ? "border-brand/30 text-brand ring-1 ring-brand/15 bg-brand/5" : "border-gray-200 text-slate-700")
      }
    >
      <span className="inline-flex items-center gap-2">
        <span className={"h-2 w-2 rounded-sm " + accentClassName} aria-hidden />
        <span>{label}</span>
      </span>

      <span
        role="tooltip"
        className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-gray-200 bg-white px-2 py-1 text-[11px] font-semibold text-gray-700 shadow-lg opacity-0 scale-95 transition-all duration-150 ease-out group-hover:opacity-100 group-hover:scale-100 group-focus-visible:opacity-100 group-focus-visible:scale-100"
      >
        {hint}
      </span>
    </button>
  );
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

type MoreRangeKey = "3m" | "6m" | "ytd" | "12m";

function MoreRangesPopover({
  mounted,
  moreRanges,
  onSelectRange,
}: {
  mounted: boolean;
  moreRanges: Array<{ key: MoreRangeKey; label: string; hint: string; accent: string }>;
  onSelectRange: (k: MoreRangeKey) => void;
}) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const computePos = useCallback(() => {
    const el = buttonRef.current;
    if (!el) return;
    if (typeof window === "undefined") return;
    const rect = el.getBoundingClientRect();
    const width = 256;
    const rawLeft = rect.right - width;
    const left = Math.max(12, Math.min(rawLeft, window.innerWidth - 12 - width));
    const top = rect.bottom + 8;
    setPos({ top, left, width });
  }, []);

  return (
    <Popover className="relative shrink-0">
      {({ open, close }) => (
        <>
          <PopoverPositioner open={open} computePos={computePos} />

          <Popover.Button
            ref={buttonRef}
            type="button"
            className={
              "h-12 w-12 inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white text-slate-700 shadow-sm transition hover:bg-brand/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 " +
              (open ? "ring-1 ring-gray-200" : "")
            }
            title="More ranges"
            aria-label="More ranges"
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
            <Sliders className="h-4 w-4" aria-hidden />
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
                    className="fixed z-[10000] w-64 rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden"
                    style={pos ? { top: pos.top, left: pos.left, width: pos.width } : undefined}
                  >
                    <div className="p-1">
                      <div className="px-3 py-2 text-[11px] font-semibold text-gray-500">More ranges</div>
                      {moreRanges.map((p) => (
                        <button
                          key={p.key}
                          type="button"
                          onClick={() => {
                            onSelectRange(p.key);
                            close();
                          }}
                          className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
                          title={p.hint}
                        >
                          <span className={"h-2.5 w-2.5 rounded-sm " + p.accent} aria-hidden />
                          <div className="min-w-0 text-left">
                            <div className="font-semibold leading-5">{p.label}</div>
                            <div className="text-[11px] text-gray-500 leading-4 truncate">{p.hint}</div>
                          </div>
                        </button>
                      ))}
                    </div>

                    <div className="px-3 py-2 border-t border-gray-100 text-[11px] text-gray-500">
                      Max range: <span className="font-semibold">12 months</span>
                    </div>
                  </Popover.Panel>
                </Transition>,
                document.body
              )
            : null}
        </>
      )}
    </Popover>
  );
}

async function fetchAllPages<T>(baseUrl: URL, maxItems = 20000): Promise<{ items: T[]; total: number }>
{
  const items: T[] = [];
  let page = 1;
  let total = 0;

  while (true) {
    const url = new URL(baseUrl.toString());
    url.searchParams.set("page", String(page));
    url.searchParams.set("pageSize", "100");

    const r = await fetch(url.toString(), { credentials: "include" });
    const j = (await safeJson(r)) as any;

    const pageItems = (Array.isArray(j?.items) ? j.items : []) as T[];
    total = Number(j?.total ?? total ?? 0);
    if (pageItems.length === 0) break;

    items.push(...pageItems);
    if (Number.isFinite(total) && total > 0 && items.length >= total) break;
    if (items.length >= maxItems) break;

    page += 1;
  }

  return { items, total: Number.isFinite(total) ? total : items.length };
}

function countByStatus(items: Array<{ status?: string | null }>) {
  const out: Record<string, number> = {};
  for (const it of items) {
    const s = String(it?.status ?? "").trim();
    if (!s) continue;
    out[s] = (out[s] ?? 0) + 1;
  }
  return out;
}

type OwnerBookingItem = {
  id: number;
  status: string;
  checkIn: string;
  checkOut: string;
  guestName: string | null;
  guestPhone?: string | null;
  sex?: string | null;
  nationality?: string | null;
  totalAmount: unknown;
  property?: { title?: string | null } | null;
  user?: { name?: string | null; phone?: string | null } | null;
  invoice?: { status?: string | null; total?: unknown; paidAt?: string | null } | null;
  payment?: { amount?: unknown; paidAt?: string | null } | null;
  review?: { rating?: number | null; createdAt?: string } | null;
};

type GroupStayItem = {
  id: number;
  status: string;
  checkIn: string | null;
  checkOut: string | null;
  acceptedTotalAmount?: unknown | null;
  confirmedTotalAmount?: unknown | null;
  totalAmount: unknown | null;
  currency?: string | null;
  user?: { name?: string | null; phone?: string | null } | null;
  leadPassenger?: { name?: string | null; phone?: string | null; gender?: string | null; nationality?: string | null } | null;
  confirmedProperty?: { title?: string | null } | null;
  acceptedProperty?: { title?: string | null } | null;
  acceptedAt?: string | null;
  confirmedAt?: string | null;
  createdAt?: string | null;
};

type PlanRequestItem = {
  id: number;
  status: string;
  role?: string | null;
  tripType?: string | null;
  destinations?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  groupSize?: number | null;
  budget?: string | null;
  transportRequired?: boolean | null;
  assignedAgent?: string | null;
  assignedAgentId?: number | null;
  customer?: { name?: string | null; phone?: string | null; email?: string | null } | null;
  respondedAt?: string | null;
  createdAt?: string | null;
};

export default function BookingReportsClient() {
  const today = new Date();
  const [from, setFrom] = useState(() => formatDate(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [to, setTo] = useState(() => formatDate(today));

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totals, setTotals] = useState<TotalsState>({
    single: { total: null, byStatus: {} },
    groupStays: { total: null, byStatus: {} },
    planWithUs: { total: null, byStatus: {} },
  });

  const [ownerItems, setOwnerItems] = useState<OwnerBookingItem[]>([]);
  const [groupItems, setGroupItems] = useState<GroupStayItem[]>([]);
  const [planItems, setPlanItems] = useState<PlanRequestItem[]>([]);

  const [ownerChartCanvas, setOwnerChartCanvas] = useState<HTMLCanvasElement | null>(null);
  const [planChartCanvas, setPlanChartCanvas] = useState<HTMLCanvasElement | null>(null);

  const applyQuickRange = useCallback((daysBackInclusive: number) => {
    const end = startOfTodayUtc();
    const start = addDaysUtc(end, -daysBackInclusive);
    setFrom(formatDate(start));
    setTo(formatDate(end));
  }, []);

  const getMoreRange = useCallback((k: MoreRangeKey) => {
    const end = startOfTodayUtc();
    if (k === "ytd") {
      const now = new Date();
      const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
      return { from: formatDate(start), to: formatDate(end) };
    }
    if (k === "3m") return { from: formatDate(addDaysUtc(end, -89)), to: formatDate(end) };
    if (k === "6m") return { from: formatDate(addDaysUtc(end, -179)), to: formatDate(end) };
    return { from: formatDate(addDaysUtc(end, -364)), to: formatDate(end) };
  }, []);

  const getQuickRange = useCallback((daysBackInclusive: number) => {
    const end = startOfTodayUtc();
    const start = addDaysUtc(end, -daysBackInclusive);
    return { from: formatDate(start), to: formatDate(end) };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const start = from;
      const end = to;

      const ownerBase = new URL("/api/admin/bookings", window.location.origin);
      ownerBase.searchParams.set("start", start);
      ownerBase.searchParams.set("end", end);

      const groupBase = new URL("/api/admin/group-stays/bookings", window.location.origin);
      groupBase.searchParams.set("start", start);
      groupBase.searchParams.set("end", end);

      const planBase = new URL("/api/admin/plan-with-us/requests", window.location.origin);
      planBase.searchParams.set("start", start);
      planBase.searchParams.set("end", end);

      const [ownerRes, groupRes, planRes] = await Promise.all([
        fetchAllPages<OwnerBookingItem>(ownerBase),
        fetchAllPages<GroupStayItem>(groupBase),
        fetchAllPages<PlanRequestItem>(planBase),
      ]);

      setOwnerItems(ownerRes.items);
      setGroupItems(groupRes.items);
      setPlanItems(planRes.items);

      const ownerCounts = countByStatus(ownerRes.items);
      const groupCounts = countByStatus(groupRes.items);
      const planCounts = countByStatus(planRes.items);

      const ownerByStatus: Record<string, number | null> = {};
      for (const [k, v] of Object.entries(ownerCounts)) ownerByStatus[k] = numOrNull(v);

      const groupByStatus: Record<string, number | null> = {};
      for (const [k, v] of Object.entries(groupCounts)) groupByStatus[k] = numOrNull(v);

      const planByStatus: Record<string, number | null> = {};
      for (const [k, v] of Object.entries(planCounts)) planByStatus[k] = numOrNull(v);

      setTotals({
        single: { total: numOrNull(ownerRes.total ?? ownerRes.items.length), byStatus: ownerByStatus },
        groupStays: { total: numOrNull(groupRes.total ?? groupRes.items.length), byStatus: groupByStatus },
        planWithUs: { total: numOrNull(planRes.total ?? planRes.items.length), byStatus: planByStatus },
      });
    } catch (e: any) {
      setError(e?.message ?? "Failed to load booking report totals");
      setTotals({
        single: { total: null, byStatus: {} },
        groupStays: { total: null, byStatus: {} },
        planWithUs: { total: null, byStatus: {} },
      });
      setOwnerItems([]);
      setGroupItems([]);
      setPlanItems([]);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const kpiSingle = totals.single.total;
  const kpiGroup = totals.groupStays.total;
  const kpiPlan = totals.planWithUs.total;

  const singleCheckedIn = (totals.single.byStatus["CHECKED_IN"] ?? 0) + (totals.single.byStatus["PENDING_CHECKIN"] ?? 0);

  const ownerStatusOrder = useMemo(
    () => [
      { key: "NEW", label: "New" },
      { key: "CONFIRMED", label: "Validated" },
      { key: "PENDING_CHECKIN", label: "Pending check-in" },
      { key: "CHECKED_IN", label: "Checked in" },
      { key: "CHECKED_OUT", label: "Checked out" },
      { key: "CANCELED", label: "Canceled" },
    ],
    []
  );

  const planStatusOrder = useMemo(
    () => [
      { key: "NEW", label: "New" },
      { key: "IN_PROGRESS", label: "In progress" },
      { key: "COMPLETED", label: "Completed" },
    ],
    []
  );

  const rgbaRamp = useMemo(
    () =>
      (rgb: string, count: number, aMin = 0.22, aMax = 0.9) => {
        const safeCount = Math.max(1, count);
        const step = safeCount === 1 ? 0 : (aMax - aMin) / (safeCount - 1);
        return Array.from({ length: safeCount }, (_, i) => {
          const a = aMax - step * i;
          return `rgba(${rgb}, ${Math.max(0, Math.min(1, a)).toFixed(3)})`;
        });
      },
    []
  );

  const ownerStatusChartData = useMemo(
    () => ({
      labels: ownerStatusOrder.map((s) => s.label),
      datasets: [
        {
          label: "Owner bookings",
          data: ownerStatusOrder.map((s) => normalizeCount(totals.single.byStatus[s.key])),
          backgroundColor: rgbaRamp("2, 102, 94", ownerStatusOrder.length, 0.18, 0.85),
          borderColor: "rgba(255, 255, 255, 0.95)",
          borderWidth: 2,
        },
      ],
    }),
    [ownerStatusOrder, rgbaRamp, totals.single.byStatus]
  );

  const groupStayBars = useMemo(() => {
    const total = normalizeCount(kpiGroup);
    const by = totals.groupStays.byStatus;

    const spec = [
      { key: "PENDING", label: "Pending", color: "bg-violet-500" },
      { key: "PROCESSING", label: "Processing", color: "bg-pink-500" },
      { key: "CONFIRMED", label: "Confirmed", color: "bg-sky-500" },
      { key: "COMPLETED", label: "Completed", color: "bg-blue-600" },
      { key: "CANCELED", label: "Canceled", color: "bg-teal-500" },
    ] as const;

    return spec.map((s) => {
      const count = normalizeCount(by[s.key] ?? 0);
      return {
        key: s.key,
        label: s.label,
        color: s.color,
        count,
        pct: pctOf(total, count),
      };
    });
  }, [kpiGroup, totals.groupStays.byStatus]);

  const planStatusChartData = useMemo(
    () => ({
      labels: planStatusOrder.map((s) => s.label),
      datasets: [
        {
          label: "Plan With Us",
          data: planStatusOrder.map((s) => normalizeCount(totals.planWithUs.byStatus[s.key])),
          backgroundColor: rgbaRamp("245, 158, 11", planStatusOrder.length, 0.22, 0.9),
          borderColor: "rgba(255, 255, 255, 0.95)",
          borderWidth: 2,
        },
      ],
    }),
    [planStatusOrder, rgbaRamp, totals.planWithUs.byStatus]
  );

  async function printReport() {
    const reportId = new Date().toISOString();

    const ownerStatusImg = ownerChartCanvas ? ownerChartCanvas.toDataURL("image/png") : null;
    const planStatusImg = planChartCanvas ? planChartCanvas.toDataURL("image/png") : null;

    let qrDataUrl: string | null = null;
    try {
      const QR: any = await import("qrcode");
      const toDataURL: any = QR?.toDataURL ?? QR?.default?.toDataURL;
      if (typeof toDataURL !== "function") throw new Error("qrcode.toDataURL not available");

      const verifyUrl = new URL("/admin/management/reports/bookings", window.location.origin);
      verifyUrl.searchParams.set("from", from);
      verifyUrl.searchParams.set("to", to);
      verifyUrl.searchParams.set("reportId", reportId);
      qrDataUrl = await toDataURL(verifyUrl.toString(), {
        margin: 1,
        width: 180,
        errorCorrectionLevel: "M",
      });
    } catch {
      qrDataUrl = null;
    }

    const fmt = (n: number | null) => fmtInt(n);

    const ownerDetailHead =
      "<thead><tr>" +
      [
        "Name",
        "Gender",
        "Nationality",
        "Amount",
        "Paid at",
        "Property Name",
        "Check-in & out",
        "Rating",
      ]
        .map((h) => `<th>${escapeHtml(h)}</th>`)
        .join("") +
      "</tr></thead>";

    const groupDetailHead =
      "<thead><tr>" +
      [
        "Name",
        "Phone",
        "Gender",
        "Nationality",
        "Status",
        "Accepted Amount",
        "Confirmed Amount",
        "Currency",
        "Accepted Property",
        "Confirmed Property",
        "Check-in & out",
        "Created",
        "Accepted",
        "Confirmed",
      ]
        .map((h) => `<th>${escapeHtml(h)}</th>`)
        .join("") +
      "</tr></thead>";

    const planDetailHead =
      "<thead><tr>" +
      [
        "Name",
        "Phone",
        "Role",
        "Trip Type",
        "Destinations",
        "Travel dates",
        "Group size",
        "Budget",
        "Transport",
        "Status",
        "Created",
        "Responded",
        "Assigned agent",
      ]
        .map((h) => `<th>${escapeHtml(h)}</th>`)
        .join("") +
      "</tr></thead>";

    const ownerDetailRows = ownerItems
      .map((b) => {
        const name = b.guestName || b.user?.name || "—";
        const gender = b.sex || "—";
        const nationality = b.nationality || "—";
        const amountCandidate = b.payment?.amount ?? b.invoice?.total ?? null;
        const paidAtCandidate = b.payment?.paidAt ?? b.invoice?.paidAt ?? null;
        const paidAmount = numOrNull(amountCandidate) === null ? "—" : fmtAmount(amountCandidate);
        const paidAt = paidAtCandidate ? fmtDateTime(paidAtCandidate) : "—";
        const property = b.property?.title || "—";
        const stay = `${fmtDateOnly(b.checkIn)} → ${fmtDateOnly(b.checkOut)}`;
        const rating = b.review?.rating ?? null;
        const ratingTxt = rating === null || rating === undefined ? "—" : String(rating);
        const cells = [name, gender, nationality, paidAmount, paidAt, property, stay, ratingTxt]
          .map((v) => `<td>${escapeHtml(String(v ?? "—"))}</td>`)
          .join("");
        return `<tr>${cells}</tr>`;
      })
      .join("\n");

    const groupDetailRows = groupItems
      .map((b) => {
        const name = b.leadPassenger?.name || b.user?.name || "—";
        const phone = b.leadPassenger?.phone || b.user?.phone || "—";
        const gender = b.leadPassenger?.gender || "—";
        const nationality = b.leadPassenger?.nationality || "—";
        const status = b.status || "—";
        const acceptedAmount = fmtAmount(b.acceptedTotalAmount ?? null);
        const confirmedAmount = fmtAmount(b.confirmedTotalAmount ?? null);
        const currency = b.currency || "—";
        const acceptedProperty = b.acceptedProperty?.title || "—";
        const confirmedProperty = b.confirmedProperty?.title || "—";
        const stay = `${fmtDateOnly(b.checkIn)} → ${fmtDateOnly(b.checkOut)}`;
        const created = b.createdAt ? fmtDateTime(b.createdAt) : "—";
        const accepted = b.acceptedAt ? fmtDateTime(b.acceptedAt) : "—";
        const confirmed = b.confirmedAt ? fmtDateTime(b.confirmedAt) : "—";
        const cells = [
          name,
          phone,
          gender,
          nationality,
          status,
          acceptedAmount,
          confirmedAmount,
          currency,
          acceptedProperty,
          confirmedProperty,
          stay,
          created,
          accepted,
          confirmed,
        ]
          .map((v) => `<td>${escapeHtml(String(v ?? "—"))}</td>`)
          .join("");
        return `<tr>${cells}</tr>`;
      })
      .join("\n");

    const planDetailRows = planItems
      .map((b) => {
        const name = b.customer?.name || "—";
        const phone = b.customer?.phone || "—";
        const role = b.role || "—";
        const tripType = b.tripType || "—";
        const destinations = b.destinations || "—";
        const travelDates = `${fmtDateOnly(b.dateFrom)} → ${fmtDateOnly(b.dateTo)}`;
        const groupSize = b.groupSize === null || b.groupSize === undefined ? "—" : String(b.groupSize);
        const budget = b.budget ? fmtAmount(b.budget) : "—";
        const transport = b.transportRequired ? "Yes" : "No";
        const status = b.status || "—";
        const created = b.createdAt ? fmtDateTime(b.createdAt) : "—";
        const responded = b.respondedAt ? fmtDateTime(b.respondedAt) : "—";
        const assigned = b.assignedAgent || (b.assignedAgentId ? `#${b.assignedAgentId}` : "—");
        const cells = [
          name,
          phone,
          role,
          tripType,
          destinations,
          travelDates,
          groupSize,
          budget,
          transport,
          status,
          created,
          responded,
          assigned,
        ]
          .map((v) => `<td>${escapeHtml(String(v ?? "—"))}</td>`)
          .join("");
        return `<tr>${cells}</tr>`;
      })
      .join("\n");

    const logoUrl = new URL("/assets/NoLS2025-04.png", window.location.origin).toString();

    const groupBarsHtml = (() => {
      const colorByKey: Record<string, string> = {
        PENDING: "#a855f7",
        PROCESSING: "#ec4899",
        CONFIRMED: "#0ea5e9",
        COMPLETED: "#2563eb",
        CANCELED: "#14b8a6",
      };
      const total = normalizeCount(kpiGroup);
      const rows = [
        { key: "PENDING", label: "Pending" },
        { key: "PROCESSING", label: "Processing" },
        { key: "CONFIRMED", label: "Confirmed" },
        { key: "COMPLETED", label: "Completed" },
        { key: "CANCELED", label: "Canceled" },
      ] as const;
      const clip = "polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%)";

      return rows
        .map((r) => {
          const count = normalizeCount(totals.groupStays.byStatus[r.key] ?? 0);
          const pct = pctOf(total, count);
          const color = colorByKey[r.key] ?? "#334155";

          if (pct > 0) {
            return `
              <div style="display:flex;align-items:center;gap:10px;margin-top:8px;">
                <div style="width:120px;font-size:10px;font-weight:700;color:#334155;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(
                  r.label
                )}</div>
                <div style="flex:1;">
                  <div style="height:40px;background:#f3f4f6;border-radius:6px;overflow:hidden;">
                    <div style="height:40px;width:${pct}%;min-width:76px;background:${escapeAttr(
                      color
                    )};display:flex;align-items:center;justify-content:flex-end;">
                      <div style="height:40px;display:flex;align-items:center;padding:0 12px;color:#fff;font-weight:900;border-left:2px solid rgba(255,255,255,0.85);clip-path:${escapeAttr(
                        clip
                      )};">${pct}%</div>
                    </div>
                  </div>
                </div>
              </div>`;
          }

          return `
            <div style="display:flex;align-items:center;gap:10px;margin-top:8px;">
              <div style="width:120px;font-size:10px;font-weight:700;color:#334155;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(
                r.label
              )}</div>
              <div style="flex:1;">
                <div style="height:40px;background:#f3f4f6;border-radius:6px;overflow:hidden;display:flex;align-items:center;padding:0 8px;">
                  <div style="height:32px;display:flex;align-items:center;padding:0 12px;background:#fff;border:1px solid #e5e7eb;color:#334155;font-weight:900;clip-path:${escapeAttr(
                    clip
                  )};">0%</div>
                </div>
              </div>
            </div>`;
        })
        .join("\n");
    })();

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Booking Reports</title>
  <style>
    :root { --ink:#0b1220; --muted:#5b6472; --line:#e5e7eb; --brand:#02665e; }
    * { box-sizing: border-box; }
    body { margin:0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; color:var(--ink); background:#fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { padding: 22px; }
    .sheet { border: 1px solid var(--line); border-radius: 16px; padding: 14px; }
    .company { display:flex; align-items:center; justify-content:space-between; gap:14px; border:1px solid var(--line); border-radius: 14px; padding: 12px 14px; }
    .company-left { display:flex; align-items:center; gap:12px; min-width:0; }
    .logo { width: 46px; height: 46px; object-fit: contain; }
    .co-name { font-weight: 900; letter-spacing: -0.02em; }
    .co-meta { margin-top: 2px; font-size: 11px; color: var(--muted); line-height: 1.35; }
    .title { margin-top: 12px; display:flex; justify-content:space-between; align-items:flex-end; gap: 12px; }
    h1 { margin:0; font-size: 18px; letter-spacing: -0.02em; }
    .sub { margin-top: 4px; color: var(--muted); font-size: 11px; }
    .section { margin-top: 14px; }
    .section h2 { margin: 0 0 8px; font-size: 12px; letter-spacing: -0.01em; }
    .grid { display:grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .card { border:1px solid var(--line); border-radius: 14px; padding: 10px 12px; }
    .divider { height: 1px; background: var(--line); margin: 16px 0; }
    .chartImg { width: 100%; height: auto; border-radius: 12px; border:1px solid var(--line); background:#fff; }
    .kpiGrid { display:grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
    .kpiTile { border:1px solid var(--line); border-radius: 12px; padding: 8px 10px; }
    .kpiLabel { color: var(--muted); font-size: 10px; font-weight: 700; }
    .kpiValue { margin-top: 2px; font-weight: 900; color: var(--ink); font-size: 13px; }
    table { width:100%; border-collapse: collapse; border:1px solid var(--line); border-radius: 14px; overflow:hidden; }
    thead th { font-size: 10px; text-align:left; color: var(--muted); background:#f8fafc; padding: 9px 10px; border-bottom:1px solid var(--line); }
    tbody td { font-size: 11px; padding: 8px 10px; border-bottom: 1px solid rgba(229,231,235,0.8); }
    tbody tr:last-child td { border-bottom: none; }
    .qr { display:flex; gap: 10px; align-items:center; }
    .qr img { width: 92px; height: 92px; border-radius: 10px; border: 1px solid var(--line); background: #fff; }
    .qrTitle { font-weight: 900; color: var(--ink); font-size: 11px; }
    .qrNote { margin-top: 2px; color: var(--muted); font-size: 10px; max-width: 260px; line-height: 1.25; }
    @media print { @page { size: A4; margin: 12mm; } .page { padding: 0; } .sheet { border-radius: 14px; padding: 12px; } }
  </style>
</head>
<body>
  <div class="page">
    <div class="sheet">
      <div class="company">
        <div class="company-left">
          <img class="logo" src="${escapeAttr(logoUrl)}" alt="NoLSAF" />
          <div style="min-width:0">
            <div class="co-name">NoLS Africa Inc</div>
            <div class="co-meta">
              <div>P.O BOX 23091 | Dar es Salaam-Tanzania</div>
              <div>finance@nolsaf.com | +255736766726</div>
            </div>
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-size:11px;color:var(--muted)">Report ID</div>
          <div style="font-weight:900;font-size:11px">${escapeHtml(reportId)}</div>
        </div>
      </div>

      <div class="title">
        <div>
          <h1>Management Booking Reports</h1>
          <div class="sub">Range: ${escapeHtml(from)} → ${escapeHtml(to)} • Generated: ${escapeHtml(fmtDateTime(reportId))}</div>
          <div class="sub">Owner bookings = standard property bookings (not Group stays, not Plan With Us).</div>
        </div>
      </div>

      <div class="section">
        <h2>Totals</h2>
        <div class="grid">
          <div class="card"><div style="color:var(--muted); font-size:10px;">Owner bookings</div><div style="margin-top:2px; font-size:15px; font-weight:900; color: var(--brand);">${escapeHtml(fmt(kpiSingle))}</div></div>
          <div class="card"><div style="color:var(--muted); font-size:10px;">Group stays</div><div style="margin-top:2px; font-size:15px; font-weight:900; color: var(--brand);">${escapeHtml(fmt(kpiGroup))}</div></div>
          <div class="card"><div style="color:var(--muted); font-size:10px;">Plan With Us</div><div style="margin-top:2px; font-size:15px; font-weight:900; color: var(--brand);">${escapeHtml(fmt(kpiPlan))}</div></div>
        </div>
      </div>

      ${
        ownerStatusImg || planStatusImg || true
          ? `
      <div class="section">
        <h2>Visual summary</h2>
        <div class="grid">
          <div class="card">
            <div style="color:var(--muted); font-size:10px; margin-bottom:6px;">Owner bookings by status</div>
            ${ownerStatusImg ? `<img class="chartImg" src="${escapeAttr(ownerStatusImg)}" alt="Owner bookings chart" />` : ""}
          </div>
          <div class="card">
            <div style="color:var(--muted); font-size:10px; margin-bottom:6px;">Group stays KPIs</div>
            ${groupBarsHtml}
          </div>
          <div class="card">
            <div style="color:var(--muted); font-size:10px; margin-bottom:6px;">Plan With Us by status</div>
            ${planStatusImg ? `<img class="chartImg" src="${escapeAttr(planStatusImg)}" alt="Plan With Us chart" />` : ""}
          </div>
        </div>
      </div>`
          : ""
      }

      <div class="section">
        <h2>Owner bookings details</h2>
        <table>${ownerDetailHead}<tbody>${ownerDetailRows}</tbody></table>
      </div>

      <div class="divider"></div>

      <div class="section">
        <h2>Group stays details</h2>
        <table>${groupDetailHead}<tbody>${groupDetailRows}</tbody></table>
      </div>

      <div class="divider"></div>

      <div class="section">
        <h2>Plan With Us details</h2>
        <table>${planDetailHead}<tbody>${planDetailRows}</tbody></table>
      </div>

      ${
        qrDataUrl
          ? `
      <div class="section">
        <h2>Verify</h2>
        <div class="qr">
          <img src="${escapeAttr(qrDataUrl)}" alt="Verify report QR" />
          <div>
            <div class="qrTitle">Verify this report</div>
            <div class="qrNote">Scan to open the official management booking report link (login required).</div>
          </div>
        </div>
      </div>`
          : ""
      }
    </div>
  </div>
</body>
</html>`;

    const w = window.open("", "_blank");
    if (!w) {
      alert("Unable to open print window — please allow popups");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    setTimeout(() => {
      w.focus();
      w.print();
    }, 450);
  }

  return (
    <div className="page-content">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="py-6 space-y-5">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-start gap-3">
              <div className="hidden sm:block" aria-hidden />

              <div className="min-w-0 text-center">
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700">
                  <FileText className="h-4 w-4" aria-hidden />
                  Operational Export
                </div>
                <h2 className="mt-2 text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Booking Reports</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Printable statistics for owner bookings (standard property bookings), group stays, and Plan With Us requests.
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Owner bookings = all property bookings that are not under Group stays and not under Plan With Us.
                </p>
              </div>

              <div className="flex items-center gap-2 justify-start sm:justify-end">
                <button
                  type="button"
                  onClick={printReport}
                  className="inline-flex items-center justify-center h-10 px-3 rounded-xl border border-brand/25 bg-brand text-white shadow-sm hover:brightness-95 transition active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
                >
                  <Printer className="h-4 w-4 mr-2" aria-hidden />
                  Print
                </button>
                <Link
                  href="/admin/management/reports"
                  className="inline-flex items-center justify-center h-10 px-3 rounded-xl border border-brand/25 bg-white text-brand shadow-sm hover:bg-brand/5 transition active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 no-underline"
                >
                  Back
                </Link>
              </div>
            </div>

            {error ? (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5" aria-hidden />
                <div className="min-w-0">
                  <div className="font-semibold">Couldn’t load stats</div>
                  <div className="text-amber-800/90 break-words">{error}</div>
                </div>
              </div>
            ) : null}

            <div className="mt-4 flex items-end gap-3 overflow-x-auto flex-nowrap pb-1 -mb-1">
              <div className="shrink-0 w-[190px]">
                <div className="text-[11px] font-semibold text-gray-500 mb-1">From</div>
                <DatePickerField label="From date" value={from} max={to} onChangeAction={(nextIso) => setFrom(nextIso)} widthClassName="w-full" />
              </div>

              <div className="shrink-0 w-[190px]">
                <div className="text-[11px] font-semibold text-gray-500 mb-1">To</div>
                <DatePickerField label="To date" value={to} min={from} onChangeAction={(nextIso) => setTo(nextIso)} widthClassName="w-full" />
              </div>

              <div className="shrink-0">
                <div className="text-[11px] font-semibold text-gray-500 mb-1">Range</div>
                <div className="flex items-center gap-2 flex-nowrap">
                  {(
                    [
                      { key: "today" as const, label: "Today", hint: "Today", accent: "bg-emerald-500", days: 0 },
                      { key: "7d" as const, label: "7D", hint: "Last 7 days", accent: "bg-sky-500", days: 6 },
                      { key: "30d" as const, label: "1M", hint: "Last 30 days", accent: "bg-violet-500", days: 29 },
                    ] as const
                  ).map((p) => {
                    const r = getQuickRange(p.days);
                    const active = from === r.from && to === r.to;
                    return (
                      <RangePill
                        key={p.key}
                        label={p.label}
                        hint={p.hint}
                        accentClassName={p.accent}
                        active={active}
                        onClick={() => applyQuickRange(p.days)}
                      />
                    );
                  })}

                  <MoreRangesPopover
                    mounted={mounted}
                    moreRanges={[
                      { key: "3m", label: "3M", hint: "Last 3 months", accent: "bg-indigo-500" },
                      { key: "6m", label: "6M", hint: "Last 6 months", accent: "bg-amber-500" },
                      { key: "ytd", label: "YTD", hint: "Year to date", accent: "bg-teal-500" },
                      { key: "12m", label: "12M", hint: "Last 12 months (max)", accent: "bg-slate-600" },
                    ]}
                    onSelectRange={(k) => {
                      const r = getMoreRange(k);
                      setFrom(r.from);
                      setTo(r.to);
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => void load()}
                    className="h-12 w-12 inline-flex items-center justify-center rounded-xl border border-brand/25 bg-white text-brand shadow-sm transition hover:bg-brand/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
                    title="Refresh"
                    aria-label="Refresh"
                  >
                    <RefreshCw className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
              <div className="text-xs font-semibold text-gray-500">Owner bookings</div>
              <div className="mt-1 text-2xl font-extrabold text-gray-900">{fmtInt(kpiSingle)}</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
              <div className="text-xs font-semibold text-gray-500">Group stays</div>
              <div className="mt-1 text-2xl font-extrabold text-gray-900">{fmtInt(kpiGroup)}</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
              <div className="text-xs font-semibold text-gray-500">Plan With Us</div>
              <div className="mt-1 text-2xl font-extrabold text-gray-900">{fmtInt(kpiPlan)}</div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-gray-900">Visual summary</div>
                <div className="text-xs text-gray-500">Status breakdown charts for the selected range.</div>
              </div>
              {loading ? <div className="text-xs text-gray-500">Loading…</div> : null}
            </div>

            <div className="mt-3 grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                <div className="text-sm font-semibold text-gray-900 mb-2">Owner bookings by status</div>
                <Chart
                  type="pie"
                  data={ownerStatusChartData as any}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: true,
                        position: "bottom",
                        labels: { color: "#4b5563", boxWidth: 10, boxHeight: 10, font: { size: 10 } },
                      },
                      tooltip: { enabled: true },
                    },
                  } as any}
                  height={210}
                  onCanvas={setOwnerChartCanvas}
                />
              </div>

              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                <div className="text-sm font-semibold text-gray-900 mb-2">Group stays KPIs</div>
                <div className="grid grid-cols-1 gap-2">
                  {groupStayBars.map((row) => (
                    <PercentBarRow key={row.key} label={row.label} pct={row.pct} colorClassName={row.color} />
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                <div className="text-sm font-semibold text-gray-900 mb-2">Plan With Us by status</div>
                <Chart
                  type="doughnut"
                  data={planStatusChartData as any}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: "62%",
                    plugins: {
                      legend: {
                        display: true,
                        position: "bottom",
                        labels: { color: "#4b5563", boxWidth: 10, boxHeight: 10, font: { size: 10 } },
                      },
                      tooltip: { enabled: true },
                    },
                  } as any}
                  height={210}
                  onCanvas={setPlanChartCanvas}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-brand" aria-hidden />
                <div className="text-sm font-semibold text-gray-900">Owner bookings</div>
              </div>
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="py-2 text-gray-600">Total</td>
                      <td className="py-2 text-right font-extrabold text-gray-900">{fmtInt(kpiSingle)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-gray-600">New</td>
                      <td className="py-2 text-right font-semibold text-gray-900">{totals.single.byStatus["NEW"] ?? "—"}</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-gray-600">Validated</td>
                      <td className="py-2 text-right font-semibold text-gray-900">{totals.single.byStatus["CONFIRMED"] ?? "—"}</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-gray-600">Check-in</td>
                      <td className="py-2 text-right font-semibold text-gray-900">{String(Math.round(singleCheckedIn || 0))}</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-gray-600">Check-out</td>
                      <td className="py-2 text-right font-semibold text-gray-900">{totals.single.byStatus["CHECKED_OUT"] ?? "—"}</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-gray-600">Canceled</td>
                      <td className="py-2 text-right font-semibold text-gray-900">{totals.single.byStatus["CANCELED"] ?? "—"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-brand" aria-hidden />
                <div className="text-sm font-semibold text-gray-900">Group stays</div>
              </div>
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="py-2 text-gray-600">Total</td>
                      <td className="py-2 text-right font-extrabold text-gray-900">{fmtInt(kpiGroup)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-gray-600">Pending</td>
                      <td className="py-2 text-right font-semibold text-gray-900">{totals.groupStays.byStatus["PENDING"] ?? "—"}</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-gray-600">Processing</td>
                      <td className="py-2 text-right font-semibold text-gray-900">{totals.groupStays.byStatus["PROCESSING"] ?? "—"}</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-gray-600">Confirmed</td>
                      <td className="py-2 text-right font-semibold text-gray-900">{totals.groupStays.byStatus["CONFIRMED"] ?? "—"}</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-gray-600">Completed</td>
                      <td className="py-2 text-right font-semibold text-gray-900">{totals.groupStays.byStatus["COMPLETED"] ?? "—"}</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-gray-600">Canceled</td>
                      <td className="py-2 text-right font-semibold text-gray-900">{totals.groupStays.byStatus["CANCELED"] ?? "—"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-brand" aria-hidden />
                <div className="text-sm font-semibold text-gray-900">Plan With Us</div>
              </div>
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="py-2 text-gray-600">Total</td>
                      <td className="py-2 text-right font-extrabold text-gray-900">{fmtInt(kpiPlan)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-gray-600">New</td>
                      <td className="py-2 text-right font-semibold text-gray-900">{totals.planWithUs.byStatus["NEW"] ?? "—"}</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-gray-600">In progress</td>
                      <td className="py-2 text-right font-semibold text-gray-900">{totals.planWithUs.byStatus["IN_PROGRESS"] ?? "—"}</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-gray-600">Completed</td>
                      <td className="py-2 text-right font-semibold text-gray-900">{totals.planWithUs.byStatus["COMPLETED"] ?? "—"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <div className="text-sm font-semibold text-gray-900 pb-2 border-b border-gray-200">Owner bookings (details)</div>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-xs text-gray-500">
                  <tr className="border-b border-gray-200">
                    <th className="py-2 pr-4 text-left font-semibold">Name</th>
                    <th className="py-2 pr-4 text-left font-semibold">Gender</th>
                    <th className="py-2 pr-4 text-left font-semibold">Nationality</th>
                    <th className="py-2 pr-4 text-left font-semibold">Amount</th>
                    <th className="py-2 pr-4 text-left font-semibold">Paid at</th>
                    <th className="py-2 pr-4 text-left font-semibold">Property Name</th>
                    <th className="py-2 pr-4 text-left font-semibold">Check-in & out</th>
                    <th className="py-2 pr-0 text-left font-semibold">Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {ownerItems.length === 0 ? (
                    <tr>
                      <td className="py-3 text-gray-500" colSpan={8}>
                        No records in this range.
                      </td>
                    </tr>
                  ) : (
                    ownerItems.map((b) => {
                      const name = b.guestName || b.user?.name || "—";
                      const gender = b.sex || "—";
                      const nationality = b.nationality || "—";
                      const amountCandidate = b.payment?.amount ?? b.invoice?.total ?? null;
                      const paidAtCandidate = b.payment?.paidAt ?? b.invoice?.paidAt ?? null;
                      const amount = numOrNull(amountCandidate) === null ? "—" : fmtAmount(amountCandidate);
                      const paidAt = paidAtCandidate ? fmtDateTime(paidAtCandidate) : "—";
                      const property = b.property?.title || "—";
                      const stay = `${fmtDateOnly(b.checkIn)} → ${fmtDateOnly(b.checkOut)}`;
                      const rating = b.review?.rating;
                      return (
                        <tr key={`ob-${b.id}`}>
                          <td className="py-2 pr-4 text-gray-900 whitespace-nowrap">{name}</td>
                          <td className="py-2 pr-4 text-gray-700 whitespace-nowrap">{gender}</td>
                          <td className="py-2 pr-4 text-gray-700 whitespace-nowrap">{nationality}</td>
                          <td className="py-2 pr-4 text-gray-900 whitespace-nowrap">{amount}</td>
                          <td className="py-2 pr-4 text-gray-700 whitespace-nowrap">{paidAt}</td>
                          <td className="py-2 pr-4 text-gray-900">{property}</td>
                          <td className="py-2 pr-4 text-gray-700 whitespace-nowrap">{stay}</td>
                          <td className="py-2 pr-0 text-gray-700 whitespace-nowrap">{rating ?? "—"}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <div className="text-sm font-semibold text-gray-900 pb-2 border-b border-gray-200">Group stays (details)</div>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-xs text-gray-500">
                  <tr className="border-b border-gray-200">
                    <th className="py-2 pr-4 text-left font-semibold">Name</th>
                    <th className="py-2 pr-4 text-left font-semibold">Phone</th>
                    <th className="py-2 pr-4 text-left font-semibold">Gender</th>
                    <th className="py-2 pr-4 text-left font-semibold">Nationality</th>
                    <th className="py-2 pr-4 text-left font-semibold">Status</th>
                    <th className="py-2 pr-4 text-left font-semibold">Accepted Amount</th>
                    <th className="py-2 pr-4 text-left font-semibold">Confirmed Amount</th>
                    <th className="py-2 pr-4 text-left font-semibold">Currency</th>
                    <th className="py-2 pr-4 text-left font-semibold">Accepted Property</th>
                    <th className="py-2 pr-4 text-left font-semibold">Confirmed Property</th>
                    <th className="py-2 pr-4 text-left font-semibold">Check-in & out</th>
                    <th className="py-2 pr-4 text-left font-semibold">Created</th>
                    <th className="py-2 pr-4 text-left font-semibold">Accepted</th>
                    <th className="py-2 pr-0 text-left font-semibold">Confirmed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {groupItems.length === 0 ? (
                    <tr>
                      <td className="py-3 text-gray-500" colSpan={14}>
                        No records in this range.
                      </td>
                    </tr>
                  ) : (
                    groupItems.map((b) => {
                      const name = b.leadPassenger?.name || b.user?.name || "—";
                      const phone = b.leadPassenger?.phone || b.user?.phone || "—";
                      const gender = b.leadPassenger?.gender || "—";
                      const nationality = b.leadPassenger?.nationality || "—";
                      const status = b.status || "—";
                      const acceptedAmount = fmtAmount(b.acceptedTotalAmount ?? null);
                      const confirmedAmount = fmtAmount(b.confirmedTotalAmount ?? null);
                      const currency = b.currency || "—";
                      const acceptedProperty = b.acceptedProperty?.title || "—";
                      const confirmedProperty = b.confirmedProperty?.title || "—";
                      const stay = `${fmtDateOnly(b.checkIn)} → ${fmtDateOnly(b.checkOut)}`;
                      const created = b.createdAt ? fmtDateTime(b.createdAt) : "—";
                      const accepted = b.acceptedAt ? fmtDateTime(b.acceptedAt) : "—";
                      const confirmed = b.confirmedAt ? fmtDateTime(b.confirmedAt) : "—";
                      return (
                        <tr key={`gb-${b.id}`}>
                          <td className="py-2 pr-4 text-gray-900 whitespace-nowrap">{name}</td>
                          <td className="py-2 pr-4 text-gray-900 whitespace-nowrap">{phone}</td>
                          <td className="py-2 pr-4 text-gray-700 whitespace-nowrap">{gender}</td>
                          <td className="py-2 pr-4 text-gray-700 whitespace-nowrap">{nationality}</td>
                          <td className="py-2 pr-4 text-gray-700 whitespace-nowrap">{status}</td>
                          <td className="py-2 pr-4 text-gray-900 whitespace-nowrap">{acceptedAmount}</td>
                          <td className="py-2 pr-4 text-gray-900 whitespace-nowrap">{confirmedAmount}</td>
                          <td className="py-2 pr-4 text-gray-700 whitespace-nowrap">{currency}</td>
                          <td className="py-2 pr-4 text-gray-900">{acceptedProperty}</td>
                          <td className="py-2 pr-4 text-gray-900">{confirmedProperty}</td>
                          <td className="py-2 pr-4 text-gray-700 whitespace-nowrap">{stay}</td>
                          <td className="py-2 pr-4 text-gray-700 whitespace-nowrap">{created}</td>
                          <td className="py-2 pr-4 text-gray-700 whitespace-nowrap">{accepted}</td>
                          <td className="py-2 pr-0 text-gray-700 whitespace-nowrap">{confirmed}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <div className="text-sm font-semibold text-gray-900 pb-2 border-b border-gray-200">Plan With Us (details)</div>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-xs text-gray-500">
                  <tr className="border-b border-gray-200">
                    <th className="py-2 pr-4 text-left font-semibold">Name</th>
                    <th className="py-2 pr-4 text-left font-semibold">Phone</th>
                    <th className="py-2 pr-4 text-left font-semibold">Role</th>
                    <th className="py-2 pr-4 text-left font-semibold">Trip Type</th>
                    <th className="py-2 pr-4 text-left font-semibold">Destinations</th>
                    <th className="py-2 pr-4 text-left font-semibold">Travel dates</th>
                    <th className="py-2 pr-4 text-left font-semibold">Group size</th>
                    <th className="py-2 pr-4 text-left font-semibold">Budget</th>
                    <th className="py-2 pr-4 text-left font-semibold">Transport</th>
                    <th className="py-2 pr-4 text-left font-semibold">Status</th>
                    <th className="py-2 pr-4 text-left font-semibold">Created</th>
                    <th className="py-2 pr-4 text-left font-semibold">Responded</th>
                    <th className="py-2 pr-0 text-left font-semibold">Assigned agent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {planItems.length === 0 ? (
                    <tr>
                      <td className="py-3 text-gray-500" colSpan={13}>
                        No records in this range.
                      </td>
                    </tr>
                  ) : (
                    planItems.map((b) => {
                      const name = b.customer?.name || "—";
                      const phone = b.customer?.phone || "—";
                      const role = b.role || "—";
                      const tripType = b.tripType || "—";
                      const destinations = b.destinations || "—";
                      const travelDates = `${fmtDateOnly(b.dateFrom)} → ${fmtDateOnly(b.dateTo)}`;
                      const groupSize = b.groupSize === null || b.groupSize === undefined ? "—" : String(b.groupSize);
                      const budget = b.budget ? fmtAmount(b.budget) : "—";
                      const transport = b.transportRequired ? "Yes" : "No";
                      const status = b.status || "—";
                      const created = b.createdAt ? fmtDateTime(b.createdAt) : "—";
                      const responded = b.respondedAt ? fmtDateTime(b.respondedAt) : "—";
                      const assigned = b.assignedAgent || (b.assignedAgentId ? `#${b.assignedAgentId}` : "—");
                      return (
                        <tr key={`pw-${b.id}`}>
                          <td className="py-2 pr-4 text-gray-900 whitespace-nowrap">{name}</td>
                          <td className="py-2 pr-4 text-gray-900 whitespace-nowrap">{phone}</td>
                          <td className="py-2 pr-4 text-gray-700 whitespace-nowrap">{role}</td>
                          <td className="py-2 pr-4 text-gray-700 whitespace-nowrap">{tripType}</td>
                          <td className="py-2 pr-4 text-gray-900">{destinations}</td>
                          <td className="py-2 pr-4 text-gray-700 whitespace-nowrap">{travelDates}</td>
                          <td className="py-2 pr-4 text-gray-700 whitespace-nowrap">{groupSize}</td>
                          <td className="py-2 pr-4 text-gray-900 whitespace-nowrap">{budget}</td>
                          <td className="py-2 pr-4 text-gray-700 whitespace-nowrap">{transport}</td>
                          <td className="py-2 pr-4 text-gray-700 whitespace-nowrap">{status}</td>
                          <td className="py-2 pr-4 text-gray-700 whitespace-nowrap">{created}</td>
                          <td className="py-2 pr-4 text-gray-700 whitespace-nowrap">{responded}</td>
                          <td className="py-2 pr-0 text-gray-700 whitespace-nowrap">{assigned}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {loading ? <div className="text-xs text-gray-500">Loading…</div> : null}
        </div>
      </div>
    </div>
  );
}
