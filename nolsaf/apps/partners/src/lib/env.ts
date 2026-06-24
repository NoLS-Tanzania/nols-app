// Mobile reads the API base URL from EXPO_PUBLIC_API_URL (see app/.env.local for
// local dev, the staging/production values for builds). configureApiClient is
// called once at startup in App.tsx with this value.
const rawApiUrl = process.env.EXPO_PUBLIC_API_URL ?? "";

export const env = {
  apiUrl: rawApiUrl.trim()
};
