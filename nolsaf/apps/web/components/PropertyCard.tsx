"use client";

import Link from "next/link";
import Image from "next/image";
import React, { useState } from "react";
import AttentionBlink from './AttentionBlink';
import VerifiedIcon from './VerifiedIcon';
import { useRouter } from 'next/navigation';

type Props = {
  title: string;
  description: string;
  href?: string;
  imageSrc?: string;
  className?: string;
};

export default function PropertyCard({ title, description, href = '#', imageSrc, className = '' }: Props) {
  const [blinkActive, setBlinkActive] = useState(false);
  const router = useRouter();

  const onEnter = () => setBlinkActive(true);
  const onLeave = () => setBlinkActive(false);

  return (
    <div className={`relative border-2 border-[#02665e] rounded-xl overflow-hidden hover:shadow-md flex flex-col h-56 no-underline ${className}`}>

      {/* Main clickable area (covers most of the card) - use client navigation to avoid complex anchor children */}
      <div
        role="link"
        tabIndex={0}
        aria-label={`${title} - view details`}
        className="absolute inset-0 z-10 no-underline cursor-pointer"
        onClick={() => router.push(href)}
        onKeyDown={(e) => { if (e.key === 'Enter') router.push(href); }}
      >
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={title}
            fill
            sizes="(min-width: 1024px) 20vw, (min-width: 640px) 50vw, 100vw"
            className="absolute inset-0 object-cover"
          />
        ) : null}
        {imageSrc ? <span aria-hidden className="absolute inset-0 bg-black/20" /> : null}

        <div className="relative z-20 flex flex-col h-full">
          <div className="flex-1" />
          <div className="mt-auto p-4">
            <AttentionBlink active={blinkActive}>
              <span className="inline-flex items-center px-3 py-2 bg-[#02665e] text-white rounded-md">Book Now</span>
            </AttentionBlink>
          </div>
        </div>
      </div>

      {/* Verified badge (reusable component) */}
      <VerifiedIcon href={href} ariaLabel={`View details for ${title}`} />

      {/* interaction area for touch/hover to control blink (keeps separate from link to avoid nested interactive elements) */}
      <div className="absolute inset-0 z-30" 
        onPointerEnter={onEnter}
        onPointerLeave={onLeave}
        onFocus={onEnter}
        onBlur={onLeave}
        onTouchStart={onEnter}
        onTouchEnd={onLeave}
        aria-hidden
      />

      {/* caption below the card (visible) */}
      <div className="mt-3 px-1">
        <Link href={href} className="text-sm font-semibold text-slate-900 no-underline">{title}</Link>
        <div className="text-xs text-slate-600">{description}</div>
      </div>
    </div>
  );
}
