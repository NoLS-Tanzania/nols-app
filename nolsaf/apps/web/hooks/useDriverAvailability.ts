"use client";

import { useEffect, useSyncExternalStore } from "react";

type DriverAvailabilitySnapshot = {
  available: boolean;
  loaded: boolean;
  loading: boolean;
  meId?: string | number;
};

let snapshot: DriverAvailabilitySnapshot = {
  available: false,
  loaded: false,
  loading: false,
  meId: undefined,
};

const listeners = new Set<() => void>();
let meIdPromise: Promise<string | number | undefined> | null = null;
let refreshPromise: Promise<boolean | null> | null = null;

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function setSnapshot(patch: Partial<DriverAvailabilitySnapshot>) {
  snapshot = { ...snapshot, ...patch };
  notifyListeners();
}

function broadcastAvailability(available: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(
      new CustomEvent("nols:availability:changed", {
        detail: { available, confirmed: true },
        bubbles: true,
        composed: true,
      } as any)
    );
  } catch {
    // ignore
  }
}

async function resolveMeId() {
  if (snapshot.meId !== undefined) return snapshot.meId;
  if (meIdPromise) return meIdPromise;

  meIdPromise = (async () => {
    try {
      const response = await fetch("/api/account/me", { credentials: "include" });
      if (!response.ok) return undefined;
      const payload = await response.json();
      const meId = payload?.id ?? payload?.data?.id;
      if (meId !== undefined) {
        snapshot = { ...snapshot, meId };
        notifyListeners();
      }
      return meId;
    } catch {
      return undefined;
    } finally {
      meIdPromise = null;
    }
  })();

  return meIdPromise;
}

export async function refreshDriverAvailability(force = false) {
  if (!force && refreshPromise) return refreshPromise;

  setSnapshot({ loading: true });
  refreshPromise = (async () => {
    try {
      const meId = await resolveMeId();
      if (meId === undefined) {
        setSnapshot({ available: false, loaded: true, loading: false });
        return null;
      }

      const response = await fetch("/api/driver/availability", { credentials: "include" });
      if (!response.ok) throw new Error(`Availability request failed: ${response.status}`);

      const data = await response.json();
      const available = Boolean(data?.available);
      setSnapshot({ available, loaded: true, loading: false, meId });
      return available;
    } catch {
      setSnapshot({ loaded: true, loading: false });
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export function setConfirmedDriverAvailability(available: boolean) {
  setSnapshot({ available, loaded: true, loading: false });
  broadcastAvailability(available);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return snapshot;
}

export default function useDriverAvailability() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    if (!state.loaded && !state.loading) {
      void refreshDriverAvailability();
    }
  }, [state.loaded, state.loading]);

  return {
    ...state,
    refreshAvailability: refreshDriverAvailability,
    setConfirmedAvailability: setConfirmedDriverAvailability,
  };
}