"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { User } from 'lucide-react';

export default function UserMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

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
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
        className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 transition"
        title="User menu"
      >
        <User className="h-5 w-5 text-white" aria-hidden />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black/10 overflow-hidden z-50">
          <div className="py-1">
            <Link href="/account" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">My account</Link>
            <Link href="/account/bookings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">My Bookings</Link>
            <Link href="/account/rides" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">My Rides</Link>
            <Link href="/account/group-stays" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">My Group Stay</Link>
            <div className="border-t border-gray-100" />
            <Link href="/account/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Profile</Link>
            <Link href="/account/security" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Settings</Link>
            <div className="border-t border-gray-100" />
            <Link 
              href="/login" 
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              onClick={() => {
                if (typeof window !== "undefined") {
                  localStorage.removeItem("token");
                }
              }}
            >
              Sign out
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
