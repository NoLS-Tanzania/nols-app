import { createSecureSession } from "@nolsaf/native-ui";

// Per app secure storage key. Reuses the shared SecureStore helper from
// @nolsaf/native-ui (no fork), with a Partners specific key so a Partners
// session never collides with the customer or driver apps on the same device.
export const { getStoredToken, storeToken, clearStoredToken } = createSecureSession("nolsaf_partners_token");
