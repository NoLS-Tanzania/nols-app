/**
 * Shared axios client for all owner/admin/driver portal API calls.
 *
 * Why Bearer token?  Auth cookies are set on the Express API domain (Render).
 * The browser is on the Vercel domain — it never received those cookies, so
 * it can't send them back to Vercel's rewrite proxy.  The token is also stored
 * in localStorage (key: "token"), so we attach it as Authorization: Bearer on
 * every request.  The Express requireAuth middleware checks this header first.
 *
 * CSRF: On mobile browsers localStorage can be partitioned/empty so the Bearer
 * token may be absent.  Without it the server sees a cookie-auth cross-site
 * request and returns 403 "X-CSRF-Token required".  To handle this we:
 *   1. Capture the X-CSRF-Token header the server sends on every GET response.
 *   2. Attach it on all state-changing requests (POST/PUT/PATCH/DELETE).
 */
import axios from "axios";

// In-memory CSRF token cache — refreshed automatically from GET responses.
let _csrfToken: string | null = null;

function getStoredToken(): string | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return (
      localStorage.getItem("token") ||
      localStorage.getItem("nolsaf_token") ||
      localStorage.getItem("__Host-nolsaf_token") ||
      null
    );
  } catch {
    // localStorage access throws in some mobile/WebView contexts.
    return null;
  }
}

const MUTATION_METHODS = new Set(["post", "put", "patch", "delete"]);

const apiClient = axios.create({ baseURL: "", withCredentials: true });

apiClient.interceptors.request.use((config) => {
  config.headers = config.headers ?? {};

  const token = getStoredToken();
  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }

  // Attach cached CSRF token on mutations when no Bearer token is available
  // (protects mobile / cookie-only sessions).
  if (!token && _csrfToken && MUTATION_METHODS.has((config.method ?? "").toLowerCase())) {
    config.headers["X-CSRF-Token"] = _csrfToken;
  }

  return config;
});

// Capture the CSRF token from every response so it stays fresh.
apiClient.interceptors.response.use((response) => {
  const csrfHeader = response.headers["x-csrf-token"];
  if (csrfHeader) {
    _csrfToken = csrfHeader;
  }
  return response;
});

/** Save auth token to localStorage after login/registration */
export function saveAuthToken(token: string | null | undefined): void {
  if (!token) return;
  try {
    localStorage.setItem("token", token);
    localStorage.setItem("nolsaf_token", token);
  } catch {
    // localStorage unavailable in some mobile/WebView contexts — silently ignore.
  }
}

/** Remove auth token from localStorage on logout */
export function clearAuthToken(): void {
  _csrfToken = null;
  try {
    localStorage.removeItem("token");
    localStorage.removeItem("nolsaf_token");
    localStorage.removeItem("__Host-nolsaf_token");
  } catch {
    // localStorage unavailable in some mobile/WebView contexts — silently ignore.
  }
}

export default apiClient;
