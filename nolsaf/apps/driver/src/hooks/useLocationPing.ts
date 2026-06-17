import { useIsFocused } from "@react-navigation/native";
import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";

import { sendLocationPing } from "../driver/driverApi";
import { startBackgroundLocation, stopBackgroundLocation } from "../lib/backgroundLocationTask";

const PING_INTERVAL_MS = 10_000;

type UseLocationPingOptions = {
  enabled: boolean;
  tripId: number;
  token: string | null;
};

export function useLocationPing({ enabled, tripId, token }: UseLocationPingOptions) {
  const isFocused = useIsFocused();
  const tickingRef = useRef(false);
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  // True once the OS-level background task is sending pings, so the in-app
  // pinger stays UI-only and never double-reports the same fix.
  const backgroundActiveRef = useRef(false);

  // Continuity: keep location flowing even when the screen is unfocused or the
  // app is backgrounded mid-trip. Deliberately NOT gated on focus.
  useEffect(() => {
    if (!enabled || !token) return;
    let cancelled = false;
    const authToken = token;

    startBackgroundLocation({ token: authToken, tripId })
      .then((result) => {
        if (!cancelled) backgroundActiveRef.current = result === "started";
      })
      .catch(() => {
        if (!cancelled) backgroundActiveRef.current = false;
      });

    return () => {
      cancelled = true;
      backgroundActiveRef.current = false;
      void stopBackgroundLocation();
    };
  }, [enabled, tripId, token]);

  // UI position + foreground fallback. Gated on focus because the on-screen map
  // only needs live updates while the driver is looking at the trip. When the
  // background task is running it owns the network pings and we only refresh the
  // map here; when background permission was denied we ping from here instead.
  useEffect(() => {
    if (!enabled || !isFocused || !token) return;

    const authToken = token;
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    async function pingOnce() {
      if (tickingRef.current) return;
      tickingRef.current = true;
      try {
        const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (cancelled) return;
        setPosition({ lat: current.coords.latitude, lng: current.coords.longitude });
        if (!backgroundActiveRef.current) {
          await sendLocationPing(authToken, {
            lat: current.coords.latitude,
            lng: current.coords.longitude,
            headingDeg: current.coords.heading ?? undefined,
            speedMps: current.coords.speed ?? undefined,
            accuracyM: current.coords.accuracy ?? undefined,
            transportBookingId: tripId
          });
        }
      } catch {
        // best effort - skip this tick
      } finally {
        tickingRef.current = false;
      }
    }

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelled || status !== "granted") return;
      void pingOnce();
      intervalId = setInterval(pingOnce, PING_INTERVAL_MS);
    })();

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [enabled, isFocused, tripId, token]);

  return { position };
}
