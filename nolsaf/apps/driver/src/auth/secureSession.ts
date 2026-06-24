import { createSecureSession } from "@nolsaf/native-ui";

export const { getStoredToken, storeToken, clearStoredToken } = createSecureSession("nolsaf.driver.authToken");
