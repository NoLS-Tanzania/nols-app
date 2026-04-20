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
    <div>
      <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-4">Nearby Services</h2>
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        {displayedFacilities.map((facility: any, idx: number) => (
          <div
            key={idx}
            className={`flex items-center gap-4 p-4 sm:p-5 ${idx > 0 ? "border-t border-slate-100" : ""}`}
          >
            {/* Icon */}
            <div className="w-10 h-10 rounded-xl bg-[#02665e]/10 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-[#02665e]" />
            </div>

            {/* Name + type */}
            <div className="flex-1 min-w-0">
              {facility.name && (
                <div className="text-sm font-semibold text-slate-900 truncate">{facility.name}</div>
              )}
              <div className="flex items-center gap-2 mt-0.5">
                {facility.type && (
                  <span className="text-xs text-slate-500">{facility.type}</span>
                )}
                {typeof facility.distanceKm === 'number' && (
                  <span className="text-xs font-medium text-[#02665e]">{facility.distanceKm} km</span>
                )}
              </div>
            </div>

            {/* Transport icons */}
            {Array.isArray(facility.reachableBy) && facility.reachableBy.length > 0 && (
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {facility.reachableBy.map((mode: string, mIdx: number) => {
                  const TransportIcon = getTransportIcon(mode);
                  return (
                    <span
                      key={mIdx}
                      className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-50 text-slate-600 border border-slate-200"
                      title={mode}
                    >
                      {TransportIcon ? (
                        <TransportIcon className="h-3.5 w-3.5" />
                      ) : (
                        <span className="text-[9px] font-medium">{mode.charAt(0)}</span>
                      )}
                    </span>
                  );
                })}
              </div>
            )}

            {/* Link */}
            {facility.url && (
              <a
                href={facility.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-lg text-[#02665e] hover:bg-[#02665e]/5 transition-colors"
                title="Visit website"
              >
                <LinkIcon className="h-4 w-4" />
              </a>
            )}
          </div>
        ))}
      </div>
      {hasMore && showExpandButton && (
        <div className="mt-3 flex justify-center">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#02665e] hover:bg-[#02665e]/5 rounded-lg transition-colors"
          >
            {expanded ? (
              <>Show less <ChevronUp className="h-3 w-3" /></>
            ) : (
              <>Show more ({facilities.length - maxInitialDisplay}) <ChevronDown className="h-3 w-3" /></>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
