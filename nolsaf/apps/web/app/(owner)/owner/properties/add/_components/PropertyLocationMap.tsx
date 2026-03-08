"use client";

import { AlertCircle, CheckCircle2, MapPin, Navigation2 } from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";

export type PropertyLocationDetectionMeta = {
  source?: "gps" | "pin";
  accuracy?: number | null;
};

type PropertyLocationMapProps = {
  latitude: number;
  longitude: number;
  postcode?: string | null;
  onLocationDetected?: (lat: number, lng: number, meta?: PropertyLocationDetectionMeta) => void;
};

const COORD_EPSILON = 0.000001;
const MOBILE_BREAKPOINT = 768;

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

function shouldDeferInteractiveMap(): boolean {
  if (typeof window === "undefined") return false;
  const isNarrow = window.innerWidth < MOBILE_BREAKPOINT;
  const isCoarsePointer = typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
  return isNarrow || isCoarsePointer;
}

export const PropertyLocationMap = memo(function PropertyLocationMap({
  latitude,
  longitude,
  postcode,
  onLocationDetected,
}: PropertyLocationMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any | null>(null);
  const mapLoadedRef = useRef(false);
  const centerMarkerRef = useRef<HTMLDivElement | null>(null);
  const initStartedRef = useRef(false);
  const isDetectingLocationRef = useRef(false);
  const lastAppliedCenterRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastEmittedCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const onLocationDetectedRef = useRef(onLocationDetected);

  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [mapToken, setMapToken] = useState<string>("");
  const [tokenResolved, setTokenResolved] = useState(false);
  const [isInteractive, setIsInteractive] = useState(() => !shouldDeferInteractiveMap());
  const [mapReady, setMapReady] = useState(false);
  const [mapInitError, setMapInitError] = useState<string | null>(null);

  const requestRuntimeToken = useCallback(() => {
    let cancelled = false;
    const immediateToken = readImmediateToken();
    if (immediateToken) {
      setMapToken(immediateToken);
      setTokenResolved(true);
      return () => {
        cancelled = true;
      };
    }

    setTokenResolved(false);
    fetch("/config/map-token", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled) return;
        setMapToken(String(data?.token || ""));
      })
      .catch(() => {
        if (cancelled) return;
        setMapToken("");
      })
      .finally(() => {
        if (!cancelled) setTokenResolved(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    onLocationDetectedRef.current = onLocationDetected;
  }, [onLocationDetected]);

  useEffect(() => {
    isDetectingLocationRef.current = isDetectingLocation;
  }, [isDetectingLocation]);

  const pulseCenterPin = useCallback(() => {
    const el = centerMarkerRef.current;
    if (!el || typeof (el as any).animate !== "function") return;
    try {
      (el as any).animate(
        [
          { transform: "translate(-50%, -100%) scale(1)", filter: "drop-shadow(0 6px 14px rgba(2,102,94,0.10))" },
          { transform: "translate(-50%, -100%) scale(1.08)", filter: "drop-shadow(0 10px 22px rgba(2,102,94,0.20))" },
          { transform: "translate(-50%, -100%) scale(1)", filter: "drop-shadow(0 6px 14px rgba(2,102,94,0.10))" },
        ],
        { duration: 520, iterations: 2, easing: "cubic-bezier(.2,.8,.2,1)" }
      );
    } catch {
      // ignore
    }
  }, []);

  const emitLocation = useCallback((lat: number, lng: number, meta?: PropertyLocationDetectionMeta) => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const next = {
      lat: parseFloat(lat.toFixed(6)),
      lng: parseFloat(lng.toFixed(6)),
    };
    if (coordsEqual(lastEmittedCoordsRef.current, next)) return;
    lastEmittedCoordsRef.current = next;
    onLocationDetectedRef.current?.(next.lat, next.lng, meta);
  }, []);

  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }

    if (isDetectingLocationRef.current) return;

    setIsDetectingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = parseFloat(position.coords.latitude.toFixed(6));
        const lng = parseFloat(position.coords.longitude.toFixed(6));

        emitLocation(lat, lng, {
          source: "gps",
          accuracy: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
        });

        if (mapRef.current) {
          mapRef.current.flyTo({
            center: [lng, lat],
            zoom: 17,
            duration: 1500,
            essential: true,
          });
          setTimeout(() => pulseCenterPin(), 250);
        }

        setIsDetectingLocation(false);
      },
      (error) => {
        setIsDetectingLocation(false);
        let errorMsg = "Failed to get your location.";
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = "Location access denied. Please enable location permissions.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = "Location information unavailable.";
        } else if (error.code === error.TIMEOUT) {
          errorMsg = "Location request timed out.";
        }
        setLocationError(errorMsg);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [emitLocation, pulseCenterPin]);

  useEffect(() => {
    if (!isInteractive) return;
    return requestRuntimeToken();
  }, [isInteractive, requestRuntimeToken]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoadedRef.current) return;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return;

    const next = { lat: Number(latitude), lng: Number(longitude) };
    const current = map.getCenter();
    if (Math.abs(current.lat - next.lat) < COORD_EPSILON && Math.abs(current.lng - next.lng) < COORD_EPSILON) return;
    if (coordsEqual(lastAppliedCenterRef.current, next)) return;

    lastAppliedCenterRef.current = next;
    map.easeTo({ center: [next.lng, next.lat], duration: 700 });
  }, [latitude, longitude]);

  useEffect(() => {
    if (!isInteractive) return;
    const map = mapRef.current;
    if (!map || !mapLoadedRef.current) return;

    const resizeMap = () => {
      try {
        map.resize();
      } catch {
        // ignore
      }
    };

    resizeMap();
    const frame = window.requestAnimationFrame(resizeMap);
    const timeoutId = window.setTimeout(resizeMap, 180);
    window.addEventListener("resize", resizeMap);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeoutId);
      window.removeEventListener("resize", resizeMap);
    };
  }, [isInteractive, mapReady]);

  useEffect(() => {
    if (!isInteractive) return;
    if (typeof window === "undefined") return;
    const containerEl = containerRef.current;
    if (!containerEl || !mapToken) return;
    if (mapRef.current || initStartedRef.current) return;

    let cancelled = false;
    let map: any = null;
    initStartedRef.current = true;
    setMapInitError(null);
    setMapReady(false);
    mapLoadedRef.current = false;

    (async () => {
      try {
        const mod = await import("mapbox-gl");
        if (cancelled) return;
        const mapboxgl = (mod as any).default ?? mod;
        mapboxgl.accessToken = mapToken;

        const latNum = Number(latitude);
        const lngNum = Number(longitude);
        const hasValidCoords =
          Number.isFinite(latNum) &&
          Number.isFinite(lngNum) &&
          latNum >= -90 &&
          latNum <= 90 &&
          lngNum >= -180 &&
          lngNum <= 180;
        const isDefaultCoords =
          !hasValidCoords ||
          (latNum === 0 && lngNum === 0) ||
          (Math.abs(latNum) < 0.001 && Math.abs(lngNum) < 0.001);

        const fallbackLat = -6.7924;
        const fallbackLng = 39.2083;
        const exactLng = isDefaultCoords ? fallbackLng : lngNum;
        const exactLat = isDefaultCoords ? fallbackLat : latNum;

        if (!containerEl.isConnected) return;

        map = new mapboxgl.Map({
          container: containerEl,
          style: "mapbox://styles/mapbox/streets-v12",
          center: [exactLng, exactLat],
          zoom: isDefaultCoords ? 12 : 17,
          interactive: true,
        });

        try {
          map.dragRotate?.disable?.();
          map.touchZoomRotate?.disableRotation?.();
        } catch {
          // ignore
        }

        mapRef.current = map;

        map.on("error", (event: any) => {
          const message = event?.error?.message || "Unable to load the interactive map.";
          setMapInitError(message);
        });

        map.on("load", () => {
          mapLoadedRef.current = true;
          setMapReady(true);
          setMapInitError(null);
          try {
            map.resize();
            window.requestAnimationFrame(() => map.resize());
            window.setTimeout(() => map.resize(), 200);
          } catch {
            // ignore
          }

          map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

          const locateButton = document.createElement("button");
          locateButton.className = "mapboxgl-ctrl-icon mapboxgl-ctrl-locate";
          locateButton.type = "button";
          locateButton.setAttribute("aria-label", "Locate me");
          locateButton.setAttribute("title", "Locate me");
          locateButton.style.cssText = `
            width: 30px;
            height: 30px;
            background-color: #fff;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 0 2px rgba(0,0,0,0.1);
            transition: all 0.2s;
          `;

          const locateIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
          locateIcon.setAttribute("width", "18");
          locateIcon.setAttribute("height", "18");
          locateIcon.setAttribute("viewBox", "0 0 24 24");
          locateIcon.setAttribute("fill", "none");
          locateIcon.setAttribute("stroke", "#02665e");
          locateIcon.setAttribute("stroke-width", "2");
          locateIcon.setAttribute("stroke-linecap", "round");
          locateIcon.setAttribute("stroke-linejoin", "round");

          const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          circle.setAttribute("cx", "12");
          circle.setAttribute("cy", "12");
          circle.setAttribute("r", "10");

          const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          dot.setAttribute("cx", "12");
          dot.setAttribute("cy", "12");
          dot.setAttribute("r", "3");

          locateIcon.appendChild(circle);
          locateIcon.appendChild(dot);
          locateButton.appendChild(locateIcon);

          locateButton.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            detectLocation();
          });

          locateButton.addEventListener("mouseenter", () => {
            locateButton.style.backgroundColor = "#f0f9ff";
            locateButton.style.boxShadow = "0 0 0 2px rgba(2,102,94,0.2)";
          });

          locateButton.addEventListener("mouseleave", () => {
            locateButton.style.backgroundColor = "#fff";
            locateButton.style.boxShadow = "0 0 0 2px rgba(0,0,0,0.1)";
          });

          const locateControl = document.createElement("div");
          locateControl.className = "mapboxgl-ctrl mapboxgl-ctrl-group";
          locateControl.style.cssText = "margin: 10px;";
          locateControl.appendChild(locateButton);

          const topRight = map.getContainer().querySelector(".mapboxgl-ctrl-top-right");
          if (topRight) topRight.appendChild(locateControl);

          const centerMarkerContainer = document.createElement("div");
          centerMarkerContainer.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -100%);
            z-index: 1000;
            pointer-events: none;
            width: 40px;
            height: 50px;
            display: flex;
            align-items: flex-end;
            justify-content: center;
          `;

          const centerPin = document.createElementNS("http://www.w3.org/2000/svg", "svg");
          centerPin.setAttribute("width", "40");
          centerPin.setAttribute("height", "50");
          centerPin.setAttribute("viewBox", "0 0 24 24");
          centerPin.setAttribute("fill", "none");
          centerPin.style.display = "block";

          const pinPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
          pinPath.setAttribute("d", "M20 10c0 4.418-8 12-8 12s-8-7.582-8-12a8 8 0 1 1 16 0z");
          pinPath.setAttribute("fill", "#ef4444");
          pinPath.setAttribute("stroke", "#fff");
          pinPath.setAttribute("stroke-width", "1.5");

          const whiteCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          whiteCircle.setAttribute("cx", "12");
          whiteCircle.setAttribute("cy", "10");
          whiteCircle.setAttribute("r", "4");
          whiteCircle.setAttribute("fill", "#fff");

          centerPin.appendChild(pinPath);
          centerPin.appendChild(whiteCircle);
          centerMarkerContainer.appendChild(centerPin);

          const mapContainer = map.getContainer();
          mapContainer.style.position = "relative";
          mapContainer.appendChild(centerMarkerContainer);
          centerMarkerRef.current = centerMarkerContainer;

          const updateCenterCoordinates = () => {
            if (!map) return;
            const center = map.getCenter();
            emitLocation(center.lat, center.lng, { source: "pin" });
          };

          map.on("moveend", updateCenterCoordinates);

          setTimeout(() => pulseCenterPin(), 350);
        });
      } catch (error) {
        console.error("Error initializing map:", error);
        setMapInitError(error instanceof Error ? error.message : "Unable to initialize the map.");
        setMapReady(false);
        mapLoadedRef.current = false;
        initStartedRef.current = false;
      }
    })();

    return () => {
      cancelled = true;
      if (!mapRef.current) initStartedRef.current = false;
    };
  }, [detectLocation, emitLocation, isInteractive, latitude, longitude, mapToken, pulseCenterPin]);

  useEffect(() => {
    return () => {
      if (centerMarkerRef.current) {
        try {
          centerMarkerRef.current.remove();
        } catch {
          // ignore
        }
        centerMarkerRef.current = null;
      }
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch {
          // ignore
        }
        mapRef.current = null;
      }
      mapLoadedRef.current = false;
      setMapReady(false);
    };
  }, []);

  const hasCoords = Number.isFinite(latitude) && Number.isFinite(longitude);

  return (
    <div className="w-full">
      {!isInteractive ? (
        <div className="rounded-[24px] border border-slate-200/80 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.10),_transparent_24%),linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.94))] p-5 shadow-md shadow-slate-200/35">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 shadow-sm shadow-emerald-200/50">
              <Navigation2 className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-base font-semibold text-slate-900">Open the live map when you are ready to pin</div>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                On smaller devices the interactive canvas is deferred to keep the page fast. Open it only when you want to place the exact building pin.
              </p>
              <div className="mt-4 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-xs text-slate-600 shadow-sm shadow-slate-200/30">
                <div className="font-semibold uppercase tracking-[0.18em] text-slate-500">Current coordinates</div>
                <div className="mt-1 font-mono text-[13px] text-slate-900">
                  {hasCoords ? `${Number(latitude).toFixed(6)}, ${Number(longitude).toFixed(6)}` : "Not set"}
                </div>
                {postcode ? <div className="mt-1 text-slate-500">Postcode {postcode}</div> : null}
              </div>
              <button
                type="button"
                onClick={() => setIsInteractive(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-[#02665e] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#014f49]"
              >
                <MapPin className="h-4 w-4" />
                Open interactive map
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative">
          {!mapReady ? (
            <div className="absolute inset-0 z-[1] flex flex-col items-center justify-center gap-3 rounded-[24px] bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.12),_transparent_28%),linear-gradient(180deg,_rgba(248,250,252,0.98),_rgba(241,245,249,0.95))] px-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 shadow-sm shadow-emerald-200/60">
                <Navigation2 className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900">Preparing interactive map</div>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  {mapInitError
                    ? "The live map could not finish loading. Retry below or keep using the detected coordinates."
                    : "Loading map tiles and controls for exact pin placement."}
                </p>
              </div>
              {mapInitError ? (
                <button
                  type="button"
                  onClick={() => {
                    setMapInitError(null);
                    setMapToken("");
                    setTokenResolved(false);
                    setMapReady(false);
                    if (mapRef.current) {
                      try {
                        mapRef.current.remove();
                      } catch {
                        // ignore
                      }
                      mapRef.current = null;
                    }
                    mapLoadedRef.current = false;
                    initStartedRef.current = false;
                    requestRuntimeToken();
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                >
                  Retry map
                </button>
              ) : (
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
              )}
            </div>
          ) : null}
          <div
            ref={containerRef}
            className="w-full h-[380px] sm:h-[460px] min-h-[320px] rounded-[24px] overflow-hidden border border-slate-200/70 shadow-sm ring-1 ring-black/5 bg-slate-100"
          />
          <div className="absolute left-4 bottom-4 z-10 rounded-2xl border border-white/70 bg-white/88 backdrop-blur px-3.5 py-2.5 shadow-sm ring-1 ring-black/5">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Selected pin</div>
            <div className="mt-0.5 text-[12px] font-semibold text-slate-900 tabular-nums">
              {hasCoords ? `${Number(latitude).toFixed(6)}, ${Number(longitude).toFixed(6)}` : "Not set"}
            </div>
            <div className="mt-1 text-[10px] text-slate-500">Drag the map to move the pin.</div>
          </div>
          {isDetectingLocation && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[24px] bg-white/72 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#02665e] border-t-transparent" />
                <span className="text-sm font-medium text-[#02665e]">Detecting your location...</span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-2 space-y-1">
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
          <MapPin className="h-3.5 w-3.5 text-[#02665e]" />
          <span>
            {hasCoords
              ? `Selected: ${Number(latitude).toFixed(6)}, ${Number(longitude).toFixed(6)}`
              : 'No location set. Open the map and use "Locate Me" or drag to your property.'}
          </span>
          {postcode ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-[#02665e]">Postcode {postcode}</span> : null}
        </div>

        {locationError ? (
          <div className="flex items-center gap-1 text-xs text-rose-600">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>{locationError}</span>
          </div>
        ) : null}

        {!isDetectingLocation && hasCoords && mapReady ? (
          <div className="flex items-center gap-1 text-xs text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Map ready for exact pin placement</span>
          </div>
        ) : null}

        {isInteractive && tokenResolved && !mapToken ? (
          <div className="flex items-center gap-1 text-xs text-amber-700">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>Map token is not configured, so exact map pinning is unavailable right now.</span>
          </div>
        ) : null}
      </div>
    </div>
  );
});