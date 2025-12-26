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

export default function GlobalPicker({ variant = "dark" }:{ variant?: "light" | "dark" }) {
  const [open, setOpen] = useState(false);
  const [locale, setLocale] = useState<string>('en');
  const [currency, setCurrency] = useState<string>('TZS');

  useEffect(() => {
    try { const stored = localStorage.getItem(KEY_LOCALE); if (stored) setLocale(stored); } catch (e) {}
    try { const storedC = localStorage.getItem(KEY_CURRENCY); if (storedC) setCurrency(storedC); } catch (e) {}
  }, []);
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

  const currentLanguage = LANGUAGES.find(l => l.code === locale);
  const currentCurrency = CURRENCIES.find(c => c.code === currency);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={[
          "inline-flex items-center justify-center h-9 w-9 rounded-full bg-transparent transition-all duration-300 hover:scale-110 active:scale-95 group relative border-0 outline-none focus:outline-none focus:ring-0",
          variant === "light" ? "text-[#02665e] hover:bg-[#02665e]/10" : "text-white hover:bg-white/10",
        ].join(" ")}
        aria-haspopup="true"
        aria-expanded={open}
        title={`${currentLanguage?.label || locale.toUpperCase()} • ${currentCurrency?.label || currency}`}
      >
        <Globe className="h-5 w-5 transition-transform duration-300 group-hover:rotate-12" aria-hidden />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-3">
            {/* Language Section */}
            <div className="mb-3">
              <div className="px-2 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Language</div>
              <div className="grid grid-cols-2 gap-1">
                {LANGUAGES.map(l => (
                  <button 
                    key={l.code} 
                    onClick={() => { setLocale(l.code); setOpen(false); }} 
                    className={`w-full text-left px-2.5 py-1.5 text-xs rounded-md transition-all duration-150 ${
                      locale === l.code 
                        ? 'bg-[#02665e] text-white font-medium' 
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate">{l.label}</span>
                      <span className={`text-[10px] ml-1.5 flex-shrink-0 ${locale === l.code ? 'text-white/70' : 'text-gray-400'}`}>
                        {l.code.toUpperCase()}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-gray-100 my-2.5"></div>

            {/* Currency Section */}
            <div>
              <div className="px-2 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Currency</div>
              <div className="grid grid-cols-2 gap-1">
                {CURRENCIES.map(c => (
                  <button 
                    key={c.code} 
                    onClick={() => { setCurrency(c.code); setOpen(false); }} 
                    className={`w-full text-left px-2.5 py-1.5 text-xs rounded-md transition-all duration-150 ${
                      currency === c.code 
                        ? 'bg-[#02665e] text-white font-medium' 
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium truncate">{c.label}</span>
                      <span className={`text-[10px] ml-1.5 flex-shrink-0 ${currency === c.code ? 'text-white/70' : 'text-gray-400'}`}>
                        {c.code}
                      </span>
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
