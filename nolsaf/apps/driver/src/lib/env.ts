export const env = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? "",
  appUrl: process.env.EXPO_PUBLIC_APP_URL ?? "https://nolsaf.com",
  socketUrl: process.env.EXPO_PUBLIC_SOCKET_URL ?? "",
  // Fill in with a Mapbox public token from https://account.mapbox.com/access-tokens/ for Android maps.
  mapboxToken: process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? ""
};
