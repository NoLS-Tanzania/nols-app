/**
 * Shared axios client for owner/admin/driver portal API calls.
 *
 * Auth relies on secure cookies and same-origin rewrites. No bearer token is
 * read from browser storage or attached from client-side JavaScript.
 *
 * CSRF:
 *   1. Capture the X-CSRF-Token header the server sends on every GET response.
 *   2. Persist it to sessionStorage so it survives mobile JS context resets.
 *   3. Attach it on all state-changing requests.
 */
import axios from "axios";

const CSRF_SESSION_KEY = "nolsaf:csrf";

let csrfToken: string | null = null;

function readCsrfToken(): string | null {
  if (csrfToken) return csrfToken;
  try {
    return sessionStorage.getItem(CSRF_SESSION_KEY);
  } catch {
    return null;
  }
}

function writeCsrfToken(token: string): void {
  csrfToken = token;
  try {
    sessionStorage.setItem(CSRF_SESSION_KEY, token);
  } catch {
    // sessionStorage is not always available in mobile/WebView contexts.
  }
}

const MUTATION_METHODS = new Set(["post", "put", "patch", "delete"]);

const apiClient = axios.create({ baseURL: "", withCredentials: true });

apiClient.interceptors.request.use((config) => {
  config.headers = config.headers ?? {};

  if (MUTATION_METHODS.has((config.method ?? "").toLowerCase())) {
    const csrf = readCsrfToken();
    if (csrf) {
      config.headers["X-CSRF-Token"] = csrf;
    }
  }

  return config;
});

apiClient.interceptors.response.use((response) => {
  const csrfHeader = response.headers["x-csrf-token"];
  if (csrfHeader) {
    writeCsrfToken(String(csrfHeader));
  }
  return response;
});

export function saveAuthToken(token: string | null | undefined): void {
  void token;
}

export function clearAuthToken(): void {
  csrfToken = null;
  try {
    sessionStorage.removeItem(CSRF_SESSION_KEY);
  } catch {
    // ignore
  }
}

export default apiClient;
