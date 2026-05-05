/**
 * Shared axios client for all owner/admin/driver portal API calls.
 *
 * Why Bearer token?  Auth cookies are set on the Express API domain (Render).
 * The browser is on the Vercel domain — it never received those cookies, so
 * it can't send them back to Vercel's rewrite proxy.  The token is also stored
 * in localStorage (key: "token"), so we attach it as Authorization: Bearer on
 * every request.  The Express requireAuth middleware checks this header first.
 */
import axios from "axios";

function getStoredToken(): string | null {
  if (typeof localStorage === "undefined") return null;
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("nolsaf_token") ||
    localStorage.getItem("__Host-nolsaf_token") ||
    null
  );
}

const apiClient = axios.create({ baseURL: "", withCredentials: true });

apiClient.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
