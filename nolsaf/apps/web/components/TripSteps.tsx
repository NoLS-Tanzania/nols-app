"use client";
import React from "react";
import { CheckCircle, MapPin, User, Navigation, Flag } from "lucide-react";

export type TripStep = 
  | 'arrived_at_pickup'
  | 'passenger_picked_up'
  | 'start_trip'
  | 'arrived_at_destination'
  | 'complete_trip';

interface TripStepsProps {
  currentStep: TripStep | null;
  completedSteps: TripStep[];
  onStepClick: (step: TripStep) => void;
  tripStage: string;
  mapTheme?: "light" | "dark";
  mapLayer?: "navigation" | "streets" | "outdoors" | "satellite";
  hasClearLocationInfo?: boolean;
  isAtPickup?: boolean;
  isAtDestination?: boolean;
  pickupCountdownMin?: number | null;
  destinationCountdownMin?: number | null;
}

const stepConfig: Record<TripStep, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  canProceed: (tripStage: string, hasClearInfo?: boolean) => boolean;
  color: {
    // Used by the modern pill button renderer below
    gradientFrom: string;
    gradientTo: string;
    glow: string;
  };
}> = {
  arrived_at_pickup: {
    label: 'Arrived at Pickup',
    icon: MapPin,
    description: 'Confirm you have arrived at the pickup location',
    canProceed: (stage, hasClearInfo?: boolean) => stage === 'accepted' && hasClearInfo === true,
    color: {
      gradientFrom: 'from-blue-600',
      gradientTo: 'to-blue-500',
      glow: 'bg-blue-500/30',
    },
  },
  passenger_picked_up: {
    label: 'Passenger Picked Up',
    icon: User,
    description: 'Confirm the passenger is in your vehicle',
    canProceed: (stage) => stage === 'pickup',
    color: {
      gradientFrom: 'from-violet-600',
      gradientTo: 'to-fuchsia-500',
      glow: 'bg-fuchsia-500/28',
    },
  },
  start_trip: {
    label: 'Start Trip',
    icon: Navigation,
    description: 'Begin navigation to destination',
    canProceed: (stage) => stage === 'picked_up',
    color: {
      gradientFrom: 'from-indigo-600',
      gradientTo: 'to-sky-500',
      glow: 'bg-sky-500/26',
    },
  },
  arrived_at_destination: {
    label: 'Arrived at Destination',
    icon: Flag,
    description: 'Confirm you have arrived at the destination',
    canProceed: (stage) => stage === 'in_transit',
    color: {
      gradientFrom: 'from-amber-500',
      gradientTo: 'to-orange-500',
      glow: 'bg-amber-400/28',
    },
  },
  complete_trip: {
    label: 'Complete Trip',
    icon: CheckCircle,
    description: 'Finish the trip and collect payment',
    canProceed: (stage) => stage === 'arrived',
    color: {
      gradientFrom: 'from-emerald-600',
      gradientTo: 'to-emerald-500',
      glow: 'bg-emerald-500/28',
    },
  },
};

const stepOrder: TripStep[] = [
  'arrived_at_pickup',
  'passenger_picked_up',
  'start_trip',
  'arrived_at_destination',
  'complete_trip',
];

