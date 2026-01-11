"use client";

import type { ReactNode } from "react";
import { CheckCircle2, XCircle, AlertCircle, ArrowRight } from "lucide-react";
import { AddPropertySection } from "./AddPropertySection";
import { StepFooter } from "./StepFooter";
import { StepHeader } from "./StepHeader";
import { PropertyReviewDisplay } from "./PropertyReviewDisplay";
import { PropertyVisualizationPreview } from "./PropertyVisualizationPreview";

type StepMeta = {
  index: number;
  title: string;
  completed: boolean;
};

interface ReviewData {
  title: string;
  type: string;
  location: {
    district?: string;
    regionName?: string;
    street?: string;
    city?: string;
  };
  rooms: Array<{
    roomType: string;
    roomsCount: number;
    pricePerNight: number;
    floorDistribution?: Record<number, number>;
  }>;
  buildingType: string;
  totalFloors: number | "";
  currency?: string | null;
}

type ReviewStepBaseProps = {
  isVisible: boolean;
  sectionRef: (el: HTMLElement | null) => void;
  goToPreviousStep: () => void;
  submitForReview: () => void | Promise<void>;
  submitDisabled: boolean;
};

type ReviewStepFullProps = ReviewStepBaseProps & {
  stepsMeta: readonly StepMeta[];
  completeEnough: boolean;
  onStepClick?: (stepIndex: number) => void;
  reviewData: ReviewData;
  children?: never;
};

type ReviewStepChildrenProps = ReviewStepBaseProps & {
  children: ReactNode;
  stepsMeta?: never;
  completeEnough?: never;
  onStepClick?: never;
  reviewData?: never;
};

type ReviewStepProps = ReviewStepFullProps | ReviewStepChildrenProps;

export function ReviewStep(props: ReviewStepProps) {
  const { isVisible, sectionRef, goToPreviousStep, submitForReview, submitDisabled } = props;

  const isChildrenMode = "children" in props;

  const stepsMeta = !isChildrenMode ? props.stepsMeta : undefined;
  const completeEnough = !isChildrenMode ? props.completeEnough : undefined;
  const onStepClick = !isChildrenMode ? props.onStepClick : undefined;
  const reviewData = !isChildrenMode ? props.reviewData : undefined;

  const completedCount = stepsMeta?.filter((s) => s.completed).length ?? 0;
  const totalSteps = stepsMeta?.length ?? 0;
  const incompleteSteps = stepsMeta?.filter((s) => !s.completed) ?? [];

  return (
    <AddPropertySection
      as="section"
      sectionRef={sectionRef}
      isVisible={isVisible}
      className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-sm"
    >
      {isVisible && (
        <div className="w-full">
          <StepHeader
            step={6}
            title="Review & submit"
            description="Check everything once. When ready, submit for review."
          />
          <div className="pt-4 space-y-6">
            {isChildrenMode ? (
              props.children
            ) : (
              <>
            {/* Completion Checklist - Modern Card Design */}
            <div className="rounded-xl border-2 border-gray-200 bg-gradient-to-br from-gray-50 to-white p-5 sm:p-6 shadow-sm transition-all duration-300 hover:shadow-md">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-base transition-all duration-300 ${
                    completeEnough
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}>
                    {completedCount}/{totalSteps}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Completion Checklist</h3>
                    <p className="text-xs text-gray-500">
                      {completeEnough ? "All steps completed" : `${totalSteps - completedCount} step(s) remaining`}
                    </p>
                  </div>
                </div>
                {completeEnough && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200/50">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-semibold text-emerald-700">Ready to submit</span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                {stepsMeta!.map((step) => {
                  return (
                    <div key={step.index} className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          // Security: Validate step index is within valid range
                          if (onStepClick && step.index >= 0 && step.index < totalSteps) {
                            onStepClick(step.index);
                          }
                        }}
                        className={`flex-1 flex items-center justify-between p-3 rounded-xl border-2 transition-all duration-300 ${
                          step.completed
                            ? "border-emerald-200 bg-emerald-50/50 hover:border-emerald-300 hover:bg-emerald-50"
                            : "border-amber-200 bg-amber-50/50 hover:border-amber-300 hover:bg-amber-50"
                        } ${onStepClick ? "cursor-pointer" : "cursor-default"}`}
                        disabled={!onStepClick}
                        title={onStepClick ? `Go to ${step.title}` : undefined}
                        aria-label={`${step.completed ? "Completed" : "Incomplete"}: ${step.title}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
                            step.completed
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          }`}>
                            {step.completed ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : (
                              <XCircle className="w-4 h-4" />
                            )}
                          </div>
                          <span className={`text-sm font-semibold ${
                            step.completed ? "text-emerald-700" : "text-amber-700"
                          }`}>
                            {step.title}
                          </span>
                        </div>
                        {onStepClick && (
                          <ArrowRight className={`w-4 h-4 transition-colors duration-300 ${
                            step.completed ? "text-emerald-600" : "text-amber-600"
                          }`} />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Validation Summary - Modern Card Design */}
            {!completeEnough && incompleteSteps.length > 0 && (
              <div className="rounded-xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 sm:p-6 shadow-sm">
                <div className="flex items-start gap-3 mb-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">Action Required</h3>
                    <p className="text-xs text-gray-600">Please complete the following steps before submitting:</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {incompleteSteps.map((step) => (
                    <div
                      key={step.index}
                      className="flex items-center gap-2 p-2.5 rounded-lg bg-white border border-amber-200"
                    >
                      <XCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{step.title}</span>
                      {onStepClick && (
                        <button
                          type="button"
                          onClick={() => {
                            // Security: Validate step index is within valid range
                            if (step.index >= 0 && step.index < totalSteps) {
                              onStepClick(step.index);
                            }
                          }}
                          className="ml-auto text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1 transition-colors"
                          aria-label={`Go to ${step.title} step`}
                        >
                          Go to step <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Review Content - Realistic Public View Display */}
            <div className="space-y-6">
              {/* Property Review Display - Matches Public View */}
              <PropertyReviewDisplay
                title={reviewData!.title}
                type={reviewData!.type}
                location={reviewData!.location}
                rooms={reviewData!.rooms}
                currency={reviewData!.currency}
              />

              {/* Property Visualization Preview - Floor Plan */}
              {reviewData!.rooms.length > 0 && (
                <PropertyVisualizationPreview
                  title={reviewData!.title}
                  buildingType={reviewData!.buildingType}
                  totalFloors={reviewData!.totalFloors}
                  rooms={reviewData!.rooms.map((r) => ({
                    roomType: r.roomType,
                    roomsCount: r.roomsCount,
                    floorDistribution: r.floorDistribution,
                  }))}
                />
              )}
            </div>
              </>
            )}
          </div>
        </div>
      )}

      {isVisible && (
        <StepFooter
          onPrev={goToPreviousStep}
          onNext={submitForReview}
          prevDisabled={false}
          nextDisabled={submitDisabled}
          nextLabel="Submit for review"
        />
      )}
    </AddPropertySection>
  );
}


