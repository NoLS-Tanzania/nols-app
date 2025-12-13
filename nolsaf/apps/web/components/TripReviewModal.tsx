"use client";
import React, { useState } from "react";
import { Star, X } from "lucide-react";

interface TripReviewModalProps {
  isOpen: boolean;
  passengerName: string;
  tripFare: string;
  onClose: () => void;
  onSubmit: (rating: number, comment: string) => void;
}

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

  const handleSubmit = () => {
    if (rating > 0) {
      onSubmit(rating, "");
      // Reset form
      setRating(0);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center px-3 animate-fade-in-up">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200"
        onClick={onClose}
        aria-hidden
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-fade-in-up">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-blue-50">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Rate Your Trip</h2>
              <p className="text-xs text-slate-600 mt-0.5">How was your experience with {passengerName}?</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/80 transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5 text-slate-600" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Trip Summary */}
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Trip Fare</p>
                <p className="text-xl font-bold text-slate-900">{tripFare}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <span className="text-lg">✓</span>
              </div>
            </div>
          </div>

          {/* Rating Stars */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-700">Rate your experience</p>
            <div className="flex items-center justify-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform duration-200 hover:scale-110 active:scale-95"
                  aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= (hoveredRating || rating)
                        ? "fill-amber-400 text-amber-400"
                        : "fill-slate-200 text-slate-300"
                    } transition-colors duration-200`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-center text-xs text-slate-600">
                {rating === 1 && "Poor"}
                {rating === 2 && "Fair"}
                {rating === 3 && "Good"}
                {rating === 4 && "Very Good"}
                {rating === 5 && "Excellent"}
              </p>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-white transition-colors"
          >
            Skip
          </button>
          <button
            onClick={handleSubmit}
            disabled={rating === 0}
            className="flex-1 px-3 py-2 rounded-lg bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all duration-200 active:scale-95"
          >
            Submit Review
          </button>
        </div>
      </div>
    </div>
  );
}

