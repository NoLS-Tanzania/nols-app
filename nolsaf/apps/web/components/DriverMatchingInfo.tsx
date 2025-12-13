"use client";
import React from "react";
import { MapPin, Clock, Star, TrendingUp } from "lucide-react";

interface MatchedDriver {
  id: string;
  name: string;
  phone?: string;
  rating: number;
  level: "Silver" | "Gold" | "Diamond";
  distance: number;
  estimatedTime: number;
  acceptanceRate?: number;
}

interface DriverMatchingInfoProps {
  matchedDriver: MatchedDriver;
  isMatching?: boolean;
  className?: string;
}

export default function DriverMatchingInfo({
  matchedDriver,
  isMatching = false,
  className = "",
}: DriverMatchingInfoProps) {
  const getLevelColor = (level: string) => {
    switch (level) {
      case "Diamond":
        return "bg-gradient-to-r from-purple-500 to-pink-500";
      case "Gold":
        return "bg-gradient-to-r from-amber-400 to-yellow-500";
      case "Silver":
        return "bg-gradient-to-r from-slate-400 to-slate-500";
      default:
        return "bg-slate-500";
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case "Diamond":
        return "💎";
      case "Gold":
        return "🥇";
      case "Silver":
        return "🥈";
      default:
        return "⭐";
    }
  };

  if (isMatching) {
    return (
      <div className={`bg-white rounded-xl p-4 border border-slate-200 shadow-sm ${className}`}>
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent"></div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Finding best driver...</p>
            <p className="text-xs text-slate-500">Matching based on proximity, level, and rating</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl p-4 border border-slate-200 shadow-sm ${className}`}>
      <div className="flex items-start gap-3">
        {/* Driver Avatar */}
        <div className="relative">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-lg">
            {matchedDriver.name.charAt(0).toUpperCase()}
          </div>
          <div className={`absolute -bottom-1 -right-1 h-6 w-6 rounded-full ${getLevelColor(matchedDriver.level)} flex items-center justify-center text-white text-xs border-2 border-white`}>
            {getLevelIcon(matchedDriver.level)}
          </div>
        </div>

        {/* Driver Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-semibold text-slate-900 truncate">{matchedDriver.name}</h3>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold text-white ${getLevelColor(matchedDriver.level)}`}>
              {matchedDriver.level}
            </span>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-1 mb-2">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span className="text-sm font-medium text-slate-700">{matchedDriver.rating.toFixed(1)}</span>
            {matchedDriver.acceptanceRate && (
              <>
                <span className="text-slate-400 mx-1">•</span>
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-sm text-slate-600">{matchedDriver.acceptanceRate}% acceptance</span>
              </>
            )}
          </div>

          {/* Distance and ETA */}
          <div className="flex items-center gap-4 text-xs text-slate-600">
            <div className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-emerald-500" />
              <span>{matchedDriver.distance} km away</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-blue-500" />
              <span>~{matchedDriver.estimatedTime} min</span>
            </div>
          </div>
        </div>
      </div>

      {/* Matching Factors Info */}
      <div className="mt-3 pt-3 border-t border-slate-100">
        <p className="text-xs text-slate-500 mb-2">Matched based on:</p>
        <div className="flex flex-wrap gap-2">
          <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium">
            Proximity
          </span>
          <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
            {matchedDriver.level} Level
          </span>
          <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-medium">
            {matchedDriver.rating.toFixed(1)}★ Rating
          </span>
          {matchedDriver.acceptanceRate && matchedDriver.acceptanceRate >= 90 && (
            <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium">
              High Acceptance
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

