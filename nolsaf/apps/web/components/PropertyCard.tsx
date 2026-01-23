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
  hideCta?: boolean;
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
  hideCta = false,
}: Props) {
  const [blinkActive, setBlinkActive] = useState(false);
  const router = useRouter();

  const onEnter = () => setBlinkActive(true);
  const onLeave = () => setBlinkActive(false);
  const canNavigate = Boolean(href && href !== "#");

  return (
    <div
      className={[
        "group relative flex flex-col no-underline overflow-visible",
        "rounded-3xl p-[1px]",
        "bg-gradient-to-br from-white/30 via-[#02b4f5]/12 to-[#02665e]/16",
        "shadow-[0_18px_55px_rgba(2,6,23,0.10)] ring-1 ring-white/30",
        "transition-all duration-300",
        "hover:shadow-[0_28px_75px_rgba(2,6,23,0.14)]",
        "card-raise",
        className,
      ].join(" ")}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
      onTouchStart={onEnter}
      onTouchEnd={onLeave}
    >
      <div className="relative h-56 overflow-hidden rounded-[22px] bg-white/10 ring-1 ring-white/10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(255,255,255,0.22),transparent_50%),radial-gradient(circle_at_90%_70%,rgba(2,180,245,0.14),transparent_55%)]" aria-hidden />


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
          "focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200/50 focus-visible:ring-offset-0",
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
            className="absolute inset-0 object-cover will-change-transform transition-[transform,filter] duration-700 ease-out group-hover:scale-[1.04] group-hover:saturate-[1.06] group-hover:contrast-[1.03]"
          />
        ) : null}
        {imageSrc ? (
          <>
            {/* Keep photos visible: light tint + soft readability gradient */}
            <span aria-hidden className="absolute inset-0 bg-black/10" />
            <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/12 to-transparent" />
          </>
        ) : (
          <span aria-hidden className="absolute inset-0 bg-gradient-to-b from-white/30 to-white/0" />
        )}

        <div className="relative z-20 flex flex-col h-full">
          <div className="flex-1" />
          {bottomOverlay ? (
            <div className="p-4 pt-0">
              {bottomOverlay}
            </div>
          ) : null}
          {!hideCta ? (
            <div className="mt-auto p-4">
              <AttentionBlink active={blinkActive}>
                <span
                  className={[
                    "inline-flex items-center justify-center",
                    "mx-auto min-w-[9.5rem]",
                    "px-5 py-2.5 rounded-full",
                    "bg-white/12 backdrop-blur-md border border-white/30",
                    "text-white font-semibold shadow-[0_12px_28px_rgba(2,6,23,0.22)]",
                    "transition-all duration-300",
                    "group-hover:bg-white/16 group-hover:border-white/40",
                  ].join(" ")}
                >
                  {ctaLabel}
                </span>
              </AttentionBlink>
            </div>
          ) : null}
        </div>
      </button>

      {/* Verified badge (reusable component) */}
      {showVerified ? <VerifiedIcon href={href} ariaLabel={`View details for ${title}`} /> : null}

      </div>

      {/* caption below the card (visible) */}
      {!hideCaption ? (
        <div className="mt-3 px-1">
          <Link href={href} className="text-sm font-semibold text-slate-900 no-underline hover:text-slate-950">{title}</Link>
          <div className="text-xs text-slate-600">{description}</div>
        </div>
      ) : null}
    </div>
  );
}
