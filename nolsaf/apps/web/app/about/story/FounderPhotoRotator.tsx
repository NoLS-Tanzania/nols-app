"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type Props = {
  sources: string[];
  intervalMs?: number;
  alt?: string;
  sizes?: string;
};

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(Boolean(mediaQuery.matches));

    update();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", update);
      return () => mediaQuery.removeEventListener("change", update);
    }

    mediaQuery.addListener(update);
    return () => mediaQuery.removeListener(update);
  }, []);

  return reduced;
}

export default function FounderPhotoRotator({
  sources,
  intervalMs = 30000,
  alt = "Founder photo",
  sizes = "96px",
}: Props) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const usableSources = (sources ?? []).filter(Boolean);

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion) return;
    if (usableSources.length <= 1) return;

    const id = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % usableSources.length);
    }, Math.max(1000, intervalMs));

    return () => window.clearInterval(id);
  }, [intervalMs, prefersReducedMotion, usableSources.length]);

  if (usableSources.length === 0) return null;

  return (
    <div className="relative h-full w-full">
      {usableSources.map((src, index) => {
        const isActive = index === activeIndex;
        return (
          <Image
            key={src}
            src={src}
            alt={alt}
            fill
            sizes={sizes}
            className={
              "object-cover " +
              (prefersReducedMotion
                ? isActive
                  ? "opacity-100"
                  : "opacity-0"
                : isActive
                  ? "opacity-100 transition-opacity duration-700 ease-out"
                  : "opacity-0 transition-opacity duration-700 ease-out")
            }
            priority={false}
          />
        );
      })}
    </div>
  );
}
