import { apiRequest } from "@nolsaf/native-ui";

import {
  BookingValidationResponse,
  OwnerBooking,
  OwnerBookingCounts,
} from "./types";

type TokenParam = { token: string | null };

function normalizeArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  const data = payload as { data?: unknown; items?: unknown } | null;
  if (Array.isArray(data?.data)) return data.data as T[];
  if (Array.isArray(data?.items)) return data.items as T[];
  return [];
}

function dateParam(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function fetchOwnerBookingOverview({ token }: TokenParam): Promise<OwnerBooking[]> {
  const from = new Date();
  from.setDate(from.getDate() - 180);
  const to = new Date();
  to.setDate(to.getDate() + 180);
  const query = new URLSearchParams({ from: dateParam(from), to: dateParam(to) });
  const payload = await apiRequest<{ table?: OwnerBooking[] }>(`/api/owner/reports/bookings?${query.toString()}`, { token });
  return normalizeArray<OwnerBooking>(payload?.table ?? []);
}

export async function fetchRecentOwnerBookings({ token }: TokenParam): Promise<OwnerBooking[]> {
  const payload = await apiRequest<unknown>("/api/owner/bookings/recent", { token });
  return normalizeArray<OwnerBooking>(payload);
}

export async function fetchCheckedInOwnerBookings({ token }: TokenParam): Promise<OwnerBooking[]> {
  const payload = await apiRequest<unknown>("/api/owner/bookings/checked-in", { token });
  return normalizeArray<OwnerBooking>(payload);
}

export async function fetchCheckoutDueOwnerBookings({ token }: TokenParam): Promise<OwnerBooking[]> {
  const payload = await apiRequest<unknown>("/api/owner/bookings/for-checkout", { token });
  return normalizeArray<OwnerBooking>(payload);
}

export async function fetchCheckedOutOwnerBookings({ token }: TokenParam): Promise<OwnerBooking[]> {
  const payload = await apiRequest<unknown>("/api/owner/bookings/checked-out", { token });
  return normalizeArray<OwnerBooking>(payload);
}

export async function fetchOwnerBookingCounts({ token }: TokenParam): Promise<OwnerBookingCounts> {
  const [all, recent, checkedIn, checkoutDue, checkedOut] = await Promise.all([
    fetchOwnerBookingOverview({ token }),
    fetchRecentOwnerBookings({ token }),
    fetchCheckedInOwnerBookings({ token }),
    fetchCheckoutDueOwnerBookings({ token }),
    fetchCheckedOutOwnerBookings({ token })
  ]);

  return {
    all: all.length,
    recent: recent.length,
    checkedIn: checkedIn.length,
    checkoutDue: checkoutDue.length,
    checkedOut: checkedOut.length
  };
}

export async function fetchOwnerBookingsForLane(
  lane: "all" | "recent" | "checkedIn" | "checkoutDue" | "checkedOut",
  params: TokenParam
): Promise<OwnerBooking[]> {
  if (lane === "recent") return fetchRecentOwnerBookings(params);
  if (lane === "checkedIn") return fetchCheckedInOwnerBookings(params);
  if (lane === "checkoutDue") return fetchCheckoutDueOwnerBookings(params);
  if (lane === "checkedOut") return fetchCheckedOutOwnerBookings(params);
  return fetchOwnerBookingOverview(params);
}

export async function validateOwnerBookingCode({
  token,
  code
}: TokenParam & { code: string }): Promise<BookingValidationResponse> {
  return apiRequest<BookingValidationResponse>("/api/owner/bookings/validate", {
    method: "POST",
    token,
    body: { code }
  });
}

export async function confirmOwnerCheckin({
  token,
  bookingId,
  preview
}: TokenParam & { bookingId: number; preview?: BookingValidationResponse["details"] | null }) {
  return apiRequest<{ ok: boolean; bookingId: number; status: string; alreadyConfirmed?: boolean }>(
    "/api/owner/bookings/confirm-checkin",
    {
      method: "POST",
      token,
      body: {
        bookingId,
        consent: {
          accepted: true,
          method: "native-checkbox",
          termsVersion: "v1",
          disbursementVersion: "v1"
        },
        clientSnapshot: preview
          ? {
              fullName: preview.personal.fullName,
              phone: preview.personal.phone,
              property: preview.property.title,
              roomType: preview.booking.roomType,
              nights: preview.booking.nights,
              amountPaid: preview.booking.ownerBaseAmount ?? preview.booking.totalAmount,
              bookingCode: preview.code ?? null,
              nationality: preview.personal.nationality
            }
          : null
      }
    }
  );
}

export async function confirmOwnerCheckout({
  token,
  bookingId,
  rating,
  feedback
}: TokenParam & { bookingId: number; rating: number; feedback?: string | null }) {
  return apiRequest<{ ok: boolean; bookingId: number; status: string; alreadyConfirmed?: boolean }>(
    `/api/owner/bookings/${bookingId}/confirm-checkout`,
    {
      method: "POST",
      token,
      body: { rating, feedback: feedback?.trim() || null }
    }
  );
}
