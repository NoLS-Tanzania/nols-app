"use client";

import Link from "next/link";
import Image from "next/image";

export default function SiteFooter({ withRail = true }: { withRail?: boolean }) {
  const year = new Date().getFullYear();
  const innerRailClass = withRail ? 'md:ml-56' : '';
  return (
    <footer className={`w-full mt-12 page-bottom-buffer bg-slate-50`}> 
      {/* full-width separator line (brand color) */}
      <div className="w-full h-0.5 bg-[#02665e]" />
      <h2 className="sr-only">Footer</h2>

      <div className={`max-w-6xl mx-auto px-4 py-6 flex flex-col items-center gap-4 ${innerRailClass}`}>
        <div className="w-full">
          <div className="max-w-4xl mx-auto text-center">
            <h3 className="text-lg font-semibold text-gray-800">About NoLSAF</h3>
            <p className="mt-2 text-sm text-gray-600">Who we are and what we do and why You have to choose us.</p>
          </div>
        </div>
        <nav aria-label="Footer navigation" className="w-full flex justify-center">
          <ul className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <li><a role="button" onClick={() => window.dispatchEvent(new CustomEvent('open-legal', { detail: { type: 'terms' } }))} className="text-[#02665e] font-semibold no-underline hover:no-underline">Terms of Service</a></li>
            <li><a role="button" onClick={() => window.dispatchEvent(new CustomEvent('open-legal', { detail: { type: 'privacy' } }))} className="text-[#02665e] font-semibold no-underline hover:no-underline">Privacy Policy</a></li>
            <li><a role="button" onClick={() => window.dispatchEvent(new CustomEvent('open-legal', { detail: { type: 'security' } }))} className="text-[#02665e] font-semibold no-underline hover:no-underline">Security Policy</a></li>
            <li><Link href="/docs" className="text-[#02665e] font-semibold no-underline hover:no-underline">Docs</Link></li>
            <li><Link href="/version" className="text-[#02665e] font-semibold no-underline hover:no-underline">v0.1.0</Link></li>
          </ul>
        </nav>

        {/* Centered logo and copyright below links */}
        <div className="w-full flex flex-col items-center gap-1 mt-1">
          <Image src="/assets/NoLS2025-04.png" alt="NoLSAF" width={120} height={30} className="object-contain" />
          <div className="text-sm text-[#02665e] font-semibold">© {year} NoLSAF — All rights reserved</div>
        </div>
      </div>
    </footer>
  );
}
