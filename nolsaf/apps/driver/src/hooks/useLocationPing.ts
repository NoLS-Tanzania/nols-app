import { useIsFocused } from "@react-navigation/native";
import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";

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
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);

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
        await sendLocationPing(authToken, {
          lat: current.coords.latitude,
          lng: current.coords.longitude,
          headingDeg: current.coords.heading ?? undefined,
          speedMps: current.coords.speed ?? undefined,
          accuracyM: current.coords.accuracy ?? undefined,
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

  return { position };
}