export default function TripSteps({
  currentStep,
  completedSteps,
  onStepClick,
  tripStage,
  mapTheme = "light",
  mapLayer = "navigation",
  hasClearLocationInfo = false,
  isAtPickup = false,
  isAtDestination = false,
  pickupCountdownMin = null,
  destinationCountdownMin = null,
}: TripStepsProps) {
  const isDark = mapTheme === "dark";
  const isSatelliteDark = isDark && mapLayer === "satellite";
  const themed = (light: string, dark: string) => (isDark ? dark : light);

  const glassPill = isDark
    ? isSatelliteDark
      ? "bg-slate-950/65 border border-white/18 text-slate-50 hover:bg-slate-950/75 ring-1 ring-white/12"
      : "bg-slate-950/35 border border-white/12 text-slate-50 hover:bg-slate-950/45 ring-1 ring-white/10"
    : "bg-white/35 border border-white/45 text-slate-900 hover:bg-white/45 ring-1 ring-black/5";
  // Satellite+dark needs a little more contrast because imagery is visually busy.
  const pillLabel = isSatelliteDark ? "text-slate-100/80" : themed("text-slate-700/70", "text-slate-200/75");
  const pillValue = isSatelliteDark ? "text-slate-50/95" : themed("text-slate-900/90", "text-slate-50/95");
  const pillNumber = isSatelliteDark ? "text-white" : themed("text-slate-950/95", "text-white");
  const pillUnitStrong = isSatelliteDark ? "text-slate-100/85" : themed("text-slate-800/80", "text-slate-200/85");
  const pillUnit = isSatelliteDark ? "text-slate-100/75" : themed("text-slate-800/70", "text-slate-200/70");
  const pillCalc = isSatelliteDark ? "text-slate-100/85" : themed("text-slate-900/80", "text-slate-100/80");

  // Find the next available step (must be sequential, can't skip)
  const getNextAvailableStep = (): TripStep | null => {
    // Find the first incomplete step in order
    for (let i = 0; i < stepOrder.length; i++) {
      const step = stepOrder[i];
      // If this step is completed, continue to next
      if (completedSteps.includes(step)) {
        continue;
      }
      // Check if all previous steps are completed
      const allPreviousCompleted = stepOrder.slice(0, i).every(s => completedSteps.includes(s));
      // Only show if previous steps are done AND current stage allows it
      if (allPreviousCompleted && stepConfig[step].canProceed(tripStage, hasClearLocationInfo)) {
        return step;
      }
      // If previous steps aren't done, stop here (can't skip)
      if (!allPreviousCompleted) {
        return null;
      }
    }
    return null;
  };

  const nextStep = getNextAvailableStep();
  const activeStep = currentStep || nextStep;

  if (!activeStep) {
    return null; // No steps available
  }

  const step = stepConfig[activeStep];
  const Icon = step.icon;
  const isCompleted = completedSteps.includes(activeStep);
  const canProceed = step.canProceed(tripStage, hasClearLocationInfo);
  
  // For arrival confirmation steps, require actual location verification
  const isPickupStep = activeStep === 'arrived_at_pickup';
  const isDestinationStep = activeStep === 'arrived_at_destination';
  const isLocationVerified = isPickupStep ? isAtPickup : isDestinationStep ? isAtDestination : true;
  const isDisabled = !isLocationVerified;

  return (
    <>
      {/* Pickup countdown (before enabling arrival confirmation) */}
      {!isCompleted && canProceed && isPickupStep && !isAtPickup && (
        <div
          className={[
            "group relative overflow-hidden backdrop-blur-xl py-2.5 px-3.5 rounded-full shadow-[0_18px_60px_rgba(15,23,42,0.18)] flex items-center gap-3 transition-all duration-300 ease-out animate-fade-in-up",
            glassPill,
          ].join(" ")}
          title="Drive to pickup to enable confirmation"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-blue-200/0 via-blue-200/18 to-blue-200/0 opacity-80 animate-[pulse_3.2s_ease-in-out_infinite]" />

          <span className="relative flex-shrink-0">
            <span className="absolute -inset-1 rounded-full bg-blue-500/25 blur-sm" />
            <span className="relative h-9 w-9 rounded-full bg-gradient-to-br from-blue-600 to-blue-500 border border-white/60 flex items-center justify-center shadow-md">
              <MapPin className="h-4 w-4 text-white" />
            </span>
          </span>

          <span className="relative min-w-0 flex flex-col leading-tight">
            <span className={["text-[10px] uppercase tracking-wide font-semibold", pillLabel].join(" ")}>
              Arrival ETA
            </span>
            {typeof pickupCountdownMin === "number" && Number.isFinite(pickupCountdownMin) ? (
              <span className={["text-base font-semibold truncate", pillValue].join(" ")}>
                <span className={["text-xl font-extrabold tabular-nums animate-[pulse_2.6s_ease-in-out_infinite]", pillNumber].join(" ")}>
                  {pickupCountdownMin}
                </span>{" "}
                <span className={["font-semibold", pillUnitStrong].join(" ")}>min</span>{" "}
                <span className={["font-semibold", pillUnit].join(" ")}>to pickup</span>
              </span>
            ) : (
              <span className={["text-base font-semibold", pillCalc].join(" ")}>Calculating…</span>
            )}
          </span>

          <span
            className="relative ml-1 h-2.5 w-2.5 rounded-full bg-blue-600 shadow-[0_0_0_4px_rgba(37,99,235,0.18)] animate-[pulse_2.2s_ease-in-out_infinite]"
            aria-hidden="true"
          />
        </div>
      )}

      {/* Current Step Button - Very Small with Step-Specific Colors */}
      {!isCompleted && canProceed && isDestinationStep && !isAtDestination && (
        <div
          className={[
            "group relative overflow-hidden backdrop-blur-xl py-2.5 px-3.5 rounded-full shadow-[0_18px_60px_rgba(15,23,42,0.18)] flex items-center gap-3 transition-all duration-300 ease-out animate-fade-in-up",
            glassPill,
          ].join(" ")}
          title="Drive to destination to enable confirmation"
        >
          {/* soft animated wash (keeps it feeling alive) */}
          <span className="absolute inset-0 bg-gradient-to-r from-amber-200/0 via-amber-200/18 to-amber-200/0 opacity-80 animate-[pulse_3.2s_ease-in-out_infinite]" />

          <span className="relative flex-shrink-0">
            <span className="absolute -inset-1 rounded-full bg-amber-400/25 blur-sm" />
            <span className="relative h-9 w-9 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 border border-white/60 flex items-center justify-center shadow-md">
              <Flag className="h-4 w-4 text-white" />
            </span>
          </span>

          <span className="relative min-w-0 flex flex-col leading-tight">
            <span className={["text-[10px] uppercase tracking-wide font-semibold", pillLabel].join(" ")}>
              Arrival ETA
            </span>
            {typeof destinationCountdownMin === "number" && Number.isFinite(destinationCountdownMin) ? (
              <span className={["text-base font-semibold truncate", pillValue].join(" ")}>
                <span className={["text-xl font-extrabold tabular-nums animate-[pulse_2.6s_ease-in-out_infinite]", pillNumber].join(" ")}>
                  {destinationCountdownMin}
                </span>{" "}
                <span className={["font-semibold", pillUnitStrong].join(" ")}>min</span>{" "}
                <span className={["font-semibold", pillUnit].join(" ")}>to destination</span>
              </span>
            ) : (
              <span className={["text-base font-semibold", pillCalc].join(" ")}>Calculating…</span>
            )}
          </span>

          <span
            className="relative ml-1 h-2.5 w-2.5 rounded-full bg-amber-500 shadow-[0_0_0_4px_rgba(251,191,36,0.18)] animate-[pulse_2.2s_ease-in-out_infinite]"
            aria-hidden="true"
          />
        </div>
      )}

      {!isCompleted && canProceed && (!isPickupStep || isAtPickup) && (!isDestinationStep || isAtDestination) && (
        <button
          onClick={() => {
            if (!isDisabled) {
              onStepClick(activeStep);
            }
          }}
          disabled={isDisabled}
          className={[
            "group relative overflow-hidden rounded-full px-4 py-2.5 shadow-[0_18px_60px_rgba(15,23,42,0.22)] border",
            themed("ring-1 ring-black/10 border-white/40", "ring-1 ring-white/10 border-white/20"),
            "backdrop-blur-xl text-white transition-all duration-200 active:scale-[0.98]",
            isDisabled ? "opacity-40 cursor-not-allowed grayscale" : "hover:shadow-[0_22px_70px_rgba(15,23,42,0.28)]",
          ].join(" ")}
          title={isDisabled ? (isDestinationStep ? "Drive to destination to enable confirmation" : "Drive to pickup to enable confirmation") : ""}
        >
          {/* animated wash */}
          <span
            className={[
              "absolute inset-0 opacity-90",
              "bg-gradient-to-r",
              step.color.gradientFrom,
              step.color.gradientTo,
            ].join(" ")}
          />
          <span className="absolute inset-0 bg-gradient-to-r from-white/15 via-white/0 to-white/10" />

          {/* subtle glow behind icon */}
          <span className={["absolute -left-8 -top-10 h-24 w-24 rounded-full blur-2xl", step.color.glow].join(" ")} />

          <span className="relative flex items-center gap-3">
            <span className="relative flex-shrink-0">
              <span className={["absolute -inset-1 rounded-full blur-sm", step.color.glow].join(" ")} />
              <span className="relative h-9 w-9 rounded-full bg-white/18 border border-white/35 ring-1 ring-black/5 flex items-center justify-center shadow-md">
                <Icon className="h-4 w-4 text-white" />
              </span>
            </span>

            <span className="min-w-0 flex flex-col leading-tight text-left">
              <span className="text-[10px] uppercase tracking-wide font-semibold text-white/80">
                Next step
              </span>
              <span className="text-base font-extrabold tracking-tight whitespace-nowrap">
                {isDestinationStep ? "Confirm arrival" : step.label}
              </span>
            </span>

            <span className="ml-2 flex items-center gap-2">
              <span className="h-8 w-8 rounded-full bg-white/16 border border-white/30 ring-1 ring-black/5 flex items-center justify-center shadow-sm group-hover:bg-white/20 transition-colors">
                <CheckCircle className="h-4 w-4 text-white" />
              </span>
            </span>
          </span>
        </button>
      )}
    </>
  );
}

