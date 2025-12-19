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
  topLeftBadge?: React.ReactNode;
  topLeftSubBadge?: React.ReactNode;
  bottomOverlay?: React.ReactNode;
  hideCaption?: boolean;
  ctaLabel?: string;
  showVerified?: boolean;
};

export default function PropertyCard({
  title,
  description,
  href = "#",
  imageSrc,
  className = "",
  topLeftBadge,
  topLeftSubBadge,
  bottomOverlay,
  hideCaption = false,
  ctaLabel = "Book Now",
  showVerified = true,
}: Props) {
  const [blinkActive, setBlinkActive] = useState(false);
  const router = useRouter();

  const onEnter = () => setBlinkActive(true);
  const onLeave = () => setBlinkActive(false);
  const canNavigate = Boolean(href && href !== "#");

  return (
    <div
      className={`relative border-2 border-[#02665e] rounded-xl overflow-hidden hover:shadow-md flex flex-col h-56 no-underline ${className}`}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
      onTouchStart={onEnter}
      onTouchEnd={onLeave}
    >

      {/* Optional badges (top-left) */}
      {topLeftBadge || topLeftSubBadge ? (
        <div className="absolute top-3 left-3 z-20 pointer-events-none flex flex-col gap-2">
          {topLeftBadge}
          {topLeftSubBadge}
        </div>
      ) : null}

      {/* Main clickable area (covers most of the card) */}
      <button
        type="button"
        disabled={!canNavigate}
        aria-label={`${title} - view details`}
        className={[
          "absolute inset-0 z-10 no-underline",
          canNavigate ? "cursor-pointer" : "cursor-default opacity-70",
        ].join(" ")}
        onClick={() => {
          if (canNavigate) router.push(href);
        }}
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
          {bottomOverlay ? (
            <div className="p-4 pt-0">
              {bottomOverlay}
            </div>
          ) : null}
          <div className="mt-auto p-4">
            <AttentionBlink active={blinkActive}>
              <span className="inline-flex items-center px-3 py-2 bg-[#02665e] text-white rounded-md">{ctaLabel}</span>
            </AttentionBlink>
          </div>
        </div>
      </button>

      {/* Verified badge (reusable component) */}
      {showVerified ? <VerifiedIcon href={href} ariaLabel={`View details for ${title}`} /> : null}

      {/* caption below the card (visible) */}
      {!hideCaption ? (
      <div className="mt-3 px-1">
        <Link href={href} className="text-sm font-semibold text-slate-900 no-underline">{title}</Link>
        <div className="text-xs text-slate-600">{description}</div>
      </div>
      ) : null}
    </div>
  );
}
