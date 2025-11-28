"use client";

import Link from 'next/link';
import { CheckCircle } from 'lucide-react';
import React from 'react';

type Props = {
  href?: string;
  size?: number; // tailwind units (w-/h- size base is 2 => w-8 = 8)
  className?: string;
  ariaLabel?: string;
};

export default function VerifiedIcon({ href, size = 8, className = '', ariaLabel }: Props) {
  const w = `w-${size}`;
  const h = `h-${size}`;

  // fallback aria label
  const label = ariaLabel || 'Verified — view details';

  const inner = (
    <span
      className={`rounded-full ${w} ${h} flex items-center justify-center shadow-sm ring-2 ring-white/60 bg-white/20 backdrop-blur-md backdrop-saturate-150 ${className}`}
    >
      <CheckCircle className="w-4 h-4 text-green-700" />
    </span>
  );

  if (href) {
    return (
      <Link
        href={href}
        onClick={(e) => { e.stopPropagation(); }}
        aria-label={label}
        className="absolute top-3 right-3 z-20"
      >
        {inner}
      </Link>
    );
  }

  return (
    <div className="absolute top-3 right-3 z-20" aria-hidden>
      {inner}
    </div>
  );
}
