"use client";

import { useState } from "react";
import {
  MapPin,
  Bus,
  Link as LinkIcon,
  ChevronDown,
  ChevronUp,
  Car,
  Bike,
  FootprintsIcon,
} from "lucide-react";
import type { ComponentType } from "react";

// Transport method to icon mapping
function getTransportIcon(mode: string): ComponentType<{ className?: string }> | null {
  const modeLower = mode.toLowerCase();
  if (modeLower.includes('walk') || modeLower === 'walking') return FootprintsIcon;
  if (modeLower.includes('car') || modeLower.includes('taxi')) return Car;
  if (modeLower.includes('boda') || modeLower.includes('motorcycle') || modeLower.includes('bike')) return Bike;
  if (modeLower.includes('public') || modeLower.includes('bus') || modeLower.includes('transport')) return Bus;
  return null;
}

type NearbyServicesProps = {
  facilities: any[];
  defaultExpanded?: boolean;
  showExpandButton?: boolean;
  maxInitialDisplay?: number;
};

export default function NearbyServices({
  facilities,
  defaultExpanded = false,
  showExpandButton = true,
  maxInitialDisplay = 2,
}: NearbyServicesProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (!facilities || facilities.length === 0) {
    return null;
  }

  const displayedFacilities = expanded ? facilities : facilities.slice(0, maxInitialDisplay);
  const hasMore = facilities.length > maxInitialDisplay;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-4 sm:mb-6">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#02665e]/10 text-[#02665e]">
          <MapPin className="w-5 h-5" aria-hidden />
        </span>
        <h2 className="text-lg sm:text-xl font-semibold text-slate-900">Nearby Services</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3">
        {displayedFacilities.map((facility: any, idx: number) => {
          return (
            <div
              key={idx}
              className="group relative rounded-lg sm:rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/30 p-3 sm:p-4 hover:border-[#02665e]/40 hover:shadow-md motion-safe:transition-all motion-safe:duration-200"
            >
              {/* Facility Name and Type */}
              <div className="flex items-start justify-between gap-2 sm:gap-3 mb-2 sm:mb-3">
                <div className="flex-1 min-w-0 pr-1">
                  {facility.name && (
                    <h3 className="text-sm sm:text-base font-semibold text-slate-900 mb-1 sm:mb-1.5 leading-tight line-clamp-2 sm:line-clamp-1">
                      {facility.name}
                    </h3>
                  )}
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    {facility.type && (
                      <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-medium bg-[#02665e]/10 text-[#02665e] border border-[#02665e]/20">
                        {facility.type}
                      </span>
                    )}
                    {facility.ownership && (
                      <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                        {facility.ownership}
                      </span>
                    )}
                  </div>
                </div>
                {facility.url && (
                  <a
                    href={facility.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-[#02665e] bg-[#02665e]/5 hover:bg-[#02665e]/10 border border-[#02665e]/20 motion-safe:transition-colors"
                    title="Visit website"
                  >
                    <LinkIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </a>
                )}
              </div>

              {/* Distance and Transport - Single Row */}
              <div className="flex items-center justify-between gap-2 sm:gap-3 pt-2 sm:pt-3 border-t border-slate-100">
                {typeof facility.distanceKm === 'number' && (
                  <div className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm font-medium text-rose-600">
                    <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="whitespace-nowrap">{facility.distanceKm} km</span>
                  </div>
                )}
                {Array.isArray(facility.reachableBy) && facility.reachableBy.length > 0 && (
                  <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap ml-auto">
                    {facility.reachableBy.map((mode: string, mIdx: number) => {
                      const TransportIcon = getTransportIcon(mode);

                      // All transport methods show as icons (including Public Transport)
                      return (
                        <span
                          key={mIdx}
                          className="inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60 hover:bg-emerald-100 motion-safe:transition-colors flex-shrink-0"
                          title={mode}
                          aria-label={mode}
                        >
                          {TransportIcon ? (
                            <TransportIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          ) : (
                            <span className="text-[8px] sm:text-[9px] font-medium">{mode.charAt(0)}</span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {hasMore && showExpandButton && (
        <div className="mt-2.5 sm:mt-3 flex justify-center">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] sm:text-xs font-medium text-[#02665e] bg-transparent hover:bg-[#02665e]/5 border-0 rounded-md motion-safe:transition-colors"
          >
            {expanded ? (
              <>
                <span>Show less</span>
                <ChevronUp className="h-3 w-3" />
              </>
            ) : (
              <>
                <span className="whitespace-nowrap">Show more ({facilities.length - maxInitialDisplay})</span>
                <ChevronDown className="h-3 w-3" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
