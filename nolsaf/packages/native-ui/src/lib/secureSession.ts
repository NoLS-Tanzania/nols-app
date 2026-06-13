import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

function getWebStorage() {
  if (Platform.OS !== "web" || typeof window === "undefined") {
    return null;
  }
  return window.localStorage;
}

/** Creates a secure-session helper bound to a per-app storage key. */
export function createSecureSession(tokenKey: string) {
  async function getStoredToken() {
    const storage = getWebStorage();
    if (storage) {
      return storage.getItem(tokenKey);
    }
    return SecureStore.getItemAsync(tokenKey);
  }

  async function storeToken(token: string) {
    const storage = getWebStorage();
    if (storage) {
      storage.setItem(tokenKey, token);
      return;
    }

    await SecureStore.setItemAsync(tokenKey, token, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
    });
  }

  async function clearStoredToken() {
    const storage = getWebStorage();
    if (storage) {
      storage.removeItem(tokenKey);
      return;
    }

    await SecureStore.deleteItemAsync(tokenKey);
  }

  return { getStoredToken, storeToken, clearStoredToken };
}
