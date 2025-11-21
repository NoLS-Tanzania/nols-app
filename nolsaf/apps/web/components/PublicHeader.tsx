"use client";

import Link from "next/link";
import Image from "next/image";
import React, { useEffect, useState, useRef } from "react";
import { ChevronDown } from 'lucide-react';
import { REGIONS } from '@/lib/tzRegions';
import { usePathname } from "next/navigation";
import PublicSearch from "@/components/PublicSearch";
import UserMenu from '@/components/UserMenu';
import ThemeToggle from "@/components/ThemeToggle";
import GlobalPicker from "@/components/GlobalPicker";

export default function PublicHeader({
  tools,
  compact = false,
}: {
  /** Optional right-side tools area (e.g. search, login, locale) */
  tools?: React.ReactNode;
  /** smaller height when embedded */
  compact?: boolean;
}) {
  const pathname = usePathname?.() ?? '';
  const showSearch = !compact && (pathname === '/public' || pathname === '/public/' || pathname === '');
  const [authed, setAuthed] = React.useState<boolean>(false);

  React.useEffect(() => {
    try {
      const t = localStorage.getItem('token');
      setAuthed(Boolean(t));
      const onStorage = (e: StorageEvent) => {
        if (e.key === 'token') setAuthed(Boolean(e.newValue));
      };
      window.addEventListener('storage', onStorage);
      return () => window.removeEventListener('storage', onStorage);
    } catch (e) {
      setAuthed(false);
    }
  }, []);
  return (
    <header className={`fixed top-0 left-0 right-0 z-40 text-white/95 bg-[#02665e] ${compact ? 'h-12' : 'h-16'} shadow-none`}>
      <div className={`mx-auto max-w-6xl px-4 ${compact ? 'h-12' : 'h-16'} flex items-center md:ml-0`}>
        {/* Left: logo + optional nav */}
        <div className="flex items-center gap-4 z-20">
          <Link href="/" className="inline-flex items-center" aria-label="NoLSAF Home">
            <Image src="/assets/nolsnewlog.png" alt="NoLSAF" width={140} height={36} className="h-8 w-auto" />
          </Link>

          <nav className="hidden sm:flex items-center gap-4">
            <Link href="/public" className="text-white font-bold no-underline text-base inline-flex items-center justify-center px-3 py-1.5 rounded-full transition transform duration-150 hover:bg-white/10 hover:opacity-95 hover:scale-105">Home</Link>
            <Link href="/public/properties" className="text-white font-bold no-underline text-base inline-flex items-center justify-center px-3 py-1.5 rounded-full transition transform duration-150 hover:bg-white/10 hover:opacity-95 hover:scale-105">Properties</Link>

            {/* Regions dropdown - lists regions from /lib/tzRegions */}
            <RegionsDropdown />
          </nav>
        </div>

        {/* Center: search - stretch and center */}
        <div className="flex-1 flex justify-center items-center z-10 pointer-events-none">
          {showSearch && (
            <div className="w-full flex justify-center pointer-events-auto">
              <div className="w-40 sm:w-44 md:w-48 px-1">
                <PublicSearch />
              </div>
            </div>
          )}
        </div>

        {/* Right: auth buttons */}
        <div className="flex items-center gap-3 ml-4 z-20">
          {tools ?? (
            <>
              {/* Show sign in / register when not authenticated. Do not read localStorage during render so SSR matches initial client render. */}
              {!authed && (
                <>
                  <Link href="/account/login" className="text-white font-bold text-base inline-flex items-center justify-center px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 no-underline transition transform duration-150 hover:scale-105 hover:opacity-95 hover:shadow-sm">Sign in</Link>
                  <Link href="/account/register" className="text-white font-bold text-base inline-flex items-center justify-center px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 no-underline transition transform duration-150 hover:scale-105 hover:opacity-95 hover:shadow-sm">Register</Link>
                </>
              )}

              <GlobalPicker />
              <ThemeToggle />

              {/* User menu only after successful login (token present). Render after client confirms auth. */}
              {authed && <UserMenu />}

            </>
          )}
        </div>
      </div>
    </header>
  );
}

// Note: `UserMenu` is a client component and `PublicHeader` is also a client
// component, so we import and render it directly. Previously a dynamic loader
// was used which could produce an unexpected object in some HMR states.

