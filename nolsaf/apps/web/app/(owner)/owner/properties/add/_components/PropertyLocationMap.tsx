"use client";

import { AlertCircle, CheckCircle2, LocateFixed, LocateOff, MapPin, X } from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";

export type PropertyLocationDetectionMeta = {
  source?: "gps" | "pin";
  accuracy?: number | null;
};

type PropertyLocationMapProps = {
  latitude: number;
  longitude: number;
  onLocationDetected?: (lat: number, lng: number, meta?: PropertyLocationDetectionMeta) => void;
};

const COORD_EPSILON = 0.000001;
const MOBILE_BREAKPOINT = 768;
const DEFAULT_CENTER = { lat: -6.7924, lng: 39.2083 };

function readImmediateToken(): string {
  if (typeof window === "undefined") return "";
  return (
    (process.env.NEXT_PUBLIC_MAPBOX_TOKEN as string) ||
    (process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN as string) ||
    (window as any).__MAPBOX_TOKEN ||
    ""
  );
}

function coordsEqual(a: { lat: number; lng: number } | null, b: { lat: number; lng: number }): boolean {
  if (!a) return false;
  return Math.abs(a.lat - b.lat) < COORD_EPSILON && Math.abs(a.lng - b.lng) < COORD_EPSILON;
}

