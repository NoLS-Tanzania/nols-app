import { apiRequest } from "@nolsaf/native-ui";

export type OwnerReportTab = "overview" | "revenue" | "bookings" | "stays" | "occupancy" | "customers";
export type OwnerReportGroupBy = "day" | "week" | "month";

export type OwnerReportFilters = {
  from: string;
  to: string;
  propertyId?: number | null;
  groupBy: OwnerReportGroupBy;
};

export type OwnerReportProperty = {
  id: number;
  title?: string | null;
  status?: string | null;
};

export type OwnerOverviewReport = {
  kpis?: {
    gross?: number | string | null;
    net?: number | string | null;
    bookings?: number | string | null;
    nights?: number | string | null;
    adr?: number | string | null;
  };
  series?: Array<{ key?: string; gross?: number; net?: number; bookings?: number }>;
  status?: Array<{ status?: string; count?: number }>;
  topProperties?: Array<{ propertyId?: number; title?: string; net?: number }>;
};

export type OwnerRevenueReport = {
  series?: Array<{ key?: string; gross?: number; net?: number; commission?: number }>;
  byProperty?: Array<{ title?: string; gross?: number; net?: number; commission?: number }>;
  table?: Array<Record<string, any>>;
};

export type OwnerBookingsReport = {
  series?: Array<{ key?: string; count?: number }>;
  stacked?: Array<Record<string, any>>;
  table?: Array<Record<string, any>>;
};

export type OwnerStaysReport = {
  generatedAt?: string;
  stats?: {
    nolsafBookings?: number;
    externalReservations?: number;
    groupStaysReceived?: number;
    auctionClaimsSubmitted?: number;
    auctionClaimsAccepted?: number;
    revenueTzs?: number;
    nightsBooked?: number;
    nightsBlocked?: number;
    groupStayNights?: number;
  };
  series?: Array<{ key?: string; nolsaf?: number; external?: number; groupStays?: number; revenueTzs?: number }>;
  bookings?: Array<Record<string, any>>;
  external?: Array<Record<string, any>>;
  groupStays?: Array<Record<string, any>>;
  auctionClaims?: Array<Record<string, any>>;
};

export type OwnerOccupancyReport = {
  heat?: Array<{ date?: string; occupancy?: number }>;
  byProperty?: Array<{ propertyId?: number; title?: string; net?: number }>;
};

export type OwnerCustomersReport = {
  byNationality?: Array<{ nationality?: string; count?: number }>;
  topCustomers?: Array<{ name?: string; stays?: number; spend?: number }>;
};

export type OwnerReportData = {
  overview: OwnerOverviewReport | null;
  revenue: OwnerRevenueReport | null;
  bookings: OwnerBookingsReport | null;
  stays: OwnerStaysReport | null;
  occupancy: OwnerOccupancyReport | null;
  customers: OwnerCustomersReport | null;
};

export const EMPTY_REPORT_DATA: OwnerReportData = {
  overview: null,
  revenue: null,
  bookings: null,
  stays: null,
  occupancy: null,
  customers: null
};

function withQuery(path: string, params: Record<string, string | number | null | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  });
  const qs = query.toString();
  return qs ? `${path}?${qs}` : path;
}

export function reportQuery(filters: OwnerReportFilters) {
  return {
    from: filters.from,
    to: filters.to,
    groupBy: filters.groupBy,
    propertyId: filters.propertyId ?? undefined
  };
}

export async function fetchOwnerReportProperties({ token }: { token: string | null }): Promise<OwnerReportProperty[]> {
  const payload = await apiRequest<{ items?: OwnerReportProperty[] }>("/api/owner/properties/mine?status=APPROVED&pageSize=100", { token });
  return Array.isArray(payload.items) ? payload.items : [];
}

export async function fetchOwnerReport<T>({
  token,
  tab,
  filters
}: {
  token: string | null;
  tab: OwnerReportTab;
  filters: OwnerReportFilters;
}): Promise<T> {
  return apiRequest<T>(withQuery(`/api/owner/reports/${tab}`, reportQuery(filters)), { token });
}

export async function fetchOwnerReportPrintToken({ token }: { token: string | null }) {
  return apiRequest<{ ok?: boolean; token?: string; expiresInSeconds?: number }>("/api/owner/reports/print-token", { token });
}

export function fmtDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function addDaysUtc(date: Date, days: number) {
  return new Date(date.getTime() + days * 864e5);
}

export function startOfTodayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function monthStartUtc(date = startOfTodayUtc()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function compactTzs(value: number | string | null | undefined) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "TZS 0";
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `TZS ${(n / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `TZS ${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `TZS ${(n / 1_000).toFixed(1)}K`;
  return `TZS ${Math.round(n).toLocaleString()}`;
}

export function formatTzsFull(value: number | string | null | undefined) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "TZS 0";
  return `TZS ${Math.round(n).toLocaleString()}`;
}

export function numberValue(value: number | string | null | undefined) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}
