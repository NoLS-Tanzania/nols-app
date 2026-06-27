import { apiRequest } from "@nolsaf/native-ui";

import {
  OwnerGroupStay,
  OwnerGroupStayClaim,
  OwnerGroupStayCounts,
  OwnerGroupStayProperty,
  OwnerGroupStaySegment
} from "./types";

type TokenParam = { token: string | null };
type ListResponse<T> = { items?: T[]; total?: number; page?: number; pageSize?: number };
type RosterResponse = { members?: any[]; passengers?: any[]; roster?: any[]; total?: number; expectedTotal?: number };

function items<T>(payload: ListResponse<T> | T[] | null | undefined): T[] {
  if (Array.isArray(payload)) return payload;
  return Array.isArray(payload?.items) ? payload.items : [];
}

export async function fetchAssignedGroupStays({ token }: TokenParam) {
  const payload = await apiRequest<ListResponse<OwnerGroupStay>>("/api/owner/group-stays?pageSize=100", { token });
  return items(payload);
}

export async function fetchAvailableGroupStayClaims({ token }: TokenParam) {
  const payload = await apiRequest<ListResponse<OwnerGroupStay>>("/api/owner/group-stays/claims/available?pageSize=100", { token });
  return items(payload);
}

export async function fetchOwnerGroupStayClaims({ token, status }: TokenParam & { status?: string }) {
  const query = new URLSearchParams({ pageSize: "100" });
  if (status) query.set("status", status);
  const payload = await apiRequest<ListResponse<OwnerGroupStayClaim>>(`/api/owner/group-stays/claims/my-claims?${query.toString()}`, { token });
  return items(payload);
}

export async function fetchOwnerGroupStayProperties({ token }: TokenParam) {
  const payload = await apiRequest<ListResponse<OwnerGroupStayProperty>>("/api/owner/properties/mine?pageSize=200", { token });
  return items(payload).filter((property) => String(property.status || "").toUpperCase() === "APPROVED");
}

export async function fetchOwnerGroupStayCounts({ token }: TokenParam): Promise<OwnerGroupStayCounts> {
  const [assigned, available, myBids] = await Promise.all([
    fetchAssignedGroupStays({ token }).catch(() => []),
    fetchAvailableGroupStayClaims({ token }).catch(() => []),
    fetchOwnerGroupStayClaims({ token }).catch(() => [])
  ]);
  return { assigned: assigned.length, available: available.length, myBids: myBids.length };
}

export async function fetchOwnerGroupStaysForSegment(segment: OwnerGroupStaySegment, params: TokenParam) {
  if (segment === "available") return fetchAvailableGroupStayClaims(params);
  if (segment === "myBids") return fetchOwnerGroupStayClaims(params);
  return fetchAssignedGroupStays(params);
}

export async function fetchGroupStayRoster({ token, groupStayId }: TokenParam & { groupStayId: number }) {
  const payload = await apiRequest<RosterResponse>(`/api/owner/group-stays/${groupStayId}/roster`, { token });
  const members = Array.isArray(payload.members)
    ? payload.members
    : Array.isArray(payload.passengers)
      ? payload.passengers
      : Array.isArray(payload.roster)
        ? payload.roster
        : [];
  return {
    ...payload,
    members,
    total: typeof payload.total === "number" ? payload.total : members.length,
  };
}

export async function markGroupStayCheckedIn({ token, groupStayId }: TokenParam & { groupStayId: number }) {
  return apiRequest<{ success?: boolean; checkedInAt?: string; ownerCollects?: number; currency?: string; error?: string }>(`/api/owner/group-stays/${groupStayId}/check-in`, {
    method: "POST",
    token,
  });
}

export async function sendOwnerGroupStayMessage({
  token,
  groupStayId,
  message,
  messageType = "General"
}: TokenParam & { groupStayId: number; message: string; messageType?: string }) {
  return apiRequest<{ success?: boolean; message?: string; error?: string }>(`/api/owner/group-stays/${groupStayId}/message`, {
    method: "POST",
    token,
    body: {
      message,
      messageType
    }
  });
}

export async function submitOwnerGroupStayClaim({
  token,
  groupBookingId,
  propertyId,
  offeredPricePerNight,
  discountPercent,
  specialOffers,
  notes
}: TokenParam & {
  groupBookingId: number;
  propertyId: number;
  offeredPricePerNight: number;
  discountPercent?: number | null;
  specialOffers?: string | null;
  notes?: string | null;
}) {
  return apiRequest<{ success?: boolean; claim?: OwnerGroupStayClaim; error?: string }>("/api/owner/group-stays/claims", {
    method: "POST",
    token,
    body: {
      groupBookingId,
      propertyId,
      offeredPricePerNight,
      discountPercent: discountPercent ?? null,
      specialOffers: specialOffers?.trim() || null,
      notes: notes?.trim() || null
    }
  });
}