function hasValidCoordinates(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function shouldDeferInteractiveMap(): boolean {
  if (typeof window === "undefined") return false;
  const isNarrow = window.innerWidth < MOBILE_BREAKPOINT;
  const isCoarsePointer = typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
  return isNarrow || isCoarsePointer;
}

export const PropertyLocationMap = memo(function PropertyLocationMap({
  latitude,
  longitude,
  onLocationDetected,
}: PropertyLocationMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any | null>(null);
  const onLocationDetectedRef = useRef(onLocationDetected);
  const lastAppliedCenterRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastEmittedCoordsRef = useRef<{ lat: number; lng: number } | null>(null);

  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [mapToken, setMapToken] = useState("");
  const [tokenResolved, setTokenResolved] = useState(false);
  const [isInteractive, setIsInteractive] = useState(() => !shouldDeferInteractiveMap());
  const [mapReady, setMapReady] = useState(false);
  const [mapInitError, setMapInitError] = useState<string | null>(null);

  useEffect(() => {
    onLocationDetectedRef.current = onLocationDetected;
  }, [onLocationDetected]);

  const emitLocation = useCallback((lat: number, lng: number, meta?: PropertyLocationDetectionMeta) => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const next = {
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
    };
    if (coordsEqual(lastEmittedCoordsRef.current, next)) return;
    lastEmittedCoordsRef.current = next;
    onLocationDetectedRef.current?.(next.lat, next.lng, meta);
  }, []);

  const requestRuntimeToken = useCallback(() => {
    let disposed = false;
    const controller = new AbortController();

    const immediateToken = readImmediateToken();
    if (immediateToken) {
      setMapToken(immediateToken);
      setTokenResolved(true);
      return () => {
        disposed = true;
        controller.abort();
      };
    }

    setTokenResolved(false);
    fetch("/config/map-token", { cache: "no-store", signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (disposed) return;
        setMapToken(String(data?.token || ""));
      })
      .catch((error) => {
        if (disposed || error?.name === "AbortError") return;
        setMapToken("");
      })
      .finally(() => {
        if (!disposed) setTokenResolved(true);
      });

    return () => {
      disposed = true;
      controller.abort();
    };
  }, []);

  const detectLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }

    // If previously denied, tell the user how to re-enable instead of silently failing
    if (locationDenied) {
      setLocationError("Location access is blocked. Please enable it in your browser settings, then try again.");
      return;
    }

    setIsDetectingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));

        emitLocation(lat, lng, {
          source: "gps",
          accuracy: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
        });

        if (mapRef.current) {
          mapRef.current.easeTo({
            center: [lng, lat],
            zoom: 17,
            duration: 800,
            essential: true,
          });
        }

        setLocationDenied(false);
        setIsDetectingLocation(false);
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setLocationDenied(true);
          setLocationError("Location access was denied. Open your browser site settings and allow location, then tap the button again.");
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setLocationError("Your location is currently unavailable. Try moving to an open area.");
        } else if (error.code === error.TIMEOUT) {
          setLocationError("Location request timed out. Tap again to retry.");
        } else {
          setLocationError("Could not get your location. Please try again.");
        }
        setIsDetectingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 30000,
      }
    );
  }, [emitLocation, locationDenied]);

  // Preload mapbox-gl in background while map is still closed, so the dynamic
  // import is already resolved by the time the user clicks "Open map".
  useEffect(() => {
    import("mapbox-gl").catch(() => {});
  }, []);

  useEffect(() => {
    if (!isInteractive) return;
    return requestRuntimeToken();
  }, [isInteractive, requestRuntimeToken]);

  useEffect(() => {
    if (!isInteractive || !tokenResolved || !mapToken) return;
    if (typeof window === "undefined") return;

    const containerEl = containerRef.current;
    if (!containerEl || mapRef.current) return;

    let disposed = false;
    let map: any = null;
    let handleLoad: (() => void) | null = null;
    let handleMoveEnd: (() => void) | null = null;
    let handleError: ((event: any) => void) | null = null;

    setMapInitError(null);
    setMapReady(false);

    try {
      containerEl.innerHTML = "";
    } catch {
      // ignore
    }

    (async () => {
      try {
        const mod = await import("mapbox-gl");
        if (disposed || !containerEl.isConnected) return;

        const mapboxgl = (mod as any).default ?? mod;
        mapboxgl.accessToken = mapToken;

        const initial = hasValidCoordinates(latitude, longitude)
          ? { lat: Number(latitude), lng: Number(longitude) }
          : DEFAULT_CENTER;

        map = new mapboxgl.Map({
          container: containerEl,
          style: "mapbox://styles/mapbox/streets-v11",
          center: [initial.lng, initial.lat],
          zoom: hasValidCoordinates(latitude, longitude) ? 16 : 12,
          attributionControl: false,
          antialias: false,
          fadeDuration: 0,
          maxTileCacheSize: 20,
          trackResize: false,
        });

        try {
          map.dragRotate?.disable?.();
          map.touchZoomRotate?.disableRotation?.();
          map.addControl(new mapboxgl.NavigationControl({ showCompass: false, visualizePitch: false }), "top-right");
        } catch {
          // ignore
        }

        // Fire ready as soon as the first frame is painted — tiles may still
        // be streaming in but the map is already visible and interactive.
        handleLoad = () => {
          if (disposed) return;
          setMapReady(true);
          setMapInitError(null);
          try { map.resize(); } catch { /* ignore */ }

          if (!hasValidCoordinates(latitude, longitude)) {
            if (typeof navigator !== "undefined" && navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  if (disposed || !map) return;
                  const lat = Number(pos.coords.latitude.toFixed(6));
                  const lng = Number(pos.coords.longitude.toFixed(6));
                  map.easeTo({ center: [lng, lat], zoom: 16, duration: 600, essential: true });
                  emitLocation(lat, lng, { source: "gps", accuracy: pos.coords.accuracy });
                },
                () => { emitLocation(initial.lat, initial.lng, { source: "pin" }); },
                { enableHighAccuracy: true, timeout: 6000, maximumAge: 120000 }
              );
            } else {
              emitLocation(initial.lat, initial.lng, { source: "pin" });
            }
          }
        };

        handleMoveEnd = () => {
          if (!map) return;
          const center = map.getCenter();
          emitLocation(center.lat, center.lng, { source: "pin" });
        };

        handleError = (event: any) => {
          if (disposed) return;
          setMapInitError(event?.error?.message || "Unable to initialize the map.");
        };

        // Use 'render' (first painted frame) instead of 'load' (all tiles fetched)
        // so the overlay disappears the moment the map surface appears.
        map.once("render", handleLoad);
        map.on("moveend", handleMoveEnd);
        map.on("error", handleError);
        mapRef.current = map;
      } catch (error) {
        if (disposed) return;
        setMapInitError(error instanceof Error ? error.message : "Unable to initialize the map.");
        setMapReady(false);
      }
    })();

    return () => {
      disposed = true;
      if (map) {
        try {
          if (handleLoad) map.off("render", handleLoad);
          if (handleMoveEnd) map.off("moveend", handleMoveEnd);
          if (handleError) map.off("error", handleError);
          map.remove();
        } catch {
          // ignore
        }
      }
      if (mapRef.current === map) mapRef.current = null;
      setMapReady(false);
    };
  }, [emitLocation, isInteractive, latitude, longitude, mapToken, tokenResolved]);

  useEffect(() => {
    if (!isInteractive || !mapReady || !mapRef.current) return;
    if (!hasValidCoordinates(latitude, longitude)) return;

    const map = mapRef.current;
    const next = { lat: Number(latitude), lng: Number(longitude) };
    const current = map.getCenter();

    if (coordsEqual(lastAppliedCenterRef.current, next)) return;
    if (Math.abs(current.lat - next.lat) < COORD_EPSILON && Math.abs(current.lng - next.lng) < COORD_EPSILON) return;

    lastAppliedCenterRef.current = next;
    map.easeTo({ center: [next.lng, next.lat], duration: 500, essential: true });
  }, [isInteractive, latitude, longitude, mapReady]);

  useEffect(() => {
    if (!isInteractive || !mapReady || !mapRef.current) return;

    const map = mapRef.current;
    const handleResize = () => {
      window.requestAnimationFrame(() => {
        try {
          map.resize();
        } catch {
          // ignore
        }
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isInteractive, mapReady]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch {
          // ignore
        }
        mapRef.current = null;
      }
    };
  }, []);

  const hasCoords = hasValidCoordinates(latitude, longitude);

  return (
    <div className="w-full">
      {!isInteractive ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm">
          {/* Top accent bar */}
          <div className="h-1 w-full bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600" />

          <div className="p-4">
            {/* Header row */}
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                <LocateFixed className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900">Property location</div>
                <div className="text-[11px] text-slate-400">Drag the pin or detect via GPS</div>
              </div>
              {/* Coordinate badge */}
              {hasCoords ? (
                <div className="ml-auto shrink-0 flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 ring-1 ring-emerald-100">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  <span className="font-mono text-[10px] font-semibold text-emerald-700 tabular-nums">
                    {Number(latitude).toFixed(4)}, {Number(longitude).toFixed(4)}
                  </span>
                </div>
              ) : (
                <div className="ml-auto shrink-0 rounded-full bg-slate-100 px-2.5 py-1">
                  <span className="text-[10px] font-medium text-slate-400">No pin set</span>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsInteractive(true)}
                className="flex items-center justify-center gap-2 rounded-xl bg-[#02665e] py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#014f49] active:scale-[0.98]"
              >
                <MapPin className="h-3.5 w-3.5" />
                Open map
              </button>
              <button
                type="button"
                onClick={detectLocation}
                disabled={isDetectingLocation}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 active:scale-[0.98] disabled:opacity-50"
              >
                <LocateFixed className={`h-3.5 w-3.5 ${isDetectingLocation ? "animate-spin text-emerald-600" : ""}`} />
                {isDetectingLocation ? "Locating…" : "My location"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Header — outside and above the map */}
          <div className="flex items-center gap-2 px-1">
            <LocateFixed className="h-4 w-4 shrink-0 text-emerald-600" />
            <p className="text-[12px] font-medium text-slate-600">
              Move the map so the blue pin sits exactly on your property entrance, then close.
            </p>
          </div>

        <div className="relative overflow-hidden rounded-[24px] border border-slate-200/70 shadow-sm ring-1 ring-black/5">
          <div
            ref={containerRef}
            className="h-[380px] min-h-[320px] w-full bg-slate-100 sm:h-[460px]"
          />

          {/* Blue transparent location circle — sits at exact map center */}
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
            <div className="relative flex items-center justify-center">
              {/* Outer pulse ring */}
              <div className="absolute h-16 w-16 animate-ping rounded-full bg-blue-400/20" />
              {/* Mid translucent circle */}
              <div className="absolute h-12 w-12 rounded-full bg-blue-400/25 ring-2 ring-blue-400/40" />
              {/* Inner solid dot */}
              <div className="relative h-4 w-4 rounded-full bg-blue-500 shadow-md ring-2 ring-white/90" />
            </div>
          </div>

          {/* Detecting location overlay */}
          {isDetectingLocation ? (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30 backdrop-blur-[3px]">
              <div className="flex flex-col items-center gap-3 rounded-2xl bg-white px-10 py-7 shadow-2xl">
                {/* Fast spinning arc ring */}
                <div className="relative h-12 w-12">
                  <svg className="absolute inset-0 animate-spin" style={{ animationDuration: "0.7s" }} viewBox="0 0 48 48" fill="none">
                    <circle cx="24" cy="24" r="20" stroke="#e2f5ef" strokeWidth="4" />
                    <path d="M24 4 a20 20 0 0 1 20 20" stroke="#10b981" strokeWidth="4" strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <LocateFixed className="h-5 w-5 text-emerald-600" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-[13px] font-semibold tracking-tight text-slate-900">Detecting location</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">Pinpointing your exact position…</p>
                </div>
                {/* Fast running bar */}
                <div className="h-0.5 w-24 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full w-8 animate-[shimmer_0.9s_ease-in-out_infinite] rounded-full bg-emerald-500" />
                </div>
              </div>
            </div>
          ) : null}

          <div className="absolute left-3 top-3 z-10 flex gap-2">
            <button
              type="button"
              onClick={detectLocation}
              disabled={isDetectingLocation}
              title={locationDenied ? "Location blocked — tap for instructions" : "Use my current location"}
              aria-label="Use current location"
              className={[
                "inline-flex items-center gap-1.5 rounded-full py-1.5 pl-2 pr-3 text-[11px] font-semibold shadow backdrop-blur-sm transition hover:shadow-md disabled:opacity-50",
                locationDenied
                  ? "border border-amber-200 bg-white/90 text-amber-700 hover:bg-white"
                  : "border border-emerald-100 bg-white/90 text-emerald-700 hover:bg-white",
              ].join(" ")}
            >
              {locationDenied
                ? <LocateOff className="h-3.5 w-3.5 shrink-0" />
                : <LocateFixed className={`h-3.5 w-3.5 shrink-0 ${isDetectingLocation ? "animate-spin" : ""}`} />}
              {isDetectingLocation ? "Locating…" : locationDenied ? "Enable location" : "My location"}
            </button>
            <button
              type="button"
              onClick={() => setIsInteractive(false)}
              title="Close map"
              aria-label="Close map"
              className="inline-flex items-center gap-1.5 rounded-full border border-rose-100 bg-white/90 py-1.5 pl-2 pr-3 text-[11px] font-semibold text-rose-600 shadow backdrop-blur-sm transition hover:bg-white hover:shadow-md"
            >
              <X className="h-3.5 w-3.5 shrink-0" />
              Close
            </button>
          </div>

          <div className="absolute bottom-3 left-3 right-12 z-10">
            {hasCoords ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-white/95 py-1.5 pl-2 pr-4 shadow-md backdrop-blur">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <CheckCircle2 className="h-3 w-3" />
                </div>
                <span className="font-mono text-[11px] font-semibold text-slate-800 tabular-nums">
                  {Number(latitude).toFixed(5)}, {Number(longitude).toFixed(5)}
                </span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/95 py-1.5 pl-2 pr-4 shadow-md backdrop-blur">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-500">
                  <MapPin className="h-3 w-3" />
                </div>
                <span className="text-[11px] text-slate-500">Drag map or tap <span className="font-semibold text-emerald-600">My location</span></span>
              </div>
            )}
          </div>

          {/* Compact attribution icon — always visible, expands on hover */}
          <div className="group absolute bottom-2 right-2 z-10">
            <button
              type="button"
              aria-label="Map attribution"
              className="flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-[10px] font-bold text-slate-500 shadow-sm ring-1 ring-black/10 backdrop-blur transition hover:bg-white hover:text-slate-800"
            >
              ©
            </button>
            <div className="pointer-events-none absolute bottom-6 right-0 min-w-max rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] leading-snug text-slate-600 opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100">
              © <a href="https://www.mapbox.com/about/maps/" target="_blank" rel="noreferrer" className="underline hover:text-slate-900">Mapbox</a>
              {" · "}
              © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline hover:text-slate-900">OpenStreetMap</a>
              {" · "}
              <a href="https://www.mapbox.com/map-feedback/" target="_blank" rel="noreferrer" className="underline hover:text-slate-900">Improve this map</a>
            </div>
          </div>

          {!mapReady && !mapInitError ? (
            <div className="pointer-events-none absolute inset-x-0 top-0 z-[11] h-1 overflow-hidden bg-slate-100">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-emerald-400 opacity-80" />
            </div>
          ) : null}
          {mapInitError ? (
            <div className="absolute inset-0 z-[11] flex flex-col items-center justify-center gap-2 bg-white/80 px-6 text-center backdrop-blur-sm">
              <AlertCircle className="h-6 w-6 text-rose-500" />
              <p className="text-xs text-slate-600">{mapInitError}</p>
            </div>
          ) : null}
        </div>
        </div>
      )}

      {/* Below-map summary — location error or token warning only */}
      <div className="mt-2 space-y-1">
        {locationError ? (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
            <span>{locationError}</span>
          </div>
        ) : null}

        {isInteractive && tokenResolved && !mapToken ? (
          <div className="flex items-center gap-1 text-xs text-amber-700">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>Map token is not configured, so live pinning is unavailable right now.</span>
          </div>
        ) : null}
      </div>
    </div>
  );
});