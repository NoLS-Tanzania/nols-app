"use client";
import React, { useState } from "react";
import { Star, CheckCircle2 } from "lucide-react";

interface TripReviewModalProps {
  isOpen: boolean;
  passengerName: string;
  tripFare: string;
  onClose: () => void;
  onSubmit: (rating: number, comment: string) => void;
}

const LABELS = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

export default function TripReviewModal({
  isOpen,
  passengerName,
  tripFare,
  onClose,
  onSubmit,
}: TripReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);

  if (!isOpen) return null;

  const active = hoveredRating || rating;

  const handleSubmit = () => {
    if (rating > 0) {
      onSubmit(rating, "");
      setRating(0);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center px-3 pb-4 sm:pb-0">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Card */}
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl shadow-[0_32px_80px_rgba(2,102,94,0.22)] animate-fade-in-up">

        {/* ── Rich teal header ── */}
        <div className="bg-gradient-to-br from-[#02665e] to-[#014d47] px-6 pt-6 pb-8">
          {/* Trip complete badge */}
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="h-5 w-5 text-white/80" />
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Trip Completed</span>
          </div>

          {/* Passenger avatar + name */}
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-white/15 ring-2 ring-white/25 flex items-center justify-center text-2xl font-black text-white flex-shrink-0">
              {passengerName?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-xl font-extrabold text-white leading-tight">{passengerName}</p>
              <p className="text-[11px] text-white/55 mt-0.5 font-medium">Passenger</p>
            </div>
            {/* Fare — flush right */}
            <div className="ml-auto text-right">
              <p className="text-2xl font-black text-white leading-tight">{tripFare}</p>
              <p className="text-[10px] text-white/50 uppercase tracking-wide font-semibold">Fare</p>
            </div>
          </div>
        </div>

        {/* ── White body ── */}
        <div className="bg-white px-6 pt-6 pb-5 space-y-5">

          {/* Stars */}
          <div className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 text-center">
              How was your experience?
            </p>

            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform duration-150 hover:scale-125 active:scale-95"
                  aria-label={`Rate ${star} star${star !== 1 ? "s" : ""}`}
                >
                  <Star
                    className={[
                      "h-10 w-10 transition-all duration-150",
                      star <= active
                        ? "fill-amber-400 text-amber-400 drop-shadow-[0_2px_8px_rgba(251,191,36,0.45)]"
                        : "fill-slate-100 text-slate-200",
                    ].join(" ")}
                  />
                </button>
              ))}
            </div>

            {/* Label */}
            <div className="h-5 flex items-center justify-center">
              {active > 0 && (
                <span className="text-sm font-bold text-[#02665e]">
                  {LABELS[active]}
                </span>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-100" />

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-[0.45] py-3 rounded-2xl border border-slate-200 text-slate-500 text-sm font-semibold hover:bg-slate-50 active:scale-[0.98] transition-all duration-150"
            >
              Skip
            </button>
            <button
              onClick={handleSubmit}
              disabled={rating === 0}
              className="flex-1 py-3 rounded-2xl bg-[#02665e] text-white text-sm font-bold shadow-md shadow-[#02665e]/30 hover:bg-[#024d47] disabled:opacity-35 disabled:cursor-not-allowed active:scale-[0.98] transition-all duration-150"
            >
              Submit Rating
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

