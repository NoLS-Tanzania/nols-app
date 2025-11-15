"use client";
import React, { useEffect, useState } from "react";

type Toast = { id: string; type?: 'success' | 'error' | 'info'; title?: string; message?: string; duration?: number };

export default function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const handler = (ev: Event) => {
      try {
        const detail = (ev as CustomEvent).detail || {};
        const t: Toast = { id: String(Date.now()) + Math.random().toString(36).slice(2), type: detail.type || 'info', title: detail.title, message: detail.message, duration: detail.duration ?? 5000 };
        setToasts((s) => [...s, t]);
        if (t.duration && t.duration > 0) {
          window.setTimeout(() => {
            setToasts((s) => s.filter((x) => x.id !== t.id));
          }, t.duration);
        }
      } catch (e) {
        // ignore
      }
    };
    window.addEventListener('nols:toast', handler as EventListener);
    return () => { window.removeEventListener('nols:toast', handler as EventListener); };
  }, []);

  if (!toasts.length) return null;

  return (
    <div aria-live="polite" className="fixed right-4 bottom-6 z-50 flex flex-col gap-3">
      {toasts.map((t) => (
        <div key={t.id} className={`max-w-xs w-full px-4 py-3 rounded shadow-md text-sm border ${t.type === 'success' ? 'bg-green-50 text-green-800 border-green-100' : t.type === 'error' ? 'bg-red-50 text-red-800 border-red-100' : 'bg-white text-gray-800 border-gray-100'}`}>
          {t.title ? <div className="font-medium">{t.title}</div> : null}
          {t.message ? <div className="mt-1 text-xs">{t.message}</div> : null}
        </div>
      ))}
    </div>
  );
}
