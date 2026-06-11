import { apiRequest } from "../lib/apiClient";
import { AuthUser, LoginResponse, RegisterCustomerInput, UpdateProfileInput } from "./types";

export async function loginWithPassword(email: string, password: string) {
  return apiRequest<LoginResponse>("/api/auth/login-password", {
    method: "POST",
    body: { email, password }
  });
}

export async function registerCustomer(input: RegisterCustomerInput) {
  return apiRequest<{ ok: boolean; id: number; email: string; role: string; message?: string; error?: string }>("/api/auth/register", {
    method: "POST",
    body: {
      ...input,
      role: "CUSTOMER"
    }
  });
}

export async function getCurrentAccount(token: string) {
  // The endpoint wraps the account as { ok: true, data: {...} }. Unwrap it,
  // tolerating an unwrapped shape too, so the rest of the app gets a real user.
  const res = await apiRequest<{ data?: AuthUser } & Partial<AuthUser>>("/api/account/me", { token });
  return ((res && typeof res === "object" && "data" in res && res.data ? res.data : res) as AuthUser);
}

export async function updateAccountProfile(token: string, input: UpdateProfileInput) {
  return apiRequest<{ ok: boolean; message?: string }>("/api/account/profile", {
    method: "PUT",
    token,
    body: input
  });
}

export async function logoutSession(token: string | null) {
  return apiRequest<{ ok: boolean }>("/api/auth/logout", {
    method: "POST",
    token
  });
}

export async function changeAccountPassword(token: string, input: { currentPassword: string; newPassword: string }) {
  return apiRequest<{ ok?: boolean; message?: string; data?: { forceLogout?: boolean; cooldownUntil?: number } }>("/api/account/password/change", {
    method: "POST",
    token,
    body: input
  });
}

export type Account2faStatus = {
  totpEnabled?: boolean;
  smsEnabled?: boolean;
  phone?: string | null;
};

export async function fetchAccount2faStatus(token: string) {
  return apiRequest<Account2faStatus>("/api/account/security/2fa", { token });
}

export async function provisionAccountTotp(token: string) {
  return apiRequest<{ qr?: string | null; secret?: string | null; otpauth?: string | null }>("/api/account/security/2fa/provision?type=totp", { token });
}

export async function updateAccount2fa(token: string, input: { action: "enable" | "disable"; code: string; secret?: string }) {
  return apiRequest<{ ok?: boolean; backupCodes?: string[] }>("/api/account/security/2fa", {
    method: "POST",
    token,
    body: { type: "totp", ...input }
  });
}

export type AccountPasskey = {
  id: string;
  name?: string | null;
  createdAt?: string | null;
};

export async function fetchAccountPasskeys(token: string) {
  return apiRequest<{ items?: AccountPasskey[] }>("/api/account/security/passkeys", { token });
}

export async function deleteAccountPasskey(token: string, id: string) {
  return apiRequest<{ ok?: boolean }>(`/api/account/security/passkeys/${encodeURIComponent(id)}`, {
    method: "DELETE",
    token
  });
}
