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
  hasClearLocationInfo?: boolean;
  isAtDestination?: boolean;
}

const stepConfig: Record<TripStep, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  canProceed: (tripStage: string, hasClearInfo?: boolean) => boolean;
  color: {
    bg: string;
    hover: string;
    text: string;
  };
}> = {
  arrived_at_pickup: {
    label: 'Arrived at Pickup',
    icon: MapPin,
    description: 'Confirm you have arrived at the pickup location',
    canProceed: (stage, hasClearInfo?: boolean) => stage === 'accepted' && hasClearInfo === true,
    color: {
      bg: 'bg-blue-500',
      hover: 'hover:bg-blue-600',
      text: 'text-white',
    },
  },
  passenger_picked_up: {
    label: 'Passenger Picked Up',
    icon: User,
    description: 'Confirm the passenger is in your vehicle',
    canProceed: (stage) => stage === 'pickup',
    color: {
      bg: 'bg-purple-500',
      hover: 'hover:bg-purple-600',
      text: 'text-white',
    },
  },
  start_trip: {
    label: 'Start Trip',
    icon: Navigation,
    description: 'Begin navigation to destination',
    canProceed: (stage) => stage === 'picked_up',
    color: {
      bg: 'bg-indigo-500',
      hover: 'hover:bg-indigo-600',
      text: 'text-white',
    },
  },
  arrived_at_destination: {
    label: 'Arrived at Destination',
    icon: Flag,
    description: 'Confirm you have arrived at the destination',
    canProceed: (stage) => stage === 'in_transit',
    color: {
      bg: 'bg-orange-500',
      hover: 'hover:bg-orange-600',
      text: 'text-white',
    },
  },
  complete_trip: {
    label: 'Complete Trip',
    icon: CheckCircle,
    description: 'Finish the trip and collect payment',
    canProceed: (stage) => stage === 'arrived',
    color: {
      bg: 'bg-emerald-500',
      hover: 'hover:bg-emerald-600',
      text: 'text-white',
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
  hasClearLocationInfo = false,
  isAtDestination = false,
}: TripStepsProps) {
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
  
  // For "Arrived at Destination" step, require actual location verification
  const isDestinationStep = activeStep === 'arrived_at_destination';
  const isLocationVerified = isDestinationStep ? isAtDestination : true;
  const isDisabled = !isLocationVerified;

  return (
    <>
      {/* Current Step Button - Very Small with Step-Specific Colors */}
      {!isCompleted && canProceed && (
        <button
          onClick={() => {
            if (!isDisabled) {
              onStepClick(activeStep);
            }
          }}
          disabled={isDisabled}
          className={`${step.color.bg} ${step.color.text} ${step.color.hover} py-2 px-3 rounded-lg text-sm font-semibold active:scale-95 transition-all duration-200 flex items-center gap-2 shadow-lg ${
            isDisabled 
              ? 'opacity-40 cursor-not-allowed grayscale' 
              : ''
          }`}
          title={isDisabled ? 'Please arrive at the destination location first' : ''}
        >
          <Icon className="h-4 w-4 flex-shrink-0" />
          <span className="whitespace-nowrap">{step.label}</span>
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
        </button>
      )}
    </>
  );
}

