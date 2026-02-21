"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

type TypingStoryProps = {
  text: string;
  className?: string;
  typeMsPerChar?: number;
  deleteMsPerChar?: number;
  deleteMode?: "char" | "word";
  pauseAfterTypedMs?: number;
  pauseAfterDeletedMs?: number;
  emphasis?: {
    phrase: string;
    italicClassName?: string;
    wordClassNames?: Record<string, string>;
  };
};

function renderEmphasisPhrase(phrase: string, wordClassNames?: Record<string, string>): ReactNode {
  const parts = phrase.match(/\w+|\W+/g) ?? [phrase];
  return (
    <>
      {parts.map((part, index) => {
        const key = `${index}-${part}`;
        if (!/^\w+$/.test(part)) return <span key={key}>{part}</span>;

        const className = wordClassNames?.[part.toLowerCase()];
        if (!className) return <span key={key}>{part}</span>;
        return (
          <span key={key} className={className}>
            {part}
          </span>
        );
      })}
    </>
  );
}

function renderWithEmphasis(text: string, emphasis?: TypingStoryProps["emphasis"]): ReactNode {
  if (!emphasis?.phrase) return text;
  const index = text.indexOf(emphasis.phrase);
  if (index < 0) return text;

  const before = text.slice(0, index);
  const after = text.slice(index + emphasis.phrase.length);

  return (
    <>
      {before}
      <span className={emphasis.italicClassName ?? "italic"}>
        {renderEmphasisPhrase(emphasis.phrase, emphasis.wordClassNames)}
      </span>
      {after}
    </>
  );
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mql = (window as any).matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mql) return;

    const onChange = () => setReduced(!!mql.matches);

    onChange();

    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener?.("change", onChange);
    }

    if (typeof mql.addListener === "function") {
      mql.addListener(onChange);
      return () => mql.removeListener?.(onChange);
    }

    return;
  }, []);

  return reduced;
}

export default function TypingStory({
  text,
  className,
  typeMsPerChar = 16,
  deleteMsPerChar = 10,
  deleteMode = "char",
  pauseAfterTypedMs = 1400,
  pauseAfterDeletedMs = 600,
  emphasis,
}: TypingStoryProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  const fullText = useMemo(() => text ?? "", [text]);

  const [display, setDisplay] = useState("");
  const [mode, setMode] = useState<"typing" | "deleting">("typing");

  useEffect(() => {
    if (prefersReducedMotion) return;

    let timeoutId: number | undefined;

    const tick = () => {
      if (mode === "typing") {
        if (display.length < fullText.length) {
          setDisplay(fullText.slice(0, display.length + 1));
          timeoutId = window.setTimeout(tick, typeMsPerChar);
          return;
        }

        timeoutId = window.setTimeout(() => setMode("deleting"), pauseAfterTypedMs);
        return;
      }

      // deleting
      if (display.length > 0) {
        if (deleteMode === "word") {
          const trimmed = display.replace(/\s+$/g, "");
          const lastSpaceIndex = trimmed.lastIndexOf(" ");
          const next = lastSpaceIndex <= 0 ? "" : trimmed.slice(0, lastSpaceIndex + 1);
          setDisplay(next);
          timeoutId = window.setTimeout(tick, Math.max(40, deleteMsPerChar * 6));
        } else {
          setDisplay(fullText.slice(0, display.length - 1));
          timeoutId = window.setTimeout(tick, deleteMsPerChar);
        }
        return;
      }

      timeoutId = window.setTimeout(() => setMode("typing"), pauseAfterDeletedMs);
    };

    timeoutId = window.setTimeout(tick, typeMsPerChar);

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [deleteMode, deleteMsPerChar, display, fullText, mode, pauseAfterDeletedMs, pauseAfterTypedMs, prefersReducedMotion, typeMsPerChar]);

  if (prefersReducedMotion) {
    return (
      <div className={className}>
        <div className="text-[15px] leading-relaxed text-slate-700 whitespace-pre-wrap">
          {renderWithEmphasis(fullText, emphasis)}
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="relative rounded-2xl border border-slate-200/80 bg-white/60 backdrop-blur-sm p-5 shadow-sm">
        <div className="min-h-[180px] sm:min-h-[200px] text-[15px] leading-relaxed text-slate-700 whitespace-pre-wrap">
          <span aria-hidden>{renderWithEmphasis(display, emphasis)}</span>
          <span aria-hidden className="inline-block w-[0.6ch] align-[-0.1em]">
            <span className="inline-block h-[1.05em] w-[2px] rounded-full bg-slate-400/90 animate-pulse" />
          </span>
          <span className="sr-only">{fullText}</span>
        </div>
      </div>
    </div>
  );
}
