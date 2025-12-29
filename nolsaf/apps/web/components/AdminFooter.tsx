"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function AdminFooter() {
  const year = new Date().getFullYear();
  
  const handleLegalClick = (type: 'terms' | 'privacy' | 'cookies') => {
    window.dispatchEvent(new CustomEvent('open-legal', { detail: { type } }));
  };

  return (
    <footer aria-label="Footer" className="bg-white border-t border-gray-100">
      <h2 className="sr-only">Footer</h2>

      <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col items-center gap-6">
        {/* Top separator line with circle */}
        <div className="relative w-full max-w-2xl flex items-center justify-center">
          <div className="absolute w-full h-px bg-gray-200"></div>
          <div className="relative bg-white w-3 h-3 rounded-full border-2 border-gray-200"></div>
        </div>

        <nav aria-label="Footer navigation" className="w-full flex justify-center">
          <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm">
            <li>
              <button
                onClick={() => handleLegalClick('terms')}
                className="text-[#02665e] font-normal hover:text-[#014d47] no-underline cursor-pointer transition-colors duration-200 ease-in-out bg-transparent border-none p-0"
              >
                Terms of Service
              </button>
            </li>
            <li>
              <button
                onClick={() => handleLegalClick('privacy')}
                className="text-[#02665e] font-normal hover:text-[#014d47] no-underline cursor-pointer transition-colors duration-200 ease-in-out bg-transparent border-none p-0"
              >
                Privacy Policy
              </button>
            </li>
            <li>
              <Link
                href="/cookies-policy"
                className="text-[#02665e] font-normal hover:text-[#014d47] no-underline cursor-pointer transition-colors duration-200 ease-in-out"
              >
                Cookies Policy
              </Link>
            </li>
            <li>
              <Link
                href="/verification-policy"
                className="text-[#02665e] font-normal hover:text-[#014d47] no-underline cursor-pointer transition-colors duration-200 ease-in-out"
              >
                Verification Policy
              </Link>
            </li>
            <li>
              <Link
                href="/cancellation-policy"
                className="text-[#02665e] font-normal hover:text-[#014d47] no-underline cursor-pointer transition-colors duration-200 ease-in-out"
              >
                Cancellation Policy
              </Link>
            </li>
            <li>
              <Link
                href="/driver-disbursement-policy"
                className="text-[#02665e] font-normal hover:text-[#014d47] no-underline cursor-pointer transition-colors duration-200 ease-in-out"
              >
                Driver Disbursement Policy
              </Link>
            </li>
            <li>
              <Link
                href="/property-owner-disbursement-policy"
                className="text-[#02665e] font-normal hover:text-[#014d47] no-underline cursor-pointer transition-colors duration-200 ease-in-out"
              >
                Property Owner Disbursement Policy
              </Link>
            </li>
          </ul>
        </nav>

        <div className="flex items-center justify-center gap-x-4 gap-y-2 text-sm text-[#02665e] font-normal">
          <Link
            href="/docs"
            className="text-[#02665e] hover:text-[#014d47] no-underline cursor-pointer transition-colors duration-200 ease-in-out"
          >
            Docs
          </Link>
          <Link
            href="/version"
            className="text-[#02665e] hover:text-[#014d47] no-underline cursor-pointer transition-colors duration-200 ease-in-out"
          >
            v0.1.0
          </Link>
        </div>

        <div className="w-full flex flex-col items-center gap-2 mt-2">
          <div className="text-sm text-[#02665e] font-normal transition-all duration-300 ease-in-out">© {year} NoLSAF — All rights reserved</div>
        </div>
      </div>
    </footer>
  );
}
