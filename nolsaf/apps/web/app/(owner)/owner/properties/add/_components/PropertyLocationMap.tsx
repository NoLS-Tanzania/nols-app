"use client";
// v2
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
  const initLatRef = useRef(latitude);
  const initLngRef = useRef(longitude);

  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [mapToken, setMapToken] = useState("");
  const [tokenResolved, setTokenResolved] = useState(false);

  // isOpen: whether the map panel is currently visible (toggles freely).
  // hasInitialized: sticky true once opened at least once. The map canvas stays
  // in the DOM after hasInitialized — only CSS display changes. This avoids
  // destroying/recreating the WebGL context on every open/close (the cause of
  // crashes and high CPU drain).
  // Always start closed — the map only opens when the user taps "Open map".
  const [isOpen, setIsOpen] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  const [mapReady, setMapReady] = useState(false);
  const [mapInitError, setMapInitError] = useState<string | null>(null);
  const [locationDetected, setLocationDetected] = useState<{ accuracy: number | null } | null>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        const acc = Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null;
        setLocationDetected({ accuracy: acc });
        if (successTimerRef.current) clearTimeout(successTimerRef.current);
        successTimerRef.current = setTimeout(() => setLocationDetected(null), 10000);
      },
      (error) => {
        if (hasValidCoordinates(latitude, longitude) && error.code !== error.PERMISSION_DENIED) {
          setLocationError(null);
          setLocationDetected((current) => current ?? { accuracy: null });
          setIsDetectingLocation(false);
          return;
        }

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
  }, [emitLocation, latitude, locationDenied, longitude]);

  const openMap = useCallback(() => {
    setHasInitialized(true);
    setIsOpen(true);
  }, []);

  const closeMap = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Preload mapbox-gl in background so the dynamic import is already resolved
  // by the time the user taps "Open map".
  useEffect(() => {
    import("mapbox-gl").catch(() => {});
  }, []);

  // Auto-trigger GPS detection on first mount so the user doesn't have to
  // tap anything — location pinpoints automatically.
  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      detectLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch token as soon as the map panel is first opened.
  useEffect(() => {
    if (!hasInitialized) return;
    return requestRuntimeToken();
  }, [hasInitialized, requestRuntimeToken]);

  // Map init — runs ONCE when hasInitialized becomes true and token is ready.
  // The map is NEVER removed on close; only the CSS display changes.
  // This is the same pattern used by the driver live map.
  useEffect(() => {
    if (!hasInitialized || !tokenResolved || !mapToken) return;
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

    try { containerEl.innerHTML = ""; } catch { /* ignore */ }

    (async () => {
      try {
        const mod = await import("mapbox-gl");
        if (disposed || !containerEl.isConnected) return;

        const mapboxgl = (mod as any).default ?? mod;
        mapboxgl.accessToken = mapToken;

        const initial = hasValidCoordinates(initLatRef.current, initLngRef.current)
          ? { lat: Number(initLatRef.current), lng: Number(initLngRef.current) }
          : DEFAULT_CENTER;

        map = new mapboxgl.Map({
          container: containerEl,
          style: "mapbox://styles/mapbox/streets-v11",
          center: [initial.lng, initial.lat],
          zoom: hasValidCoordinates(initLatRef.current, initLngRef.current) ? 16 : 12,
          attributionControl: false,
          antialias: false,
          fadeDuration: 0,
          maxTileCacheSize: 40,
          trackResize: false,
          preserveDrawingBuffer: false,
          maxCanvasSize: [4096, 4096] as [number, number],
        });

        try {
          map.dragRotate?.disable?.();
          map.touchZoomRotate?.disableRotation?.();
          map.addControl(new mapboxgl.NavigationControl({ showCompass: false, visualizePitch: false }), "top-right");
        } catch { /* ignore */ }

        handleLoad = () => {
          if (disposed) return;
          setMapReady(true);
          setMapInitError(null);
          try { map.resize(); } catch { /* ignore */ }

          if (!hasValidCoordinates(initLatRef.current, initLngRef.current)) {
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

    // Do NOT call map.remove() here — the map stays alive when the panel closes.
    // Cleanup only on component unmount (see the effect below).
    return () => { disposed = true; };
    // latitude/longitude excluded — initLatRef/initLngRef capture the initial
    // values; subsequent updates use the easeTo effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emitLocation, hasInitialized, mapToken, tokenResolved]);

  // When the panel re-opens, the canvas had display:none — resize restores it.
  useEffect(() => {
    if (!isOpen || !mapReady || !mapRef.current) return;
    const raf = requestAnimationFrame(() => {
      try { mapRef.current?.resize(); } catch { /* ignore */ }
    });
    return () => cancelAnimationFrame(raf);
  }, [isOpen, mapReady]);

  // Sync external coord prop changes to the map center.
  useEffect(() => {
    if (!isOpen || !mapReady || !mapRef.current) return;
    if (!hasValidCoordinates(latitude, longitude)) return;

    const map = mapRef.current;
    const next = { lat: Number(latitude), lng: Number(longitude) };
    const current = map.getCenter();

    if (coordsEqual(lastAppliedCenterRef.current, next)) return;
    if (Math.abs(current.lat - next.lat) < COORD_EPSILON && Math.abs(current.lng - next.lng) < COORD_EPSILON) return;

    lastAppliedCenterRef.current = next;
    map.easeTo({ center: [next.lng, next.lat], duration: 500, essential: true });
  }, [isOpen, latitude, longitude, mapReady]);

  // Window resize -> map resize.
  useEffect(() => {
    if (!isOpen || !mapReady || !mapRef.current) return;

    const map = mapRef.current;
    const handleResize = () => {
      window.requestAnimationFrame(() => {
        try { map.resize(); } catch { /* ignore */ }
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isOpen, mapReady]);

  // Unmount cleanup — the ONLY place map.remove() is called.
  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      if (mapRef.current) {
        try { mapRef.current.remove(); } catch { /* ignore */ }
        mapRef.current = null;
      }
    };
  }, []);

  const hasCoords = hasValidCoordinates(latitude, longitude);

  useEffect(() => {
    if (hasCoords && locationError && !locationDenied) {
      setLocationError(null);
    }
  }, [hasCoords, locationDenied, locationError]);

  return (
    <div className="w-full">
      {/* Closed card — shown when map panel is not open */}
      {!isOpen && (
        <div className="overflow-hidden rounded-2xl shadow-[0_4px_24px_-6px_rgba(2,102,94,0.28)]" style={{ border: "1.5px solid #02665e22" }}>

          {/* ── Header: solid brand + dot-grid overlay ── */}
          <div
            className="relative px-4 py-4 flex items-center gap-3"
            style={{
              background: "#02665e",
              backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.13) 1.5px, transparent 1.5px)",
              backgroundSize: "18px 18px",
            }}
          >
            {/* Subtle right-side highlight glow */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[rgba(255,255,255,0.06)]" />

            {/* Icon box */}
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white ring-1 ring-white/25 backdrop-blur-sm">
              {isDetectingLocation ? (
                <svg className="animate-spin h-5 w-5" style={{ animationDuration: "0.75s" }} viewBox="0 0 48 48" fill="none">
                  <circle cx="24" cy="24" r="20" stroke="rgba(255,255,255,0.25)" strokeWidth="5" />
                  <path d="M24 4 a20 20 0 0 1 20 20" stroke="white" strokeWidth="5" strokeLinecap="round" />
                </svg>
              ) : (
                <LocateFixed className="h-5 w-5" />
              )}
            </div>

            {/* Title */}
            <div className="relative flex-1 min-w-0">
              <p className="text-[14px] font-extrabold text-white tracking-tight leading-tight">Property location</p>
            </div>

            {/* Right status badge */}
            <div className="relative shrink-0">
              {isDetectingLocation ? (
                <div className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 ring-1 ring-white/20">
                  <div className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                  <span className="text-[11px] font-semibold text-white">Locating</span>
                </div>
              ) : hasCoords ? (
                <div className="flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 shadow-sm">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#02665e]" />
                  <span className="font-mono text-[10px] font-bold text-[#02665e] tabular-nums">
                    {Number(latitude).toFixed(4)}, {Number(longitude).toFixed(4)}
                  </span>
                </div>
              ) : locationDenied ? (
                <div className="flex items-center gap-1.5 rounded-full bg-amber-400 px-2.5 py-1 shadow-sm">
                  <LocateOff className="h-3.5 w-3.5 text-white" />
                  <span className="text-[10px] font-bold text-white">Blocked</span>
                </div>
              ) : null}
            </div>
          </div>

          {/* ── Body ── */}
          <div className="bg-white p-4 space-y-3">

            {/* Primary GPS button */}
            <button
              type="button"
              onClick={detectLocation}
              disabled={isDetectingLocation}
              className={[
                "flex w-full items-center justify-center gap-2.5 rounded-xl py-3.5 text-[13px] font-bold tracking-wide transition-all active:scale-[0.98] disabled:opacity-60",
                locationDenied
                  ? "border-2 border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100 shadow-[0_2px_10px_-2px_rgba(245,158,11,0.35)]"
                  : "bg-[#02665e] text-white hover:bg-[#024f49] shadow-[0_4px_16px_-4px_rgba(2,102,94,0.55)]",
              ].join(" ")}
            >
              {isDetectingLocation ? (
                <>
                  <svg className="animate-spin h-4 w-4" style={{ animationDuration: "0.75s" }} viewBox="0 0 48 48" fill="none">
                    <circle cx="24" cy="24" r="20" stroke="rgba(255,255,255,0.25)" strokeWidth="5" />
                    <path d="M24 4 a20 20 0 0 1 20 20" stroke="white" strokeWidth="5" strokeLinecap="round" />
                  </svg>
                  Detecting location…
                </>
              ) : locationDenied ? (
                <><LocateOff className="h-4 w-4" /> Enable location access</>
              ) : hasCoords ? (
                <><LocateFixed className="h-4 w-4" /> Refresh my location</>
              ) : (
                <><LocateFixed className="h-4 w-4" /> Detect my location</>
              )}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-[#02665e]/12" />
              <span className="text-[10px] font-semibold text-[#02665e]/50 uppercase tracking-widest">or</span>
              <div className="flex-1 h-px bg-[#02665e]/12" />
            </div>

            {/* Secondary: Open map */}
            <button
              type="button"
              onClick={openMap}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[12px] font-semibold text-[#02665e] transition-all active:scale-[0.98]"
              style={{ border: "1.5px solid rgba(2,102,94,0.22)", background: "rgba(2,102,94,0.04)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(2,102,94,0.09)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(2,102,94,0.04)"; }}
            >
              <MapPin className="h-3.5 w-3.5" />
              Place pin manually on map
            </button>

            {hasCoords ? (
              <div className="rounded-xl border border-[#02665e]/18 bg-[#02665e]/[0.045] px-3.5 py-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#02665e] text-white shadow-sm">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[12px] font-extrabold text-[#02665e]">Location saved</p>
                      <span className="rounded-full bg-white px-2.5 py-1 font-mono text-[10px] font-bold text-[#02665e] shadow-sm ring-1 ring-[#02665e]/10 tabular-nums">
                        {Number(latitude).toFixed(6)}, {Number(longitude).toFixed(6)}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                      Use these coordinates if they match the property. Open the map only if you need to adjust the pin.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Success / accuracy warning banner */}
            {locationDetected ? (() => {
              const acc = locationDetected.accuracy;
              const isPoor = acc !== null && acc > 100;
              return isPoor ? (
                <div className="flex items-start gap-3 rounded-xl px-3.5 py-3.5" style={{ background: "#fef3c7", border: "2px solid #f59e0b" }}>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full shadow-md" style={{ background: "#f59e0b" }}>
                    <AlertCircle className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-extrabold" style={{ color: "#92400e" }}>Weak GPS signal</p>
                    <p className="mt-0.5 text-[11.5px] leading-relaxed font-medium" style={{ color: "#78350f" }}>
                      ~{Math.round(acc!)} m margin of error. Step outside or use the map to place the pin precisely.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-xl px-3.5 py-3" style={{ background: "rgba(2,102,94,0.06)", border: "1.5px solid rgba(2,102,94,0.2)" }}>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#02665e] shadow-sm">
                    <CheckCircle2 className="h-4 w-4 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-bold text-[#02665e]">Location pinned!</p>
                    <p className="mt-0.5 text-[11px] text-[#02665e]/70">
                      {acc !== null ? `Within ~${Math.round(acc)} m — excellent signal` : "Coordinates saved successfully"}
                    </p>
                  </div>
                </div>
              );
            })() : null}

            {/* Location error */}
            {locationError && !hasCoords ? (
              <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                <p className="text-[11px] leading-relaxed text-rose-700">{locationError}</p>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Map panel — kept in DOM once hasInitialized (display:none when closed).
          This preserves the WebGL context across open/close cycles. */}
      <div style={{ display: hasInitialized ? (isOpen ? "block" : "none") : "none" }}>
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <LocateFixed className="h-4 w-4 shrink-0 text-emerald-600" />
            <p className="text-[12px] font-medium text-slate-600">
              Move the map so the blue pin sits exactly on your property entrance, then close.
            </p>
          </div>

          <div className="relative overflow-hidden rounded-[24px] border border-slate-200/70 shadow-sm ring-1 ring-black/5">
            <div
              ref={containerRef}
              className="w-full bg-slate-100"
              style={{ height: 380, minHeight: 320, maxHeight: 460 }}
            />

            {/* Blue location indicator at map center */}
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
              <div className="relative flex items-center justify-center">
                <div className="absolute h-12 w-12 rounded-full bg-blue-400/25 ring-2 ring-blue-400/40" />
                <div className="relative h-4 w-4 rounded-full bg-blue-500 shadow-md ring-2 ring-white/90" />
              </div>
            </div>

            {/* GPS detecting overlay */}
            {isDetectingLocation ? (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30 backdrop-blur-[3px]">
                <div className="flex flex-col items-center gap-3 rounded-2xl bg-white px-10 py-7 shadow-2xl">
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
                    <p className="mt-0.5 text-[11px] text-slate-400">Pinpointing your exact position...</p>
                  </div>
                  <div className="h-0.5 w-24 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full w-8 animate-[shimmer_0.9s_ease-in-out_infinite] rounded-full bg-emerald-500" />
                  </div>
                </div>
              </div>
            ) : null}

            {/* Controls — top-left */}
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
                {isDetectingLocation ? "Locating..." : locationDenied ? "Enable location" : "My location"}
              </button>
              <button
                type="button"
                onClick={closeMap}
                title="Close map"
                aria-label="Close map"
                className="inline-flex items-center gap-1.5 rounded-full border border-rose-100 bg-white/90 py-1.5 pl-2 pr-3 text-[11px] font-semibold text-rose-600 shadow backdrop-blur-sm transition hover:bg-white hover:shadow-md"
              >
                <X className="h-3.5 w-3.5 shrink-0" />
                Close
              </button>
            </div>

            {/* Coordinate pill — bottom-left */}
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

            {/* Compact attribution */}
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

            {/* Thin static loading bar — gone as soon as first frame paints */}
            {!mapReady && !mapInitError ? (
              <div className="pointer-events-none absolute inset-x-0 top-0 z-[11] h-0.5 bg-emerald-400/60" />
            ) : null}

            {mapInitError ? (
              <div className="absolute inset-0 z-[11] flex flex-col items-center justify-center gap-2 bg-white/80 px-6 text-center backdrop-blur-sm">
                <AlertCircle className="h-6 w-6 text-rose-500" />
                <p className="text-xs text-slate-600">{mapInitError}</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Below-map messages (map panel only) */}
      <div className="mt-2 space-y-1">
        {hasInitialized && tokenResolved && !mapToken ? (
          <div className="flex items-center gap-1 text-xs text-amber-700">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>Map token is not configured, so live pinning is unavailable right now.</span>
          </div>
        ) : null}
      </div>
    </div>
  );
});
