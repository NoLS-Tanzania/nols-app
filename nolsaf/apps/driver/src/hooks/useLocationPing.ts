import { useIsFocused } from "@react-navigation/native";
import * as Location from "expo-location";
import { useEffect, useRef } from "react";

import { sendLocationPing } from "../driver/driverApi";

const PING_INTERVAL_MS = 10_000;

type UseLocationPingOptions = {
  enabled: boolean;
  tripId: number;
  token: string | null;
};

export function useLocationPing({ enabled, tripId, token }: UseLocationPingOptions) {
  const isFocused = useIsFocused();
  const tickingRef = useRef(false);

  useEffect(() => {
    if (!enabled || !isFocused || !token) return;

    const authToken = token;
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    async function pingOnce() {
      if (tickingRef.current) return;
      tickingRef.current = true;
      try {
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (cancelled) return;
        await sendLocationPing(authToken, {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          headingDeg: position.coords.heading ?? undefined,
          speedMps: position.coords.speed ?? undefined,
          accuracyM: position.coords.accuracy ?? undefined,
          transportBookingId: tripId
        });
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
}
