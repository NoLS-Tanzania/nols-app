"use client";

import { BedDouble, Bath, Users, FileText, Clock, Shield, CheckCircle2 } from "lucide-react";
import { AddPropertySection } from "./AddPropertySection";
import { StepFooter } from "./StepFooter";
import { StepHeader } from "./StepHeader";

type NumSetter = (v: number | "") => void;

export function TotalsStep({
  isVisible,
  sectionRef,
  totalBedrooms,
  totalBathrooms,
  setTotalBathrooms,
  maxGuests,
  setMaxGuests,
  desc,
  setDesc,
  acceptGroupBooking,
  setAcceptGroupBooking,
  houseRules,
  setHouseRules,
  goToPreviousStep,
  goToNextStep,
  currentStep,
}: {
  isVisible: boolean;
  sectionRef: (el: HTMLElement | null) => void;
  totalBedrooms: number | "";
  totalBathrooms: number | "";
  setTotalBathrooms: NumSetter;
  maxGuests: number | "";
  setMaxGuests: NumSetter;
  desc: string;
  setDesc: (v: string) => void;
  acceptGroupBooking: boolean;
  setAcceptGroupBooking: (v: boolean) => void;
  houseRules: {
    checkInFrom: string;
    checkInTo: string;
    checkOutFrom: string;
    checkOutTo: string;
    petsAllowed: boolean | null;
    petsNote: string;
    smokingNotAllowed: boolean | null;
    other: string;
  };
  setHouseRules: (updater: (prev: any) => any) => void;
  goToPreviousStep: () => void;
  goToNextStep: () => void;
  currentStep: number;
}) {
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
            step={4}
            title="Totals & description"
            description="Set totals and describe your property. You can refine these later."
          />
          <div className="pt-4 space-y-6">
            {/* Totals Section - Modern Card Design */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm transition-all duration-300 hover:shadow-md">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-1">Property Totals</h3>
                <p className="text-xs text-gray-500">Set the total number of bedrooms, bathrooms, and maximum guests.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Total Bedrooms */}
                <div className="group relative bg-gradient-to-br from-gray-50 to-white p-4 rounded-xl border-2 border-gray-200 hover:border-emerald-300 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center transition-all duration-300 group-hover:bg-emerald-200 group-hover:scale-110">
                      <BedDouble className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-gray-900 mb-1">
                        Total Bedrooms
                      </label>
                    </div>
                  </div>
                  <input
                    type="number"
                    value={totalBedrooms}
                    readOnly
                    className="w-full h-12 border-2 border-emerald-200 bg-emerald-50 rounded-xl px-4 text-sm font-bold text-emerald-700 cursor-not-allowed"
                    aria-label="Total Bedrooms (auto-filled)"
                  />
                  <div className="mt-2 text-xs text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Auto-filled from saved room types
                  </div>
                </div>

                {/* Total Bathrooms */}
                <div className="group relative bg-gradient-to-br from-gray-50 to-white p-4 rounded-xl border-2 border-gray-200 hover:border-emerald-300 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center transition-all duration-300 group-hover:bg-blue-200 group-hover:scale-110">
                      <Bath className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-gray-900 mb-1">
                        Total Bathrooms
                      </label>
                    </div>
                  </div>
                  <input
                    type="number"
                    value={totalBathrooms}
                    onChange={(e) => setTotalBathrooms(e.target.value ? Number(e.target.value) : "")}
                    min="0"
                    className="w-full h-12 border-2 border-gray-300 rounded-xl px-4 bg-white text-gray-900 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200 hover:border-gray-400"
                    placeholder="0"
                  />
                </div>

                {/* Max Guests */}
                <div className="group relative bg-gradient-to-br from-gray-50 to-white p-4 rounded-xl border-2 border-gray-200 hover:border-emerald-300 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center transition-all duration-300 group-hover:bg-purple-200 group-hover:scale-110">
                      <Users className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-gray-900 mb-1">
                        Max Guests
                      </label>
                    </div>
                  </div>
                  <input
                    type="number"
                    value={maxGuests}
                    onChange={(e) => setMaxGuests(e.target.value ? Number(e.target.value) : "")}
                    min="1"
                    className="w-full h-12 border-2 border-gray-300 rounded-xl px-4 bg-white text-gray-900 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200 hover:border-gray-400"
                    placeholder="1"
                  />
                </div>
              </div>
            </div>

            {/* Description Section - Modern Card Design */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm transition-all duration-300 hover:shadow-md">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">Property Description</label>
                  <p className="text-xs text-gray-500">Describe your property to help guests understand what to expect.</p>
                </div>
              </div>
              <textarea
                rows={5}
                className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200 hover:border-gray-400 resize-none"
                placeholder="Enter property description (e.g., location highlights, unique features, nearby attractions, etc.)"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
              />
            </div>

            {/* House Rules Section - Modern Card Design */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm transition-all duration-300 hover:shadow-md">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">House Rules</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    These will be shown to guests on the public property page.
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Check-in Time */}
                <div className="rounded-xl border-2 border-gray-200 bg-gradient-to-br from-gray-50 to-white p-4 shadow-sm transition-all duration-300 hover:shadow-md hover:border-emerald-300">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    <div className="text-xs font-semibold text-gray-900">Check-in time</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="houseRulesCheckInFrom" className="block text-[11px] text-gray-600 mb-1.5">
                        From
                      </label>
                      <input
                        id="houseRulesCheckInFrom"
                        type="time"
                        title="Check-in time (from)"
                        value={houseRules.checkInFrom}
                        onChange={(e) => setHouseRules((prev: any) => ({ ...prev, checkInFrom: e.target.value }))}
                        className="w-full h-11 rounded-xl border-2 border-gray-300 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200 hover:border-gray-400"
                      />
                    </div>
                    <div>
                      <label htmlFor="houseRulesCheckInTo" className="block text-[11px] text-gray-600 mb-1.5">
                        To
                      </label>
                      <input
                        id="houseRulesCheckInTo"
                        type="time"
                        title="Check-in time (to)"
                        value={houseRules.checkInTo}
                        onChange={(e) => setHouseRules((prev: any) => ({ ...prev, checkInTo: e.target.value }))}
                        className="w-full h-11 rounded-xl border-2 border-gray-300 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200 hover:border-gray-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Check-out Time */}
                <div className="rounded-xl border-2 border-gray-200 bg-gradient-to-br from-gray-50 to-white p-4 shadow-sm transition-all duration-300 hover:shadow-md hover:border-emerald-300">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    <div className="text-xs font-semibold text-gray-900">Check-out time</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="houseRulesCheckOutFrom" className="block text-[11px] text-gray-600 mb-1.5">
                        From
                      </label>
                      <input
                        id="houseRulesCheckOutFrom"
                        type="time"
                        title="Check-out time (from)"
                        value={houseRules.checkOutFrom}
                        onChange={(e) => setHouseRules((prev: any) => ({ ...prev, checkOutFrom: e.target.value }))}
                        className="w-full h-11 rounded-xl border-2 border-gray-300 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200 hover:border-gray-400"
                      />
                    </div>
                    <div>
                      <label htmlFor="houseRulesCheckOutTo" className="block text-[11px] text-gray-600 mb-1.5">
                        To
                      </label>
                      <input
                        id="houseRulesCheckOutTo"
                        type="time"
                        title="Check-out time (to)"
                        value={houseRules.checkOutTo}
                        onChange={(e) => setHouseRules((prev: any) => ({ ...prev, checkOutTo: e.target.value }))}
                        className="w-full h-11 rounded-xl border-2 border-gray-300 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200 hover:border-gray-400"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Pets */}
                <div className="rounded-xl border-2 border-gray-200 bg-gradient-to-br from-gray-50 to-white p-4 shadow-sm transition-all duration-300 hover:shadow-md hover:border-emerald-300">
                  <div className="text-xs font-semibold text-gray-900 mb-3">Pets Policy</div>
                  <div className="clean-toggle-container">
                    {[
                      { label: "Allowed", v: true },
                      { label: "Not allowed", v: false },
                    ].map((o) => {
                      const selected = houseRules.petsAllowed === o.v;
                      return (
                        <button
                          key={o.label}
                          type="button"
                          onClick={() => setHouseRules((prev: any) => ({ ...prev, petsAllowed: o.v }))}
                          className={`clean-toggle-option ${selected ? "clean-toggle-active" : ""}`}
                        >
                          {o.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-3">
                    <label className="block text-[11px] text-gray-600 mb-1.5">Notes (optional)</label>
                    <input
                      type="text"
                      value={houseRules.petsNote}
                      onChange={(e) => setHouseRules((prev: any) => ({ ...prev, petsNote: e.target.value }))}
                      className="w-full h-10 rounded-xl border-2 border-gray-300 bg-white px-3 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200 hover:border-gray-400"
                      placeholder='e.g. "Small pets only"'
                    />
                  </div>
                </div>

                {/* Smoking */}
                <div className="rounded-xl border-2 border-gray-200 bg-gradient-to-br from-gray-50 to-white p-4 shadow-sm transition-all duration-300 hover:shadow-md hover:border-emerald-300">
                  <div className="text-xs font-semibold text-gray-900 mb-3">Smoking Policy</div>
                  <div className="clean-toggle-container">
                    {[
                      { label: "Allowed", notAllowed: false },
                      { label: "Not allowed", notAllowed: true },
                    ].map((o) => {
                      const selected = houseRules.smokingNotAllowed === o.notAllowed;
                      return (
                        <button
                          key={o.label}
                          type="button"
                          onClick={() => setHouseRules((prev: any) => ({ ...prev, smokingNotAllowed: o.notAllowed }))}
                          className={`clean-toggle-option ${selected ? "clean-toggle-active" : ""}`}
                        >
                          {o.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Other Rules */}
              <div className="mt-4">
                <label className="block text-xs font-semibold text-gray-900 mb-2">
                  Other rules (optional)
                </label>
                <textarea
                  rows={3}
                  value={houseRules.other}
                  onChange={(e) => setHouseRules((prev: any) => ({ ...prev, other: e.target.value }))}
                  className="w-full rounded-xl border-2 border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200 hover:border-gray-400 resize-none"
                  placeholder="e.g. Quiet hours after 22:00, no outside visitors, etc."
                />
              </div>
            </div>

            {/* Group Booking Section - Modern Card Design */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm transition-all duration-300 hover:shadow-md">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">Group Booking</label>
                  <p className="text-xs text-gray-500">Allow multiple guests to book together</p>
                </div>
              </div>
              <div className="clean-toggle-container">
                <button
                  type="button"
                  onClick={() => setAcceptGroupBooking(true)}
                  className={`clean-toggle-option ${acceptGroupBooking === true ? "clean-toggle-active" : ""}`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setAcceptGroupBooking(false)}
                  className={`clean-toggle-option ${acceptGroupBooking === false ? "clean-toggle-active" : ""}`}
                >
                  No
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isVisible && (
        <StepFooter
          onPrev={goToPreviousStep}
          onNext={goToNextStep}
          prevDisabled={currentStep <= 0}
          nextDisabled={currentStep >= 5}
        />
      )}
    </AddPropertySection>
  );
}


