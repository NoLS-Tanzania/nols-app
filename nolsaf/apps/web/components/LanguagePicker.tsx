"use client";

import { useEffect, useState, useRef } from "react";
import { ChevronDown } from 'lucide-react';

const KEY = 'nolsaf_locale';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'sw', label: 'Kiswahili' },
  { code: 'ar', label: 'العربية' },
];

export default function LanguagePicker() {
  const [open, setOpen] = useState(false);
  // initialize to a stable default during SSR to avoid hydration mismatches
  const [locale, setLocale] = useState<string>('en');

  // hydrate from localStorage on client mount
  useEffect(() => {
    try { const stored = localStorage.getItem(KEY); if (stored) setLocale(stored); } catch (e) {}
  }, []);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try { localStorage.setItem(KEY, locale); } catch (e) {}
    try { document.documentElement.lang = locale === 'sw' ? 'sw' : locale; document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr'; } catch (e) {}
  }, [locale]);

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
        title="Language"
      >
        <span className="mr-2 text-xs">{LANGUAGES.find(l=>l.code===locale)?.code.toUpperCase()}</span>
        <ChevronDown className="h-4 w-4 text-white/80" aria-hidden />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg ring-1 ring-black/10 overflow-hidden z-50">
          <div className="py-1">
            {LANGUAGES.map(l => (
              <button key={l.code} onClick={() => { setLocale(l.code); setOpen(false); }} className={`w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 ${locale===l.code ? 'font-semibold' : ''}`}>
                <span className="mr-2">{l.label}</span>
                <span className="text-xs text-gray-500">{l.code}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
