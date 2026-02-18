"use client";
import React, { useEffect, useState } from "react";
import { Map, MapPin, X, Loader } from 'lucide-react';
import DriverAvailabilitySwitch from './DriverAvailabilitySwitch';
import { useRouter } from "next/navigation";

type LiveMapProps = {
  isOpen: boolean;
  onClose: () => void;
  onGoToDashboard?: () => void;
};

type GeoPermission = 'unknown' | 'granted' | 'prompt' | 'denied' | 'unsupported';

export default function LiveMap({ isOpen, onClose, onGoToDashboard }: LiveMapProps) {
  const router = useRouter();
  const [permission, setPermission] = useState<GeoPermission>('unknown');
  const [requesting, setRequesting] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);
  const [available, setAvailable] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        const r = await fetch('/api/driver/availability', { credentials: 'include' });
        if (!r.ok) return;
        const data = await r.json();
        setAvailable(Boolean(data?.available));
      } catch {
        // ignore
      }
    })();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (typeof navigator === 'undefined') {
      setPermission('unsupported');
      return;
    }

    const run = async () => {
      try {
        // Permissions API may not be available on all browsers
        // Use navigator.permissions.query when present to read geolocation permission state
        const nav: any = navigator;
        if (nav.permissions && typeof nav.permissions.query === 'function') {
          const status = await nav.permissions.query({ name: 'geolocation' as PermissionName });
          const mapState = (s: any) => (s.state === 'granted' ? 'granted' : s.state === 'prompt' ? 'prompt' : s.state === 'denied' ? 'denied' : 'unknown');
          setPermission(mapState(status));
          // listen for changes
          const onChange = () => setPermission(mapState(status));
          try { status.addEventListener('change', onChange); } catch { try { (status as any).onchange = onChange; } catch {} }
        } else {
          // Permissions API missing — fallback to prompting probe or mark unsupported
          setPermission('unsupported');
        }
      } catch (e) {
        setPermission('unsupported');
      }
    };

    run();
  }, [isOpen]);

  // If the availability switch is toggled ON elsewhere, automatically open live map.
  useEffect(() => {
    const onAvail = (ev: any) => {
      try {
        const available = ev?.detail?.available;
        if (available) {
          setAvailable(true);
          // close modal then navigate to live map view
          onClose?.();
          if (onGoToDashboard) return onGoToDashboard();
          try { router.push('/driver?live=1'); } catch { /* ignore */ }
        }
      } catch (e) {}
    };
    try {
      window.addEventListener('nols:availability:changed', onAvail as EventListener);
    } catch (e) {}
    return () => {
      try { window.removeEventListener('nols:availability:changed', onAvail as EventListener); } catch (e) {}
    };
  }, [onClose, onGoToDashboard, router]);

  if (!isOpen) return null;

  const requestLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setPermission('unsupported');
      return;
    }
    setRequesting(true);
    setShowSpinner(true);
    navigator.geolocation.getCurrentPosition(
      () => {
        setPermission('granted');
        setRequesting(false);
        setShowSpinner(false);
      },
      (err) => {
        // If user denies, mark denied
        if (err && err.code === 1) setPermission('denied');
        setRequesting(false);
        setShowSpinner(false);
      },
      { timeout: 10000 }
    );
  };

  // availability is controlled by the `DriverAvailabilitySwitch` component; the red Go ONLINE button was removed


  const getPlatformSuggestion = () => {
    if (typeof navigator === 'undefined') return '';
    const ua = navigator.userAgent || '';
    if (/iPhone|iPad|iPod/i.test(ua)) {
      return 'On iOS: Open Settings → Safari (or the browser you use) → Location and set to "While Using the App".';
    }
    if (/Android/i.test(ua)) {
      return 'On Android Chrome: Open Chrome → Settings → Site settings → Location and allow location for this site.';
    }
    if (/FBAN|FBAV|Instagram|Twitter/i.test(ua)) {
      return 'You appear to be in an in-app browser. Open this page in your system browser to enable location permissions.';
    }
    return 'Check your browser settings to enable location access for this site.';
  };

  const permissionMessage = () => {
    switch (permission) {
      case 'granted':
        return 'Location access is enabled. Please turn the availability switch ON in your Dashboard to start the Live Map.';
      case 'prompt':
        return 'Location permission is needed. You can request it now; your browser will ask for permission.';
      case 'denied':
        return 'Location access is blocked. Please enable location permissions for this site in your browser settings.';
      case 'unsupported':
        return 'Geolocation is not available in this browser. Please enable device location services or use a supported browser.';
      default:
        return 'To use Live Map please enable device Location services and switch the system ON from your Dashboard.';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card w-full max-w-md z-20">
        <div className="card-section">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Map className="h-6 w-6" aria-hidden />
            </div>

            <div>
              <h3 className="text-lg font-semibold">Enable Live Map</h3>
              <p className="mt-2 text-sm text-gray-700">
                {available ? permissionMessage() : "You can't access Live Map due to OFFLINE"}
              </p>
            </div>

            {permission === 'granted' ? (
              <ul className="mt-1 text-sm text-gray-600 list-disc list-inside space-y-1">
                <li>Your device location is available.</li>
                <li>Turn the availability switch ON to start broadcasting your location.</li>
              </ul>
              ) : permission === 'prompt' ? (
                <div className="mt-3 text-center">
                  <p className="text-sm text-gray-600">Allow location access and turn your Availability switch ON to start Live Map.</p>
                </div>
            ) : permission === 'denied' ? (
              <div className="mt-1 text-sm text-gray-600">
                <div>Open your browser settings and allow location access for this site, then return here.</div>
                <div className="mt-2 text-xs text-gray-500">{getPlatformSuggestion()}</div>
              </div>
            ) : null}

            <div className="mt-4 w-full">
              <div className="flex items-center justify-center gap-6">
                <button onClick={onClose} aria-label="Close" className="px-3 py-2 rounded-md text-sm bg-gray-100 hover:bg-gray-200"><X className="h-4 w-4" /></button>

                <div className="flex flex-col items-center">
                  <div className="text-sm text-gray-600 mb-2">Availability</div>
                  <div className="bg-white p-2 rounded-full shadow">
                    <DriverAvailabilitySwitch />
                  </div>
                </div>

                {permission !== 'granted' ? (
                  <button onClick={requestLocation} disabled={requesting} aria-label="Request location" className="px-3 py-2 rounded-md text-sm bg-sky-600 text-white hover:bg-sky-700"><MapPin className="h-4 w-4" /></button>
                ) : (
                  <div className="w-6" />
                )}
              </div>
            </div>
          </div>
        </div>
        {showSpinner && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60">
              <Loader className="animate-spin h-8 w-8 text-sky-600" />
            </div>
        )}
      </div>
    </div>
  );
}
