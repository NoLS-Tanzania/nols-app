import { apiRequest } from "../lib/apiClient";
import { AuthUser, LoginResponse } from "./types";

export async function loginWithPassword(email: string, password: string) {
  return apiRequest<LoginResponse>("/api/auth/login-password", {
    method: "POST",
    body: { email, password }
  });
}

export async function getCurrentAccount(token: string) {
  // The endpoint wraps the account as { ok: true, data: {...} }. Unwrap it,
  // tolerating an unwrapped shape too, so the rest of the app gets a real user.
  const res = await apiRequest<{ data?: AuthUser } & Partial<AuthUser>>("/api/account/me", { token });
  return ((res && typeof res === "object" && "data" in res && res.data ? res.data : res) as AuthUser);
}

export async function logoutSession(token: string | null) {
  return apiRequest<{ ok: boolean }>("/api/auth/logout", {
    method: "POST",
    token
  });
}
