"use client";
import React, { useState, useEffect } from "react";
import DriverPageHeader from "@/components/DriverPageHeader";
import { Star } from "lucide-react";

// Star rating descriptions
const STAR_DESCRIPTIONS = {
  5: { label: "Excellent", description: "Outstanding service" },
  4: { label: "Very Good", description: "Great service" },
  3: { label: "Good", description: "Satisfactory service" },
  2: { label: "Fair", description: "Below average" },
  1: { label: "Poor", description: "Unsatisfactory" },
};

export default function DriverRatingPage() {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [stats, _setStats] = useState({
    averageRating: 4.7,
    totalReviews: 127,
    ratingBreakdown: {
      5: 85,
      4: 28,
      3: 10,
      2: 3,
      1: 1,
    },
  });

  useEffect(() => {
    // Fetch rating stats from API
    // const fetchStats = async () => {
    //   const response = await fetch('/api/driver/rating');
    //   const data = await response.json();
    //   setStats(data);
    // };
    // fetchStats();
  }, []);

  const getRatingPercentage = (starLevel: number) => {
    const count = stats.ratingBreakdown[starLevel as keyof typeof stats.ratingBreakdown] || 0;
    return stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
  };

  const activeRating = hoveredRating || rating;
  const activeDesc = activeRating > 0 ? STAR_DESCRIPTIONS[activeRating as keyof typeof STAR_DESCRIPTIONS] : null;

  return (
    <div className="w-full pb-4">
      <div className="mx-auto max-w-xl px-4">
        <div className="pt-2">
          <DriverPageHeader />
        </div>

        {/* Compact Rating Card */}
        <div className="mt-3 bg-white rounded-lg border border-slate-200 shadow-sm p-3">
          {/* Header - Rating Summary */}
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
            <div>
              <h1 className="text-base font-bold text-slate-900">Your Rating</h1>
              <p className="text-xs text-slate-600">{stats.totalReviews} reviews</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-bold text-slate-900">{stats.averageRating.toFixed(1)}</span>
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            </div>
          </div>

          {/* Rating Breakdown - Compact */}
          <div className="space-y-1.5 mb-3">
            {[5, 4, 3, 2, 1].map((starLevel) => {
              const percentage = getRatingPercentage(starLevel);
              const count = stats.ratingBreakdown[starLevel as keyof typeof stats.ratingBreakdown] || 0;
              
              return (
                <div key={starLevel} className="flex items-center gap-1.5 text-xs">
                  <div className="flex items-center gap-0.5 w-14 flex-shrink-0">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-2 w-2 ${
                          star <= starLevel
                            ? "fill-amber-400 text-amber-400"
                            : "fill-slate-200 text-slate-300"
                        }`}
                      />
                    ))}
                  </div>
                  <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="w-10 text-right text-slate-600 flex-shrink-0 text-xs">{count}</div>
                  <div className="w-8 text-right text-slate-500 flex-shrink-0 text-xs">{percentage.toFixed(0)}%</div>
                </div>
              );
            })}
          </div>

          {/* Interactive Star Guide - Compact */}
          <div className="pt-2 border-t border-slate-200">
            <p className="text-xs font-medium text-slate-700 mb-1.5">Rating Guide:</p>
            <div className="flex items-center justify-center gap-1 mb-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-all duration-200 hover:scale-110 active:scale-95"
                  aria-label={`${star} star`}
                >
                  <Star
                    className={`h-5 w-5 ${
                      star <= activeRating
                        ? "fill-amber-400 text-amber-400"
                        : "fill-slate-200 text-slate-300"
                    } transition-colors duration-200`}
                  />
                </button>
              ))}
            </div>
            {activeDesc && (
              <div className="text-center">
                <p className="text-xs font-medium text-slate-900">{activeRating}★ {activeDesc.label}</p>
                <p className="text-xs text-slate-600">{activeDesc.description}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
