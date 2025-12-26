"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from 'lucide-react';

const THEME_KEY = 'nolsaf_theme';

export default function ThemeToggle({ variant = "dark" }:{ variant?: "light" | "dark" }) {
  // Avoid SSR/client mismatch by deferring theme resolution to mount
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState<boolean>(false);

  // Resolve initial theme on mount only (client-side APIs available)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(THEME_KEY);
      if (stored) setIsDark(stored === 'dark');
      else if (window.matchMedia) setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
    } catch (e) {}
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try { localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light'); } catch (e) {}
    if (isDark) document.documentElement.classList.add('dark'); else document.documentElement.classList.remove('dark');
  }, [isDark, mounted]);

  const toggle = () => setIsDark(v => !v);

  return (
    <button
      onClick={toggle}
      aria-pressed={isDark}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className={[
        "inline-flex items-center justify-center h-9 w-9 rounded-full bg-transparent transition-all duration-300 hover:scale-110 active:scale-95 border-0 outline-none focus:outline-none focus:ring-0",
        variant === "light" ? "text-[#02665e] hover:bg-[#02665e]/10" : "text-white hover:bg-white/10",
      ].join(" ")}
    >
      {/* Render icon only after mount to prevent SSR/CSR mismatches; keep SSR markup stable */}
      {mounted ? (
        isDark ? <Sun className="h-5 w-5 transition-transform duration-300" aria-hidden suppressHydrationWarning /> : <Moon className="h-5 w-5 transition-transform duration-300" aria-hidden suppressHydrationWarning />
      ) : (
        <span className="block h-5 w-5" aria-hidden />
      )}
    </button>
  );
}
