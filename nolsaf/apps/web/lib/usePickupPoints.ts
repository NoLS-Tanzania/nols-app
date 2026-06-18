"use client";

import { useEffect, useState } from "react";
import { TANZANIA_LOCATIONS, type TanzaniaLocation } from "./tanzania-locations";

type ApiItem = {
  id: string;
  label: string;
  shortLabel: string;
  city: string;
  lat: number;
  lng: number;
  category: TanzaniaLocation["category"];
  arrivalType: TanzaniaLocation["arrivalType"];
  iataCode?: string | null;
};

/**
 * Admin-managed pickup points for the web booking flow. Starts from the bundled
 * list so the UI never waits, then swaps to the live admin-managed list so any
 * add/edit/lock an admin makes is reflected here too.
 */
export function usePickupPoints(): TanzaniaLocation[] {
  const [points, setPoints] = useState<TanzaniaLocation[]>(TANZANIA_LOCATIONS);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/pickup-points", { headers: { Accept: "application/json" } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const items: ApiItem[] = data?.items || [];
        if (cancelled || items.length === 0) return;
        setPoints(
          items.map((p) => ({
            id: p.id,
            label: p.label,
            shortLabel: p.shortLabel,
            city: p.city,
            lat: Number(p.lat),
            lng: Number(p.lng),
            category: p.category,
            arrivalType: p.arrivalType,
            iataCode: p.iataCode || undefined,
          }))
        );
      })
      .catch(() => {
        // keep the bundled fallback
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return points;
}
