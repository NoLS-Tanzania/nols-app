import { apiRequest } from "../lib/apiClient";
import {
  AvailabilityResponse,
  ClaimResponse,
  ClaimsFinishedResponse,
  ClaimsPendingResponse,
  DashboardResponse,
  MessageTemplate,
  NotificationsResponse,
  RatingSummary,
  ReminderItem,
  ScheduledTripsResponse,
  TripDetail,
  TripStage,
  TripStageResponse,
  TripsResponse
} from "./types";

export function fetchDashboard(token: string) {
  return apiRequest<DashboardResponse>("/api/driver/dashboard", { token });
}

export function fetchAvailability(token: string) {
  return apiRequest<AvailabilityResponse>("/api/driver/availability", { token });
}

export function setAvailability(token: string, available: boolean) {
  return apiRequest<AvailabilityResponse>("/api/driver/availability", {
    token,
    method: "POST",
    body: { available }
  });
}

export function fetchNotifications(token: string, tab: "unread" | "viewed") {
  return apiRequest<NotificationsResponse>(`/api/driver/notifications?tab=${tab}`, { token });
}

export function markNotificationRead(token: string, id: string) {
  return apiRequest<{ ok: boolean }>(`/api/driver/notifications/${encodeURIComponent(id)}/mark-read`, {
    token,
    method: "POST"
  });
}

export function fetchTrips(token: string) {
  return apiRequest<TripsResponse>("/api/driver/trips", { token });
}

export function fetchTripDetail(token: string, tripId: number) {
  return apiRequest<TripDetail>(`/api/driver/trips/${tripId}`, { token });
}

export function acceptTrip(token: string, tripId: number) {
  return apiRequest<{ ok: boolean; trip: unknown }>(`/api/driver/trips/${tripId}/accept`, { token, method: "POST" });
}

export function declineTrip(token: string, tripId: number) {
  return apiRequest<{ ok: boolean }>(`/api/driver/trips/${tripId}/decline`, { token, method: "POST" });
}

export function cancelTrip(token: string, tripId: number, reason?: string) {
  return apiRequest<{ ok: boolean }>(`/api/driver/trips/${tripId}/cancel`, {
    token,
    method: "POST",
    body: reason ? { reason } : {}
  });
}

export function updateTripStage(
  token: string,
  tripId: number,
  body: { stage: TripStage; lat?: number; lng?: number; accuracyM?: number }
) {
  return apiRequest<TripStageResponse>(`/api/driver/trips/${tripId}/stage`, { token, method: "POST", body });
}

export function sendLocationPing(
  token: string,
  body: { lat: number; lng: number; headingDeg?: number; speedMps?: number; accuracyM?: number; transportBookingId?: number }
) {
  return apiRequest<{ ok: boolean }>("/api/driver/location", { token, method: "POST", body });
}

export function fetchMessageTemplates(token: string) {
  return apiRequest<{ templates: MessageTemplate[] }>("/api/driver/messages/templates", { token });
}

export function sendQuickMessage(token: string, toUserId: string, templateKey: string) {
  return apiRequest<{ ok: boolean; delivered: boolean }>("/api/driver/messages/send", {
    token,
    method: "POST",
    body: { toUserId, templateKey }
  });
}

export function fetchScheduledTrips(token: string, vehicleType?: string) {
  const query = vehicleType ? `?vehicleType=${encodeURIComponent(vehicleType)}` : "";
  return apiRequest<ScheduledTripsResponse>(`/api/driver/trips/scheduled${query}`, { token });
}

export function fetchAssignedScheduledTrips(token: string) {
  return apiRequest<ScheduledTripsResponse>("/api/driver/trips/scheduled/assigned", { token });
}

export function fetchClaimsPending(token: string) {
  return apiRequest<ClaimsPendingResponse>("/api/driver/trips/claims/pending", { token });
}

export function fetchClaimsFinished(token: string) {
  return apiRequest<ClaimsFinishedResponse>("/api/driver/trips/claims/finished", { token });
}

export function claimTrip(token: string, tripId: number) {
  return apiRequest<ClaimResponse>(`/api/driver/trips/${tripId}/claim`, { token, method: "POST" });
}

export function fetchReminders(token: string) {
  return apiRequest<ReminderItem[]>("/api/driver/reminders", { token });
}

export function markReminderRead(token: string, id: string) {
  return apiRequest<ReminderItem>(`/api/driver/reminders/${encodeURIComponent(id)}/read`, { token, method: "POST" });
}

export function fetchRating(token: string) {
  return apiRequest<RatingSummary>("/api/driver/performance", { token });
}
