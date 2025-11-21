"use client";

import { useEffect, useState, useRef } from "react";
import { ChevronDown } from 'lucide-react';

const KEY = 'nolsaf_currency';

const CURRENCIES = [
  { code: 'TZS', label: 'TSh' },
  { code: 'USD', label: '$' },
  { code: 'EUR', label: '€' },
  { code: 'KES', label: 'KSh' },
];

export default function CurrencyPicker() {
  const [open, setOpen] = useState(false);
  const [currency, setCurrency] = useState<string>(() => {
    try { return localStorage.getItem(KEY) ?? 'TZS'; } catch (e) { return 'TZS'; }
  });
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try { localStorage.setItem(KEY, currency); } catch (e) {}
  }, [currency]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="inline-flex items-center justify-center h-9 px-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm font-medium"
        aria-haspopup="true"
        aria-expanded={open}
        title="Currency"
      >
        <span className="mr-2 text-xs text-white/90">{CURRENCIES.find(c=>c.code===currency)?.label ?? currency}</span>
        <ChevronDown className="h-4 w-4 text-white/80" aria-hidden />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-36 bg-white rounded-md shadow-lg ring-1 ring-black/10 overflow-hidden z-50">
          <div className="py-1">
            {CURRENCIES.map(c => (
              <button key={c.code} onClick={() => { setCurrency(c.code); setOpen(false); }} className={`w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 ${currency===c.code ? 'font-semibold' : ''}`}>
                <span className="mr-2">{c.label}</span>
                <span className="text-xs text-gray-500">{c.code}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