function RegionsDropdown() {
  const [open, setOpen] = useState<boolean>(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<HTMLDivElement | null>(null);
  const [minimized, setMinimized] = useState<boolean>(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const draggingRef = useRef<{ active: boolean; startX: number; startY: number; origLeft: number; origTop: number }>({ active: false, startX: 0, startY: 0, origLeft: 0, origTop: 0 });

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  // load saved position when component mounts
  useEffect(() => {
    try {
      const raw = localStorage.getItem('nols_regions_pos');
      if (raw) setPos(JSON.parse(raw));
    } catch (e) {}
  }, []);

  // helpers to persist
  const savePos = (p: { left: number; top: number }) => {
    try { localStorage.setItem('nols_regions_pos', JSON.stringify(p)); } catch (e) {}
  };

  // apply positional styles to the draggable container when `pos` changes
  useEffect(() => {
    const el = dragRef.current as HTMLDivElement | null;
    if (!el) return;
    if (pos) {
      el.style.left = `${pos.left}px`;
      el.style.top = `${pos.top}px`;
    } else {
      el.style.left = '';
      el.style.top = '';
    }
  }, [pos]);

  // load saved minimized state
  useEffect(() => {
    try {
      const raw = localStorage.getItem('nols_regions_minimized');
      if (raw) setMinimized(raw === '1');
    } catch (e) {}
  }, []);

  // helpers to persist minimized state
  const saveMinimized = (m: boolean) => {
    try { localStorage.setItem('nols_regions_minimized', m ? '1' : '0'); } catch (e) {}
  };

  // start drag: attach listeners directly so they are bound reliably
  const startDrag = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    const isTouch = (e as React.TouchEvent).touches != null;
    const clientX = isTouch ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = isTouch ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;
    const rect = ref.current?.getBoundingClientRect();
    const origLeft = rect ? rect.left : (window.innerWidth - 400) / 2;
    const origTop = rect ? rect.top : 80;
    draggingRef.current = { active: true, startX: clientX, startY: clientY, origLeft, origTop };

    const onMove = (ev: MouseEvent | TouchEvent) => {
      if (!draggingRef.current.active) return;
      let moveX = 0, moveY = 0;
      if ((ev as TouchEvent).touches) {
        moveX = (ev as TouchEvent).touches[0].clientX; moveY = (ev as TouchEvent).touches[0].clientY;
      } else {
        moveX = (ev as MouseEvent).clientX; moveY = (ev as MouseEvent).clientY;
      }
      const dx = moveX - draggingRef.current.startX;
      const dy = moveY - draggingRef.current.startY;
      const newLeft = Math.max(8, Math.min(window.innerWidth - 16, draggingRef.current.origLeft + dx));
      const newTop = Math.max(8, Math.min(window.innerHeight - 16, draggingRef.current.origTop + dy));
      setPos({ left: newLeft, top: newTop });
    };

    const onUp = () => {
      if (!draggingRef.current.active) return;
      draggingRef.current.active = false;
      if (pos) savePos(pos);
      window.removeEventListener('mousemove', onMove as any);
      window.removeEventListener('touchmove', onMove as any);
      window.removeEventListener('mouseup', onUp as any);
      window.removeEventListener('touchend', onUp as any);
    };

    window.addEventListener('mousemove', onMove as any, { passive: false });
    window.addEventListener('touchmove', onMove as any, { passive: false });
    window.addEventListener('mouseup', onUp as any);
    window.addEventListener('touchend', onUp as any);
  };

  

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        className="text-white font-bold no-underline text-base inline-flex items-center justify-center px-3 py-1.5 rounded-full bg-transparent appearance-none border-0 transition transform duration-150 hover:bg-white/10 hover:opacity-95 hover:scale-105"
      >
        Regions
        <ChevronDown className="h-4 w-4 text-white/90" aria-hidden />
      </button>

      {open && (
        <div
          ref={dragRef}
          className={`${pos ? 'fixed' : 'absolute left-1/2 transform -translate-x-1/2'} mt-2 bg-white rounded-md shadow-lg ring-1 ring-black/10 z-50 min-w-[24rem] sm:min-w-[32rem] lg:min-w-[40rem] xl:min-w-[48rem] max-w-[calc(100vw-2rem)]`}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 cursor-move select-none">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-800">Regions</span>
              <span className="text-xs text-gray-500">Select a region</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label={minimized ? 'Restore regions' : 'Minimize regions'}
                onClick={(ev) => { ev.stopPropagation(); setMinimized(m => { const nm = !m; saveMinimized(nm); return nm; }); }}
                className="text-gray-600 hover:text-gray-800 text-sm px-2 py-1 rounded"
              >
                {minimized ? '▸' : '▾'}
              </button>
              <div
                onMouseDown={startDrag}
                onTouchStart={startDrag}
                className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600"
                title="Drag to move"
              >
                ≡
              </div>
            </div>
          </div>

          {!minimized && (
            <div className="p-2 grid grid-cols-5 gap-0 divide-y divide-gray-100 sm:divide-y-0 sm:divide-x">
              {REGIONS.map((r: any) => (
                <Link
                  key={r.id}
                  href={`/public/properties?region=${encodeURIComponent(r.id)}`}
                  onClick={() => setOpen(false)}
                  className="block px-3 py-2 text-sm text-gray-700 hover:bg-emerald-200 hover:text-emerald-800 hover:font-semibold hover:shadow-sm transition-colors duration-150 no-underline text-center rounded cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-200"
                >
                  {r.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
