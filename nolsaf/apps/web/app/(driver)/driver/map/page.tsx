"use client";
import React, { useEffect, useState } from "react";
import DriverLiveMap from "@/components/DriverLiveMap";
import LiveMap from "@/components/LiveMap";
import { useSearchParams, useRouter } from 'next/navigation';

export default function DriverLiveMapPage() {
  const search = useSearchParams();
  const router = useRouter();
  const liveOnly = search?.get('live') === '1';

  const [showLiveOverlay, setShowLiveOverlay] = useState(false);

  useEffect(() => {
    if (!liveOnly) return;
    try {
      const raw = localStorage.getItem('driver_available');
      const available = raw === '1' || raw === 'true';
      if (!available) setShowLiveOverlay(true);
    } catch (e) {
      // ignore
    }
  }, [liveOnly]);

  return (
    <div className={liveOnly ? 'min-h-screen w-full' : 'space-y-6'}>
      {!liveOnly && (
        <div className="mx-auto max-w-3xl flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Live Map</h1>
        </div>
      )}

      <section className={liveOnly ? 'fixed inset-0 z-10' : 'mx-auto max-w-3xl bg-white rounded-lg p-4 border'}>
        <DriverLiveMap liveOnly={liveOnly} />
      </section>

      <LiveMap
        isOpen={showLiveOverlay}
        onClose={() => setShowLiveOverlay(false)}
        onGoToDashboard={() => { setShowLiveOverlay(false); router.push('/driver'); }}
      />
    </div>
  );
}
