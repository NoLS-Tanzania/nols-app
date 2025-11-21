"use client";

import { useEffect, useState, useRef } from "react";
import { Globe, ChevronDown } from 'lucide-react';

const KEY_LOCALE = 'nolsaf_locale';
const KEY_CURRENCY = 'nolsaf_currency';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'sw', label: 'Kiswahili' },
  { code: 'ar', label: 'العربية' },
];

const CURRENCIES = [
  { code: 'TZS', label: 'TSh' },
  { code: 'USD', label: '$' },
  { code: 'EUR', label: '€' },
  { code: 'KES', label: 'KSh' },
];

export default function GlobalPicker() {
  const [open, setOpen] = useState(false);
  const [locale, setLocale] = useState<string>(() => {
    try { return localStorage.getItem(KEY_LOCALE) ?? 'en'; } catch (e) { return 'en'; }
  });
  const [currency, setCurrency] = useState<string>(() => {
    try { return localStorage.getItem(KEY_CURRENCY) ?? 'TZS'; } catch (e) { return 'TZS'; }
  });
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try { localStorage.setItem(KEY_LOCALE, locale); } catch (e) {}
    try { document.documentElement.lang = locale === 'sw' ? 'sw' : locale; document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr'; } catch (e) {}
  }, [locale]);

  useEffect(() => {
    try { localStorage.setItem(KEY_CURRENCY, currency); } catch (e) {}
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
        title="Language & currency"
      >
        <Globe className="h-4 w-4 mr-2 text-white/90" aria-hidden />
        <span className="text-xs mr-2">{locale.toUpperCase()}</span>
        <span className="text-xs mr-1">{CURRENCIES.find(c=>c.code===currency)?.label ?? currency}</span>
        <ChevronDown className="h-4 w-4 text-white/80" aria-hidden />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-md shadow-lg ring-1 ring-black/10 overflow-hidden z-50">
          <div className="p-2 grid grid-cols-2 gap-2">
            <div>
              <div className="px-2 py-1 text-xs font-semibold text-gray-500">Language</div>
              <div className="py-1">
                {LANGUAGES.map(l => (
                  <button key={l.code} onClick={() => { setLocale(l.code); setOpen(false); }} className={`w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 ${locale===l.code ? 'font-semibold' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div>{l.label}</div>
                      <div className="text-xs text-gray-400">{l.code.toUpperCase()}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="px-2 py-1 text-xs font-semibold text-gray-500">Currency</div>
              <div className="py-1">
                {CURRENCIES.map(c => (
                  <button key={c.code} onClick={() => { setCurrency(c.code); setOpen(false); }} className={`w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 ${currency===c.code ? 'font-semibold' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div>{c.label}</div>
                      <div className="text-xs text-gray-400">{c.code}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
