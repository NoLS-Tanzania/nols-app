"use client";

import React from 'react';
import Image from 'next/image';

export default function AdminFooter() {
  const year = new Date().getFullYear();
  return (
    <footer aria-label="Footer" className="footer-with-rail border-t">
      <h2 className="sr-only">Footer</h2>

      <div className="max-w-6xl mx-auto px-4 py-3 md:ml-56 flex flex-col items-center gap-4">
        <nav aria-label="Footer navigation" className="w-full flex justify-center">
          <ul className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <li><a role="button" onClick={() => window.dispatchEvent(new CustomEvent('open-legal', { detail: { type: 'terms' } }))} className="text-[#02665e] font-semibold no-underline hover:no-underline">Terms of Service</a></li>
            <li><a role="button" onClick={() => window.dispatchEvent(new CustomEvent('open-legal', { detail: { type: 'privacy' } }))} className="text-[#02665e] font-semibold no-underline hover:no-underline">Privacy Policy</a></li>
            <li><a role="button" onClick={() => window.dispatchEvent(new CustomEvent('open-legal', { detail: { type: 'security' } }))} className="text-[#02665e] font-semibold no-underline hover:no-underline">Security Policy</a></li>
            <li><a className="text-[#02665e] font-semibold no-underline hover:no-underline" href="/docs">Docs</a></li>
            <li><a className="text-[#02665e] font-semibold no-underline hover:no-underline" href="/version">v0.1.0</a></li>
          </ul>
        </nav>

        <div className="w-full flex flex-col items-center gap-1 mt-1">
          <Image src="/assets/NoLS2025-04.png" alt="NoLSAF" width={120} height={30} className="object-contain" />
          <div className="text-sm text-[#02665e] font-semibold">© {year} NoLSAF — All rights reserved</div>
        </div>
      </div>
    </footer>
  );
}
