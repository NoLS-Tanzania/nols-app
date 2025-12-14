"use client";

import React, { useEffect, useRef } from 'react';

type Pin = { id: string; name: string; lng: number; lat: number; slug: string };

type Props = {
  pins: Pin[];
  highlightedId?: string | null;
  onPinHover?: (id: string | null) => void;
  onPinClick?: (id: string) => void;
};

export default function CitiesMap({ pins, highlightedId, onPinHover, onPinClick }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any | null>(null);
  const mapboxRef = useRef<any | null>(null);
  const markerRefs = useRef<Record<string, HTMLElement>>({});

  useEffect(() => {
    // Ensure marker animations are disabled globally for this component
    const styleId = 'nols-citiesmap-disable-anim';
    if (!document.getElementById(styleId)) {
      const s = document.createElement('style');
      s.id = styleId;
      s.textContent = `
        .nols-pin, .nols-pin * { animation: none !important; -webkit-animation: none !important; }
        .nols-pin { transition: transform 150ms ease, box-shadow 150ms ease, opacity 150ms ease !important; }
      `;
      document.head.appendChild(s);
    }
    if (typeof window === 'undefined') return;

    const token =
      (process.env.NEXT_PUBLIC_MAPBOX_TOKEN as string) ||
      (process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN as string) ||
      (window as any).__MAPBOX_TOKEN ||
      '';

    if (!token) return;
    if (!containerRef.current) return;

    let map: any = null;
    (async () => {
      try {
        const mod = await import('mapbox-gl');
        const mapboxgl = (mod as any).default ?? mod;
        mapboxRef.current = mapboxgl;
        mapboxgl.accessToken = token;

        map = new mapboxgl.Map({
          container: containerRef.current as HTMLElement,
          style: 'mapbox://styles/mapbox/light-v10',
          center: [37.0, -2.0],
          zoom: 5,
          interactive: true,
        });
        mapRef.current = map;
        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

        // create markers
        pins.forEach((p) => {
          try {
            const btn = document.createElement('button');
            btn.className = 'nols-pin rounded-full border-2 border-white';
            btn.style.width = '14px';
            btn.style.height = '14px';
            btn.style.background = '#10b981';
            btn.style.cursor = 'pointer';
            btn.style.animation = 'none';
            btn.style.transition = 'transform 150ms ease, box-shadow 150ms ease, opacity 150ms ease';
            btn.setAttribute('aria-label', `Show ${p.name}`);
            btn.addEventListener('mouseenter', () => onPinHover?.(p.id));
            btn.addEventListener('mouseleave', () => onPinHover?.(null));
            btn.addEventListener('click', () => onPinClick?.(p.id));
            new mapboxgl.Marker({ element: btn }).setLngLat([p.lng, p.lat]).addTo(map);
            markerRefs.current[p.id] = btn;
          } catch (e) {
            // ignore
          }
        });
      } catch (e) {
        // ignore
      }
    })();

    return () => {
      try {
        if (map) map.remove();
      } catch (e) {
        // ignore
      }
      mapRef.current = null;
      markerRefs.current = {};
    };
  }, [pins, onPinHover, onPinClick]);

  // highlight marker when highlightedId changes
  useEffect(() => {
    Object.keys(markerRefs.current).forEach((k) => {
      const el = markerRefs.current[k];
      if (!el) return;
      // clear any animation that might have been applied elsewhere
      el.style.animation = 'none';
      if (k === highlightedId) {
        el.style.transform = 'scale(1.4)';
        el.style.boxShadow = '0 6px 18px rgba(16,185,129,0.35)';
        el.style.opacity = '1';
      } else {
        el.style.transform = 'scale(1)';
        el.style.boxShadow = '';
        el.style.opacity = '';
      }
    });
  }, [highlightedId]);

  return (
    <div className="relative w-full h-72 md:h-96 rounded-md overflow-hidden">
      <div ref={containerRef} className="absolute inset-0 z-20" />
      {/* static fallback (visible before map mounts / when token missing) */}
      <div className="absolute inset-0 z-10 bg-gradient-to-b from-sky-50 to-white flex flex-col items-center justify-center gap-3 pointer-events-none">
        <svg width="220" height="120" viewBox="0 0 220 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <rect width="220" height="120" rx="8" fill="#F8FAFC" />
          <circle cx="70" cy="60" r="4" fill="#10B981" />
          <text x="78" y="64" fontSize="10" fill="#0F172A">Tanzania</text>
          <circle cx="110" cy="50" r="4" fill="#10B981" />
          <text x="118" y="54" fontSize="10" fill="#0F172A">Kenya</text>
          <circle cx="150" cy="45" r="4" fill="#10B981" />
          <text x="158" y="49" fontSize="10" fill="#0F172A">Uganda</text>
        </svg>
      </div>
    </div>
  );
}
