"use client";
import React, { useEffect, useState } from "react";
import DriverPageHeader from "@/components/DriverPageHeader";
import dynamic from "next/dynamic";

const IncomingRequestCard = dynamic(() => import('@/components/IncomingRequestCard'), { ssr: false });

export default function DriverPage() {
  const [available, setAvailable] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem('driver_available');
      return raw === '1' || raw === 'true';
    } catch (e) {
      return false;
    }
  });

  useEffect(() => {
    const handler = (ev: Event) => {
      try {
        const detail = (ev as CustomEvent).detail || {};
        if (typeof detail.available === 'boolean') setAvailable(detail.available);
      } catch (e) {}
    };
    const storageHandler = (e: StorageEvent) => {
      if (e.key === 'driver_available') {
        const val = e.newValue;
        setAvailable(val === '1' || val === 'true');
      }
    };
    window.addEventListener('nols:availability:changed', handler as EventListener);
    window.addEventListener('storage', storageHandler as any);
    return () => {
      window.removeEventListener('nols:availability:changed', handler as EventListener);
      window.removeEventListener('storage', storageHandler as any);
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-3xl">
        <DriverPageHeader />
      </div>

      {available ? (
        // Show incoming request area when online. This is a UI placeholder; wire to backend/real-time later.
        <section className="mx-auto max-w-3xl">
          <IncomingRequestCard />
        </section>
      ) : null}

      {/* Quick actions removed per UX request - kept minimal driver dashboard */}
    </div>
  );
}
