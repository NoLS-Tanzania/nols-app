import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";
import * as TaskManager from "expo-task-manager";

import { sendLocationPing } from "../driver/driverApi";

export const LOCATION_TASK_NAME = "nolsaf-driver-active-trip-location";
const ACTIVE_TRIP_KEY = "nolsaf.driver.activeTripPing";

type ActiveTripCreds = { token: string; tripId: number };

async function readActiveTrip(): Promise<ActiveTripCreds | null> {
  try {
    const raw = await SecureStore.getItemAsync(ACTIVE_TRIP_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ActiveTripCreds>;
    if (!parsed.token || typeof parsed.tripId !== "number") return null;
    return { token: parsed.token, tripId: parsed.tripId };
  } catch {
    return null;
  }
}

// Registered at module load (imported from App.tsx) so the OS can invoke it even
// when the app is backgrounded or relaunched headlessly mid-trip.
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) return;
  const { locations } = (data ?? {}) as { locations?: Location.LocationObject[] };
  const latest = locations?.[locations.length - 1];
  if (!latest) return;

  const creds = await readActiveTrip();
  if (!creds) {
    // No active trip on record - stop draining the battery.
    await stopBackgroundLocation().catch(() => undefined);
    return;
  }

  try {
    await sendLocationPing(creds.token, {
      lat: latest.coords.latitude,
      lng: latest.coords.longitude,
      headingDeg: latest.coords.heading ?? undefined,
      speedMps: latest.coords.speed ?? undefined,
      accuracyM: latest.coords.accuracy ?? undefined,
      transportBookingId: creds.tripId
    });
  } catch {
    // best effort - the next location update retries
  }
});

export type StartBackgroundLocationResult = "started" | "foreground-only" | "denied";

/**
 * Starts OS-level location updates for an active trip. Returns:
 * - "started": background task is running and will ping even when backgrounded.
 * - "foreground-only": only foreground permission granted; caller should keep
 *   pinging from the in-app hook while the screen is open.
 * - "denied": no location permission; caller cannot track this trip.
 */
export async function startBackgroundLocation(creds: ActiveTripCreds): Promise<StartBackgroundLocationResult> {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== "granted") return "denied";

  // Persist creds so the headless task can authenticate its pings.
  await SecureStore.setItemAsync(ACTIVE_TRIP_KEY, JSON.stringify(creds), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
  });

  const background = await Location.requestBackgroundPermissionsAsync();
  if (background.status !== "granted") {
    return "foreground-only";
  }

  const alreadyRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => false);
  if (!alreadyRunning) {
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 10_000,
      distanceInterval: 25,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: "NoLSAF Driver - trip active",
        notificationBody: "Sharing your location with the passenger and dispatch.",
        notificationColor: "#02665e"
      }
    });
  }
  return "started";
}

export async function stopBackgroundLocation(): Promise<void> {
  try {
    const running = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => false);
    if (running) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }
  } finally {
    await SecureStore.deleteItemAsync(ACTIVE_TRIP_KEY).catch(() => undefined);
  }
}
