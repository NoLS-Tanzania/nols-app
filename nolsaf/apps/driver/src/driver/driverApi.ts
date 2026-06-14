import { apiRequest, apiUploadFile } from "../lib/apiClient";
import {
  ApplyWithdrawalResponse,
  AvailabilityResponse,
  BonusEligibility,
  BonusHistoryItem,
  ChangePasswordBody,
  ChangePasswordResponse,
  ClaimResponse,
  ClaimsFinishedResponse,
  ClaimsPendingResponse,
  DashboardResponse,
  DeleteAccountResponse,
  DriverLevel,
  DriverMapData,
  DriverPerformance,
  DriverProfile,
  DriverReferral,
  InvoicesResponse,
  LicenseInfo,
  LoginHistoryResponse,
  MessageTemplate,
  NotificationsResponse,
  PaymentMethodsResponse,
  PayoutsResponse,
  RatingSummary,
  ReferralEarningsResponse,
  ReferralPerformance,
  ReferralWithdrawalsResponse,
  ReminderItem,
  SafetyResponse,
  ScheduledTripsResponse,
  SendLevelMessageResponse,
  TripDetail,
  TripStage,
  TripStageResponse,
  TripsResponse,
  TwoFactorProvisionResponse,
  TwoFactorStatus,
  Update2FABody,
  Update2FAResponse,
  UpdateDocumentBody,
  UpdateDocumentResponse,
  UpdatePayoutsBody,
  UpdatePayoutsResponse,
  UpdateProfileBody,
  UpdateProfileResponse,
  UploadFileResponse
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

export function fetchPayouts(token: string, page = 1, pageSize = 20) {
  return apiRequest<PayoutsResponse>(`/api/driver/payouts?page=${page}&pageSize=${pageSize}`, { token });
}

export function fetchInvoices(token: string, page = 1, pageSize = 20) {
  return apiRequest<InvoicesResponse>(`/api/driver/invoices?page=${page}&pageSize=${pageSize}`, { token });
}

export function fetchBonusHistory(token: string) {
  return apiRequest<BonusHistoryItem[]>("/api/driver/bonus/history", { token });
}

export function fetchBonusEligibility(token: string) {
  return apiRequest<BonusEligibility>("/api/driver/bonus/eligibility", { token });
}

export function fetchDriverPerformance(token: string) {
  return apiRequest<DriverPerformance>("/api/driver/performance", { token });
}

export function fetchDriverLevel(token: string) {
  return apiRequest<DriverLevel>("/api/driver/level", { token });
}

export function sendLevelMessage(token: string, message: string) {
  return apiRequest<SendLevelMessageResponse>("/api/driver/level/message", { token, method: "POST", body: { message } });
}

export function fetchReferral(token: string) {
  return apiRequest<DriverReferral>("/api/driver/referral", { token });
}

export function fetchReferralEarnings(token: string, status?: string) {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiRequest<ReferralEarningsResponse>(`/api/driver/referral-earnings${query}`, { token });
}

export function fetchReferralWithdrawals(token: string) {
  return apiRequest<ReferralWithdrawalsResponse>("/api/driver/referral-earnings/withdrawals", { token });
}

export function applyReferralWithdrawal(token: string, body: { amount?: number; paymentMethod?: string; paymentRef?: string }) {
  return apiRequest<ApplyWithdrawalResponse>("/api/driver/referral-earnings/apply-withdrawal", { token, method: "POST", body });
}

export function fetchReferralPerformance(token: string) {
  return apiRequest<ReferralPerformance>("/api/driver/referral/performance", { token });
}

// Phase 4: Profile, management, security, and policies

export function fetchProfile(token: string) {
  return apiRequest<{ ok: true; data: DriverProfile }>("/api/account/me", { token }).then((response) => response.data);
}

export function updateDriverProfile(token: string, body: UpdateProfileBody) {
  return apiRequest<UpdateProfileResponse>("/api/driver/profile", { token, method: "PUT", body });
}

export function fetchPaymentMethods(token: string) {
  return apiRequest<PaymentMethodsResponse>("/api/account/payment-methods", { token });
}

export function updatePayoutDetails(token: string, body: UpdatePayoutsBody) {
  return apiRequest<UpdatePayoutsResponse>("/api/account/payouts", { token, method: "PUT", body });
}

export function updateDocument(token: string, body: UpdateDocumentBody) {
  return apiRequest<UpdateDocumentResponse>("/api/account/documents", { token, method: "PUT", body });
}

export function uploadFile(token: string, file: { uri: string; name: string; type?: string | null; file?: Blob | File | null }, folder: "avatars" | "driver-documents") {
  return apiUploadFile<UploadFileResponse>("/api/uploads/cloudinary/upload", { token, file, fields: { folder } });
}

export function deleteAccount(token: string) {
  return apiRequest<DeleteAccountResponse>("/api/account", { token, method: "DELETE" });
}

export function fetchDriverLicense(token: string) {
  return apiRequest<LicenseInfo>("/api/driver/license", { token });
}

export function fetch2FAStatus(token: string) {
  return apiRequest<TwoFactorStatus>("/api/account/security/2fa", { token });
}

export function provision2FA(token: string) {
  return apiRequest<TwoFactorProvisionResponse>("/api/account/security/2fa/provision?type=totp", { token });
}

export function update2FA(token: string, body: Update2FABody) {
  return apiRequest<Update2FAResponse>("/api/account/security/2fa", { token, method: "POST", body });
}

export function changePassword(token: string, body: ChangePasswordBody) {
  return apiRequest<ChangePasswordResponse>("/api/account/password/change", { token, method: "POST", body });
}

export function fetchLoginHistory(token: string) {
  return apiRequest<LoginHistoryResponse>("/api/account/security/logins", { token });
}

// Phase 5: Live map and dispatch

export function fetchDriverMap(token: string) {
  return apiRequest<DriverMapData>("/api/driver/map", { token });
}

export function fetchDriverSafety(token: string) {
  return apiRequest<SafetyResponse>("/api/driver/safety", { token });
}
