import { apiRequest } from "@nolsaf/native-ui";

import {
  OwnerRevenueInvoice,
  OwnerRevenueInvoicesResponse,
  OwnerRevenueReceipt,
  OwnerRevenueSegment,
  OwnerRevenueStats
} from "./types";

type TokenParam = { token: string | null };

const SEGMENT_STATUS: Record<OwnerRevenueSegment, string | undefined> = {
  all: undefined,
  requested: "REQUESTED,SUBMITTED",
  paid: "PAID",
  rejected: "REJECTED"
};

const EMPTY_STATS: OwnerRevenueStats = {
  totalRevenue: 0,
  paidRevenue: 0,
  pendingRevenue: 0,
  totalInvoices: 0,
  paidInvoices: 0,
  pendingInvoices: 0
};

function withQuery(path: string, params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  const q = query.toString();
  return q ? `${path}?${q}` : path;
}

export function revenueStatusForSegment(segment: OwnerRevenueSegment) {
  return SEGMENT_STATUS[segment];
}

export async function fetchOwnerRevenueStats({
  token,
  segment
}: TokenParam & { segment?: OwnerRevenueSegment }): Promise<OwnerRevenueStats> {
  const payload = await apiRequest<Partial<OwnerRevenueStats>>(
    withQuery("/api/owner/revenue/stats", { status: segment ? SEGMENT_STATUS[segment] : undefined }),
    { token }
  );
  return {
    totalRevenue: Number(payload.totalRevenue ?? EMPTY_STATS.totalRevenue),
    paidRevenue: Number(payload.paidRevenue ?? EMPTY_STATS.paidRevenue),
    pendingRevenue: Number(payload.pendingRevenue ?? EMPTY_STATS.pendingRevenue),
    totalInvoices: Number(payload.totalInvoices ?? EMPTY_STATS.totalInvoices),
    paidInvoices: Number(payload.paidInvoices ?? EMPTY_STATS.paidInvoices),
    pendingInvoices: Number(payload.pendingInvoices ?? EMPTY_STATS.pendingInvoices)
  };
}

export async function fetchOwnerRevenueInvoices({
  token,
  segment,
  beforeId,
  take = 50
}: TokenParam & { segment: OwnerRevenueSegment; beforeId?: number | null; take?: number }): Promise<OwnerRevenueInvoicesResponse> {
  const payload = await apiRequest<OwnerRevenueInvoicesResponse>(
    withQuery("/api/owner/revenue/invoices", {
      take,
      beforeId: beforeId ?? undefined,
      status: SEGMENT_STATUS[segment]
    }),
    { token }
  );
  return {
    items: Array.isArray(payload.items) ? payload.items : [],
    hasMore: Boolean(payload.hasMore),
    nextBeforeId: typeof payload.nextBeforeId === "number" ? payload.nextBeforeId : null
  };
}

export async function fetchOwnerRevenueInvoiceDetail({
  token,
  invoiceId
}: TokenParam & { invoiceId: number }): Promise<OwnerRevenueInvoice> {
  return apiRequest<OwnerRevenueInvoice>(`/api/owner/revenue/invoices/${invoiceId}`, { token });
}

export async function fetchOwnerRevenueReceipt({
  token,
  invoiceId
}: TokenParam & { invoiceId: number }): Promise<OwnerRevenueReceipt> {
  return apiRequest<OwnerRevenueReceipt>(`/api/owner/revenue/invoices/${invoiceId}/receipt`, { token });
}
