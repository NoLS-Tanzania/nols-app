"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export function StepFooter({
  onPrev,
  onNext,
  prevDisabled,
  nextDisabled,
  prevLabel = "Previous",
  nextLabel = "Next",
}: {
  onPrev: () => void;
  onNext: () => void;
  prevDisabled?: boolean;
  nextDisabled?: boolean;
  prevLabel?: string;
  nextLabel?: string;
}) {
  const hidePrev = !!prevDisabled;
  return (
    <div className={`mt-6 flex items-center pt-4 border-t border-gray-200 ${hidePrev ? "justify-end" : "justify-between"}`}>
      {!hidePrev ? (
        <button
          type="button"
          onClick={onPrev}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onPrev();
            }
          }}
          disabled={!!prevDisabled}
          className="flex items-center justify-center w-10 h-10 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 active:scale-95"
          aria-label={prevLabel}
          aria-disabled={!!prevDisabled}
          title={`${prevLabel} (Press Enter or Space)`}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      ) : null}
      <button
        type="button"
        onClick={onNext}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onNext();
          }
        }}
        disabled={!!nextDisabled}
        className={`flex items-center gap-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 active:scale-95 ${
          nextLabel && nextLabel.toLowerCase().includes("submit")
            ? "px-4 py-2.5 font-semibold text-sm"
            : "w-10 h-10 justify-center"
        }`}
        aria-label={nextLabel}
        aria-disabled={!!nextDisabled}
        title={`${nextLabel} (Press Enter or Space)`}
      >
        {nextLabel && nextLabel.toLowerCase().includes("submit") ? (
          <>
            <span>{nextLabel}</span>
            <ChevronRight className="h-4 w-4" />
          </>
        ) : (
          <ChevronRight className="h-5 w-5" />
        )}
      </button>
    </div>
  );
}


