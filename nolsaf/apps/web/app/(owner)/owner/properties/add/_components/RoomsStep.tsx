"use client";

import Image from "next/image";
import PicturesUploader from "@/components/PicturesUploader";
import type { Dispatch, SetStateAction } from "react";
import { Minus, Plus, Lock, CheckCircle2, ChevronDown } from "lucide-react";
import { BATHROOM_ICONS, OTHER_AMENITIES_ICONS } from "@/lib/amenityIcons";
import { useEffect, useMemo, useState } from "react";
import { AddPropertySection } from "./AddPropertySection";
import { StepFooter } from "./StepFooter";
import { StepHeader } from "./StepHeader";

export function RoomsStep({
  isVisible,
  sectionRef,
  currentStep,
  goToPreviousStep,
  goToNextStep,
  buildingType,
  totalFloors,
  roomType,
  setRoomType,
  beds,
  changeBed,
  roomsCount,
  setRoomsCount,
  roomFloors,
  setRoomFloors,
  roomFloorDistribution,
  setRoomFloorDistribution,
  smoking,
  setSmoking,
  bathPrivate,
  setBathPrivate,
  bathItems,
  setBathItems,
  towelColor,
  setTowelColor,
  otherAmenities,
  setOtherAmenities,
  otherAmenitiesText,
  setOtherAmenitiesText,
  roomDescription,
  setRoomDescription,
  roomImages,
  onPickRoomImages,
  setRoomImages,
  roomImageSaved,
  setRoomImageSaved,
  roomImageUploading,
  setRoomImageUploading,
  pricePerNight,
  setPricePerNight,
  addRoomType,
  definedRooms,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setDefinedRooms,
  numOrEmpty,
  toggleStr,
  BED_ICONS,
}: {
  isVisible: boolean;
  sectionRef: (el: HTMLElement | null) => void;
  currentStep: number;
  goToPreviousStep: () => void;
  goToNextStep: () => void;
  buildingType: string;
  totalFloors: number | "";
  roomType: string;
  setRoomType: (v: string) => void;
  beds: Record<string, number>;
  changeBed: (k: string, delta: number) => void;
  roomsCount: number | "";
  setRoomsCount: (v: number | "") => void;
  roomFloors: number[];
  setRoomFloors: Dispatch<SetStateAction<number[]>>;
  roomFloorDistribution: Record<number, number>;
  setRoomFloorDistribution: Dispatch<SetStateAction<Record<number, number>>>;
  smoking: "yes" | "no";
  setSmoking: (v: "yes" | "no") => void;
  bathPrivate: "yes" | "no";
  setBathPrivate: (v: "yes" | "no") => void;
  bathItems: string[];
  setBathItems: (v: string[]) => void;
  towelColor: string;
  setTowelColor: (v: string) => void;
  otherAmenities: string[];
  setOtherAmenities: (v: string[]) => void;
  otherAmenitiesText: string;
  setOtherAmenitiesText: (v: string) => void;
  roomDescription: string;
  setRoomDescription: (v: string) => void;
  roomImages: string[];
  onPickRoomImages: (files: FileList) => void;
  setRoomImages: (updater: (prev: string[]) => string[]) => void;
  roomImageSaved: boolean[];
  setRoomImageSaved: (updater: (prev: boolean[]) => boolean[]) => void;
  roomImageUploading: boolean[];
  setRoomImageUploading: (updater: (prev: boolean[]) => boolean[]) => void;
  pricePerNight: number | "";
  setPricePerNight: (v: number | "") => void;
  addRoomType: () => void;
  definedRooms: any[];
  setDefinedRooms: (updater: (prev: any[]) => any[]) => void;
  numOrEmpty: (v: any) => number | "";
  toggleStr: (arr: string[], setArr: (v: string[]) => void, item: string) => void;
  BED_ICONS: Record<string, any>;
}) {
  const bedsPerRoom = useMemo(() => {
    return Object.values(beds || {}).reduce((sum, n) => sum + (Number(n) || 0), 0);
  }, [beds]);

  const roomCountNum = typeof roomsCount === "number" ? roomsCount : 0;
  const totalBeds = bedsPerRoom * (roomCountNum || 0);

  const roomTypeOk = String(roomType || "").trim().length > 0;
  const roomsCountOk = roomCountNum > 0;
  const bedsOk = bedsPerRoom > 0;
  const roomImagesOk = (roomImages?.length ?? 0) >= 3;
  const MIN_PRICE = 5000; // Minimum price in TZS
  const priceOk = Number(pricePerNight) >= MIN_PRICE;

  const isMultiStorey = buildingType === "multi_storey";
  const floorsCountNum = Number(totalFloors);
  const floorOptions = useMemo(() => {
    if (!isMultiStorey) return [];
    const n = Number.isFinite(floorsCountNum) ? floorsCountNum : 0;
    if (n < 2) return [];
    return Array.from({ length: n }, (_, i) => i); // 0 = Ground
  }, [isMultiStorey, floorsCountNum]);

  const floorLabel = (f: number) => {
    if (f === 0) return "Ground";
    const mod100 = f % 100;
    const mod10 = f % 10;
    const suffix = mod100 >= 11 && mod100 <= 13 ? "th" : mod10 === 1 ? "st" : mod10 === 2 ? "nd" : mod10 === 3 ? "rd" : "th";
    return `${f}${suffix}`;
  };

  const floorDistSum = useMemo(() => {
    return (roomFloors || []).reduce((sum, f) => sum + (Number(roomFloorDistribution?.[f]) || 0), 0);
  }, [roomFloors, roomFloorDistribution]);

  const floorsOk = !isMultiStorey || (roomFloors.length > 0 && roomsCountOk && floorDistSum === roomCountNum);
  const canAddRoomType = roomTypeOk && roomsCountOk && bedsOk && roomImagesOk && priceOk && floorsOk;

  // Initialize + keep distribution consistent
  useEffect(() => {
    if (!isMultiStorey) return;
    if (floorOptions.length === 0) return;

    // Default to Ground floor selected on first entry
    if ((roomFloors?.length ?? 0) === 0) {
      setRoomFloors([0]);
      setRoomFloorDistribution({ 0: roomCountNum || 0 });
      return;
    }

    // Prune floors that are no longer valid
    setRoomFloors((prev) => prev.filter((f) => floorOptions.includes(f)));
  }, [isMultiStorey, floorOptions, roomCountNum, roomFloors?.length, setRoomFloors, setRoomFloorDistribution]);

  useEffect(() => {
    if (!isMultiStorey) return;
    // Ensure distribution keys exist only for selected floors
    setRoomFloorDistribution((prev) => {
      const next: Record<number, number> = {};
      for (const f of roomFloors || []) next[f] = Number(prev?.[f]) || 0;
      return next;
    });
  }, [isMultiStorey, roomFloors, setRoomFloorDistribution]);

  useEffect(() => {
    if (!isMultiStorey) return;
    if (!roomCountNum || roomCountNum <= 0) return;
    if (!roomFloors || roomFloors.length === 0) return;

    // Adjust distribution to match roomCountNum (keep existing allocations as much as possible)
    setRoomFloorDistribution((prev) => {
      const next: Record<number, number> = {};
      for (const f of roomFloors) next[f] = Number(prev?.[f]) || 0;

      const current = roomFloors.reduce((sum, f) => sum + (next[f] || 0), 0);
      if (current === roomCountNum) return next;

      if (current === 0) {
        next[roomFloors[0]] = roomCountNum;
        return next;
      }

      if (current < roomCountNum) {
        next[roomFloors[0]] = (next[roomFloors[0]] || 0) + (roomCountNum - current);
        return next;
      }

      // current > roomCountNum: reduce from the last floor backwards
      let over = current - roomCountNum;
      for (let i = roomFloors.length - 1; i >= 0 && over > 0; i--) {
        const f = roomFloors[i];
        const take = Math.min(next[f] || 0, over);
        next[f] = (next[f] || 0) - take;
        over -= take;
      }
      return next;
    });
  }, [isMultiStorey, roomCountNum, roomFloors, setRoomFloorDistribution]);

  const [collapsed, setCollapsed] = useState<Set<number>>(() => new Set());
  useEffect(() => {
    // Collapse newly-added room types by default (keeps user-expanded ones expanded).
    setCollapsed((prev) => {
      const next = new Set(prev);
      for (let i = 0; i < (definedRooms?.length ?? 0); i++) next.add(i);
      return next;
    });
  }, [definedRooms?.length]);

  const toggleCollapsed = (idx: number) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

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
            step={2}
            title="Room types"
            description="Define each room type, the beds per room, how many rooms you have, and upload room photos."
          />
          <div className="pt-4">
            {/* Status row - Modern Design */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border-2 border-gray-200 bg-gradient-to-br from-gray-50 to-white px-4 sm:px-5 py-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                    definedRooms.length > 0
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}>
                    {definedRooms.length}
                  </div>
                  <div className="text-sm text-gray-700">
                    <span className="font-semibold text-gray-900">Saved room types</span>
                    <span className="text-gray-500 mx-1">·</span>
                    <span className="text-gray-600">Need </span>
                    <span className="font-bold text-emerald-600">1+</span>
                    <span className="text-gray-600"> to continue</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200/50">
                <div className="text-xs font-semibold text-emerald-700">
                  Beds are <span className="font-bold">per room</span>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-6">
              {/* Room setup card - Modern Design */}
              <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm transition-all duration-300 hover:shadow-md">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">Room setup</h3>
                  <p className="text-xs text-gray-500">
                    Pick a room type, set beds per room, and the number of rooms you have.
                  </p>
                </div>

              {/* Room Type Selection - Modern Card Design */}
              <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm transition-all duration-300 hover:shadow-md">
                <label className="block text-sm font-semibold text-gray-900 mb-4">
                  What type of room is this? <span className="text-red-500">*</span>
                </label>
                <div
                  role="radiogroup"
                  aria-labelledby="roomTypeLabel"
                  className="grid grid-cols-2 sm:grid-cols-3 gap-3"
                >
                  {["Single", "Double", "Studio", "Suite", "Family", "Other"].map((rt) => {
                    const selected = roomType === rt;
                    // Check if this room type is already saved in definedRooms
                    const isCompleted = definedRooms.some((r) => r.roomType === rt);
                    
                    return (
                      <label
                        key={rt}
                        className={`group relative bg-gradient-to-br from-gray-50 to-white p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 ${
                          isCompleted && !selected
                            ? "border-amber-300 hover:border-amber-400"
                            : selected
                            ? "border-emerald-500 shadow-md shadow-emerald-500/20"
                            : "border-gray-200 hover:border-emerald-300"
                        }`}
                        onClick={() => {
                          // Always allow clicking to select (for new or editing)
                          setRoomType(rt);
                        }}
                      >
                        <input
                          type="radio"
                          name="roomType"
                          value={rt}
                          checked={selected}
                          onChange={(e) => setRoomType(e.target.value)}
                          className="sr-only"
                        />
                        <div className="flex items-center justify-center">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 mr-3 ${
                            selected
                              ? "bg-emerald-100 group-hover:bg-emerald-200 group-hover:scale-110"
                              : isCompleted
                              ? "bg-amber-100 group-hover:bg-amber-200"
                              : "bg-gray-100 group-hover:bg-emerald-100"
                          }`}>
                            <span className={`text-lg font-bold transition-colors duration-300 ${
                              selected
                                ? "text-emerald-600"
                                : isCompleted
                                ? "text-amber-600"
                                : "text-gray-600"
                            }`}>
                              {rt.charAt(0)}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className={`text-sm font-semibold transition-colors duration-300 ${
                              selected
                                ? "text-emerald-700"
                                : isCompleted
                                ? "text-amber-700"
                                : "text-gray-900"
                            }`}>
                              {rt}
                            </div>
                          </div>
                        </div>
                        {selected && !isCompleted && (
                          <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse border-2 border-white" />
                        )}
                        {isCompleted && !selected && (
                          <div className="absolute top-2 right-2 flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4 text-amber-600" />
                            <Lock className="w-3 h-3 text-amber-500" />
                          </div>
                        )}
                        {isCompleted && selected && (
                          <div className="absolute top-2 right-2 flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span className="text-xs text-emerald-600 font-medium">Editing</span>
                          </div>
                        )}
                      </label>
                    );
                  })}
                </div>
                {definedRooms.length > 0 && (
                  <p className="mt-4 text-xs text-gray-500 flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    Completed room types are marked. Click to edit an existing room type.
                  </p>
                )}
              </div>

              {/* Beds Selection Section - Modern Card Design */}
              <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm transition-all duration-300 hover:shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-gray-900 mb-1">
                      What beds are available in this room? <span className="text-gray-500 font-normal">(per room)</span>
                    </label>
                    <p className="text-xs text-gray-500">Use + / − to set beds inside each room.</p>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-lg px-4 py-2.5 border border-emerald-200/50">
                    <div className="text-xs font-bold text-emerald-700">{bedsPerRoom} beds / room</div>
                    <div className="text-xs text-emerald-600 mt-0.5">
                      {roomCountNum ? `${bedsPerRoom} × ${roomCountNum} = ${totalBeds} total beds` : "Set rooms count to see totals"}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {["twin", "full", "queen", "king"].map((k) => {
                    const BedIcon = BED_ICONS[k];
                    const bedCount = beds[k] ?? 0;
                    return (
                      <div 
                        key={k} 
                        className="group relative bg-gradient-to-br from-gray-50 to-white p-4 rounded-xl border-2 border-gray-200 hover:border-emerald-300 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {BedIcon && (
                              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center transition-all duration-300 group-hover:bg-emerald-200 group-hover:scale-110">
                                <BedIcon className="w-5 h-5 text-emerald-600" />
                              </div>
                            )}
                            <div>
                              <div className="text-sm font-semibold text-gray-900 capitalize">{k} bed</div>
                              <div className="text-xs text-gray-500">per room</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              aria-label={`Remove one ${k} bed`}
                              onClick={() => changeBed(k, -1)}
                              disabled={bedCount === 0}
                              className="inline-flex items-center justify-center h-9 w-9 rounded-lg border-2 border-gray-300 bg-white text-gray-600 hover:bg-gray-50 hover:border-emerald-400 hover:text-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 active:scale-95"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <div className="w-14 h-9 flex items-center justify-center rounded-lg border-2 border-emerald-200 bg-emerald-50 text-sm font-bold text-emerald-700 transition-all duration-200">
                              {bedCount}
                            </div>
                            <button
                              type="button"
                              aria-label={`Add one ${k} bed`}
                              onClick={() => changeBed(k, 1)}
                              className="inline-flex items-center justify-center h-9 w-9 rounded-lg border-2 border-gray-300 bg-white text-gray-600 hover:bg-emerald-50 hover:border-emerald-400 hover:text-emerald-600 transition-all duration-200 active:scale-95"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {roomCountNum > 0 && bedsPerRoom === 0 ? (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 flex items-center gap-2">
                    <span>⚠️</span>
                    <span>You set room count but no beds per room. Add at least 1 bed type.</span>
                  </div>
                ) : null}
                {roomCountNum === 0 && bedsPerRoom > 0 ? (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 flex items-center gap-2">
                    <span>⚠️</span>
                    <span>You set beds per room but room count is empty. Add rooms count to continue.</span>
                  </div>
                ) : null}
              </div>

              {/* Room Count and Smoking Section - Modern Grid Layout */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-md">
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    How many rooms of this type do you have? <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={roomsCount as any}
                    onChange={(e) => setRoomsCount(numOrEmpty(e.target.value))}
                    type="number"
                    min={1}
                    placeholder="e.g. 3"
                    className="w-full h-12 border-2 border-gray-300 rounded-xl px-4 bg-white text-gray-900 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200 hover:border-gray-400"
                  />
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-md">
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    Is smoking allowed in this room?
                  </label>
                  <div className="clean-toggle-container">
                    <button
                      type="button"
                      onClick={() => setSmoking("yes")}
                      className={`clean-toggle-option ${smoking === "yes" ? "clean-toggle-active" : ""}`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setSmoking("no")}
                      className={`clean-toggle-option ${smoking === "no" ? "clean-toggle-active" : ""}`}
                    >
                      No
                    </button>
                  </div>
                </div>
              </div>

              {/* Room location / floors - Modern Card Design */}
              <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm transition-all duration-300 hover:shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-900 mb-1">Room location</div>
                    <div className="text-xs text-gray-500">
                      {buildingType === "single_storey"
                        ? "Single storey: all rooms will be placed on the ground floor."
                        : buildingType === "separate_units"
                          ? "Separate units: rooms are spread across different blocks (no floor levels)."
                          : "Multi‑storey: select floors and distribute rooms across them."}
                    </div>
                  </div>
                  {isMultiStorey && floorOptions.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (!roomFloors || roomFloors.length === 0 || !roomCountNum) return;
                        const base = Math.floor(roomCountNum / roomFloors.length);
                        const extra = roomCountNum % roomFloors.length;
                        const next: Record<number, number> = {};
                        roomFloors.forEach((f, idx) => {
                          next[f] = base + (idx < extra ? 1 : 0);
                        });
                        setRoomFloorDistribution(next);
                      }}
                      className="px-4 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!isMultiStorey || roomFloors.length === 0 || roomCountNum <= 0}
                    >
                      Auto distribute
                    </button>
                  ) : null}
                </div>

                {isMultiStorey ? (
                  <div className="space-y-4">
                    {floorOptions.length === 0 ? (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                        Please set <span className="font-semibold">Total floors</span> in Step 1 (Basics) to enable floor selection.
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-wrap gap-2">
                          {floorOptions.map((f) => {
                            const selected = roomFloors.includes(f);
                            return (
                              <button
                                key={f}
                                type="button"
                                onClick={() => {
                                  setRoomFloors((prev) => {
                                    const has = prev.includes(f);
                                    const next = has ? prev.filter((x) => x !== f) : [...prev, f].sort((a, b) => a - b);
                                    return next;
                                  });
                                  setRoomFloorDistribution((prev) => {
                                    const next = { ...prev };
                                    if (roomFloors.includes(f)) {
                                      delete (next as any)[f];
                                    } else {
                                      next[f] = next[f] ?? 0;
                                    }
                                    return next;
                                  });
                                }}
                                className={`px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all duration-300 ${
                                  selected
                                    ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-md scale-105"
                                    : "border-gray-200 bg-white text-gray-700 hover:border-emerald-300 hover:bg-emerald-50/50 hover:shadow-sm"
                                }`}
                                aria-pressed={selected}
                              >
                                {floorLabel(f)}
                              </button>
                            );
                          })}
                        </div>

                        {roomFloors.length === 0 ? (
                          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                            <span>⚠️</span>
                            <span>Select at least one floor for this room type.</span>
                          </div>
                        ) : null}

                        {roomFloors.length > 0 ? (
                          <div className="rounded-xl border-2 border-gray-200 bg-gradient-to-br from-gray-50 to-white p-4 shadow-sm">
                            <div className="flex items-center justify-between gap-3 mb-4">
                              <div className="text-xs text-gray-600">
                                Distribute <span className="font-bold text-gray-900">{roomCountNum || 0}</span> room(s) across selected floors
                              </div>
                              <div className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                                floorDistSum === (roomCountNum || 0)
                                  ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                  : "bg-amber-100 text-amber-700 border border-amber-200"
                              }`}>
                                {floorDistSum}/{roomCountNum || 0}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {roomFloors.map((f) => (
                                <div
                                  key={f}
                                  className="group bg-white p-4 rounded-xl border-2 border-gray-200 hover:border-emerald-300 transition-all duration-300 hover:shadow-md"
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                      <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center transition-all duration-300 group-hover:bg-emerald-200">
                                        <span className="text-xs font-bold text-emerald-600">{f === 0 ? "G" : f}</span>
                                      </div>
                                      <div className="text-sm font-semibold text-gray-900">{floorLabel(f)} floor</div>
                                    </div>
                                    <input
                                      type="number"
                                      min={0}
                                      value={(roomFloorDistribution?.[f] ?? 0) as any}
                                      onChange={(e) => {
                                        const v = e.target.value ? parseInt(e.target.value, 10) : 0;
                                        setRoomFloorDistribution((prev) => ({ ...prev, [f]: Number.isFinite(v) ? Math.max(0, v) : 0 }));
                                      }}
                                      className="w-20 h-10 text-center rounded-lg border-2 border-emerald-200 bg-emerald-50 text-sm font-bold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200"
                                      aria-label={`Rooms on ${floorLabel(f)} floor`}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>

                            {roomCountNum > 0 && floorDistSum !== roomCountNum ? (
                              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 flex items-center gap-2">
                                <span>⚠️</span>
                                <span>Room distribution ({floorDistSum}) does not match total rooms ({roomCountNum}). Adjust the numbers.</span>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                ) : null}
              </div>
              </div>

              {/* Bathroom & amenities card - Modern Card Design */}
              <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm transition-all duration-300 hover:shadow-md">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">Bathroom & amenities</h3>
                  <p className="text-xs text-gray-500">Bathroom privacy and available room amenities.</p>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="min-w-0 space-y-4">
                    <div>
                      <label className="text-sm font-semibold text-gray-900 mb-3 block">Is the bathroom private?</label>
                      <div className="clean-toggle-container">
                        <button
                          type="button"
                          onClick={() => setBathPrivate("yes")}
                          className={`clean-toggle-option ${bathPrivate === "yes" ? "clean-toggle-active" : ""}`}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => setBathPrivate("no")}
                          className={`clean-toggle-option ${bathPrivate === "no" ? "clean-toggle-active" : ""}`}
                        >
                          No, shared
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-900 mb-2 block">
                        Towel color <span className="text-gray-500 font-normal">(optional)</span>
                      </label>
                      <input
                        value={towelColor}
                        onChange={(e) => setTowelColor(e.target.value)}
                        className="w-full h-12 border-2 border-gray-300 rounded-xl px-4 bg-white text-gray-900 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200 hover:border-gray-400"
                        placeholder="e.g. white"
                      />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <label className="text-sm font-semibold text-gray-900 mb-3 block">Bathroom items</label>
                    <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {(() => {
                        // Color mapping for each bathroom item icon - faint/subtle colors
                        const iconColors: Record<string, { bg: string; text: string }> = {
                          "Free toiletries": { bg: "bg-yellow-100", text: "text-yellow-600" },
                          "Toilet paper": { bg: "bg-stone-100", text: "text-stone-600" },
                          "Shower": { bg: "bg-blue-100", text: "text-blue-600" },
                          "Water Heater": { bg: "bg-red-100", text: "text-red-600" },
                          "Toilet": { bg: "bg-slate-100", text: "text-slate-600" },
                          "Hairdryer": { bg: "bg-pink-100", text: "text-pink-600" },
                          "Trash Bin": { bg: "bg-gray-100", text: "text-gray-600" },
                          "Toilet Brush": { bg: "bg-cyan-100", text: "text-cyan-600" },
                          "Mirror": { bg: "bg-slate-100", text: "text-slate-600" },
                          "Slippers": { bg: "bg-amber-100", text: "text-amber-600" },
                          "Bathrobe": { bg: "bg-rose-100", text: "text-rose-600" },
                          "Bath Mat": { bg: "bg-teal-100", text: "text-teal-600" },
                          "Towel": { bg: "bg-sky-100", text: "text-sky-600" },
                        };
                        
                        return [
                          "Free toiletries",
                          "Toilet paper",
                          "Shower",
                          "Water Heater",
                          "Toilet",
                          "Hairdryer",
                          "Trash Bin",
                          "Toilet Brush",
                          "Mirror",
                          "Slippers",
                          "Bathrobe",
                          "Bath Mat",
                          "Towel",
                        ].map((i) => {
                          const Icon = (BATHROOM_ICONS as any)[i];
                          const isChecked = bathItems.includes(i);
                          const colors = iconColors[i] || { bg: "bg-gray-100", text: "text-gray-600" };
                          return (
                            <label
                              key={i}
                              className={`group relative flex items-center gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition-all duration-300 ease-in-out ${
                                isChecked
                                  ? "border-emerald-500 bg-gradient-to-br from-emerald-50 to-emerald-100/50 shadow-md shadow-emerald-500/20"
                                  : "border-gray-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/30 hover:shadow-sm"
                              }`}
                            >
                              <input
                                type="checkbox"
                                className="sr-only"
                                checked={isChecked}
                                onChange={() => toggleStr(bathItems, setBathItems, i)}
                              />
                              {Icon && (
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
                                  isChecked
                                    ? "bg-emerald-100 group-hover:bg-emerald-200"
                                    : `${colors.bg} group-hover:opacity-80`
                                }`}>
                                  <Icon className={`w-4 h-4 transition-colors duration-300 ${
                                    isChecked ? "text-emerald-600" : colors.text
                                  }`} />
                                </div>
                              )}
                              <span className={`text-sm font-medium flex-1 transition-colors duration-300 ${
                                isChecked ? "text-emerald-700" : "text-gray-700"
                              }`}>
                                {i}
                              </span>
                              {isChecked && (
                                <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                              )}
                            </label>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <label className="text-sm font-semibold text-gray-900 mb-3 block">Other room amenities</label>
                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  {(() => {
                    // Color mapping for each amenity icon - faint/subtle colors
                    const iconColors: Record<string, { bg: string; text: string }> = {
                      "Free Wi-Fi": { bg: "bg-blue-100", text: "text-blue-600" },
                      "Table": { bg: "bg-amber-100", text: "text-amber-600" },
                      "Chair": { bg: "bg-amber-100", text: "text-amber-600" },
                      "Iron": { bg: "bg-purple-100", text: "text-purple-600" },
                      "TV": { bg: "bg-indigo-100", text: "text-indigo-600" },
                      "Flat Screen TV": { bg: "bg-indigo-100", text: "text-indigo-600" },
                      "PS Station": { bg: "bg-violet-100", text: "text-violet-600" },
                      "Wardrobe": { bg: "bg-rose-100", text: "text-rose-600" },
                      "Air Conditioning": { bg: "bg-cyan-100", text: "text-cyan-600" },
                      "Mini Fridge": { bg: "bg-sky-100", text: "text-sky-600" },
                      "Coffee Maker": { bg: "bg-orange-100", text: "text-orange-600" },
                      "Phone": { bg: "bg-teal-100", text: "text-teal-600" },
                      "Mirror": { bg: "bg-slate-100", text: "text-slate-600" },
                      "Bedside Lamps": { bg: "bg-yellow-100", text: "text-yellow-600" },
                      "Heating": { bg: "bg-red-100", text: "text-red-600" },
                      "Desk": { bg: "bg-stone-100", text: "text-stone-600" },
                      "Safe": { bg: "bg-zinc-100", text: "text-zinc-600" },
                      "Clothes Rack": { bg: "bg-pink-100", text: "text-pink-600" },
                      "Blackout Curtains": { bg: "bg-gray-100", text: "text-gray-600" },
                      "Couches": { bg: "bg-amber-100", text: "text-amber-600" },
                    };
                    
                    return [
                      "Free Wi-Fi",
                      "Table",
                      "Chair",
                      "Iron",
                      "TV",
                      "Flat Screen TV",
                      "PS Station",
                      "Wardrobe",
                      "Air Conditioning",
                      "Mini Fridge",
                      "Coffee Maker",
                      "Phone",
                      "Mirror",
                      "Bedside Lamps",
                      "Heating",
                      "Desk",
                      "Safe",
                      "Clothes Rack",
                      "Blackout Curtains",
                      "Couches",
                    ].map((i) => {
                      const Icon = (OTHER_AMENITIES_ICONS as any)[i];
                      const isChecked = otherAmenities.includes(i);
                      const colors = iconColors[i] || { bg: "bg-gray-100", text: "text-gray-600" };
                      return (
                        <label
                          key={i}
                          className={`group relative flex items-center gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition-all duration-300 ease-in-out ${
                            isChecked
                              ? "border-emerald-500 bg-gradient-to-br from-emerald-50 to-emerald-100/50 shadow-md shadow-emerald-500/20"
                              : "border-gray-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/30 hover:shadow-sm"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={isChecked}
                            onChange={() => toggleStr(otherAmenities, setOtherAmenities, i)}
                          />
                          {Icon && (
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
                              isChecked
                                ? "bg-emerald-100 group-hover:bg-emerald-200"
                                : `${colors.bg} group-hover:opacity-80`
                            }`}>
                              <Icon className={`w-4 h-4 transition-colors duration-300 ${
                                isChecked ? "text-emerald-600" : colors.text
                              }`} />
                            </div>
                          )}
                          <span className={`text-sm font-medium flex-1 transition-colors duration-300 ${
                            isChecked ? "text-emerald-700" : "text-gray-700"
                          }`}>
                            {i}
                          </span>
                          {isChecked && (
                            <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                          )}
                        </label>
                      );
                    });
                  })()}
                  </div>
                  <div className="mt-4">
                    <label className="text-sm font-semibold text-gray-900 mb-2 block">Other amenities (comma separated)</label>
                    <input
                      value={otherAmenitiesText}
                      onChange={(e) => setOtherAmenitiesText(e.target.value)}
                      className="w-full h-12 border-2 border-gray-300 rounded-xl px-4 bg-white text-gray-900 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200 hover:border-gray-400"
                      placeholder="e.g. minibar, balcony"
                    />
                  </div>
                </div>
              </div>

              {/* Photos & pricing card - Modern Card Design */}
              <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm transition-all duration-300 hover:shadow-md">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">Photos & pricing</h3>
                  <p className="text-xs text-gray-500">Upload room photos, add a description, and set the nightly price.</p>
                </div>

                <div className="space-y-6">
                  {/* Photos */}
                  <div className="rounded-xl border-2 border-gray-200 bg-gradient-to-br from-gray-50 to-white p-4">
                    <label className="block text-sm font-semibold text-gray-900 mb-3">
                      Room images <span className="text-red-500">*</span>
                      <span className="text-xs font-normal text-gray-500 ml-2">(Min 3 photos required)</span>
                    </label>
                    <PicturesUploader
                      title="Room images"
                      minRequired={3}
                      images={roomImages}
                      onUpload={(files) => {
                        if (files) onPickRoomImages(files);
                      }}
                      onRemove={(index) => {
                        setRoomImages((prev) => prev.filter((_, i) => i !== index));
                        setRoomImageSaved((prev) => prev.filter((_, i) => i !== index));
                        setRoomImageUploading((prev) => prev.filter((_, i) => i !== index));
                      }}
                      saved={roomImageSaved}
                      onSave={(index) => setRoomImageSaved((prev) => prev.map((v, i) => (i === index ? true : v)))}
                      uploading={roomImageUploading}
                    />
                    {!roomImagesOk && (
                      <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 flex items-center gap-2">
                        <span>⚠️</span>
                        <span>Upload at least 3 room photos.</span>
                      </div>
                    )}
                  </div>

                  {/* Room Description */}
                  <div className="rounded-xl border-2 border-gray-200 bg-gradient-to-br from-gray-50 to-white p-4">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Room description <span className="text-gray-500 font-normal">(optional)</span>
                    </label>
                    <textarea
                      value={roomDescription}
                      onChange={(e) => setRoomDescription(e.target.value)}
                      rows={4}
                      className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200 hover:border-gray-400 resize-none"
                      placeholder="Short description for this room type"
                    />
                  </div>

                  {/* Price per night */}
                  <div className="rounded-xl border-2 border-gray-200 bg-gradient-to-br from-gray-50 to-white p-4 w-full max-w-full box-border">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Price per night <span className="text-red-500">*</span>
                      <span className="text-xs font-normal text-gray-500 ml-2">(Min: 5,000 TZS)</span>
                    </label>
                    <div className="relative w-full max-w-full box-border">
                      <input
                        value={pricePerNight as any}
                        onChange={(e) => {
                          const val = numOrEmpty(e.target.value);
                          setPricePerNight(val);
                        }}
                        type="number"
                        step="1"
                        min="5000"
                        placeholder="e.g. 5000"
                        className="w-full max-w-full h-12 border-2 border-gray-300 rounded-xl px-4 pr-20 sm:pr-24 bg-white text-gray-900 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200 hover:border-gray-400 box-border"
                      />
                      <span className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-xs sm:text-sm font-semibold text-gray-600 pointer-events-none whitespace-nowrap">
                        <span className="hidden sm:inline">TZS / night</span>
                        <span className="sm:hidden">TZS</span>
                      </span>
                    </div>
                    {!priceOk && pricePerNight !== "" && (
                      <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 flex items-center gap-2">
                        <span>⚠️</span>
                        <span>Minimum price is 5,000 TZS per night.</span>
                      </div>
                    )}
                    {pricePerNight === "" && (
                      <div className="mt-2 text-xs text-gray-500">
                        Enter the price per night (minimum 5,000 TZS)
                      </div>
                    )}
                  </div>
                </div>

                {/* Helper text */}
                {(!floorsOk || !bedsOk || !roomsCountOk) && (
                  <div className="mt-6 rounded-xl border-2 border-amber-200 bg-amber-50 px-4 py-3 shadow-sm">
                    <p className="text-xs font-semibold text-amber-900 flex items-center gap-2 mb-2">
                      <span>⚠️</span>
                      <span>Complete these to save this room type:</span>
                    </p>
                    <ul className="space-y-1.5 text-xs text-amber-800">
                      {!floorsOk && (
                        <li className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
                          Complete floor distribution to match rooms count
                        </li>
                      )}
                      {!bedsOk && (
                        <li className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
                          Add at least 1 bed per room
                        </li>
                      )}
                      {!roomsCountOk && (
                        <li className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
                          Set the number of rooms
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                {/* Add button */}
                <div className="mt-5 flex justify-end">
                  <button
                    type="button"
                    onClick={addRoomType}
                    disabled={!canAddRoomType}
                    className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm"
                  >
                    Add room type
                  </button>
                </div>
              </div>

              {/* Saved room types card - Modern Design */}
              <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm transition-all duration-300 hover:shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">Saved room types</h3>
                    <p className="text-xs text-gray-500">Click a room type to expand/collapse details.</p>
                  </div>
                  {definedRooms.length > 0 && (
                    <div className="px-3 py-1.5 rounded-lg bg-emerald-100 border border-emerald-200 text-xs font-bold text-emerald-700">
                      {definedRooms.length} {definedRooms.length === 1 ? "room type" : "room types"}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {definedRooms.length === 0 && (
                    <div className="p-6 text-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50">
                      <div className="text-sm text-gray-500 font-medium">No room types saved yet</div>
                      <div className="text-xs text-gray-400 mt-1">Add your first room type above</div>
                    </div>
                  )}
                  {definedRooms.map((r, idx) => {
                    const isCollapsed = collapsed.has(idx);
                    const dist = r?.floorDistribution && typeof r.floorDistribution === "object" ? (r.floorDistribution as Record<number, number>) : null;
                    const distLabel = dist
                      ? Object.keys(dist)
                          .map((k) => Number(k))
                          .filter((n) => Number.isFinite(n))
                          .sort((a, b) => a - b)
                          .map((f) => `${floorLabel(f)}:${dist[f] ?? 0}`)
                          .join(" · ")
                      : "";
                    return (
                      <div
                        key={idx}
                        className={`group rounded-xl border-2 overflow-hidden transition-all duration-300 ${
                          isCollapsed
                            ? "border-gray-200 bg-white hover:border-emerald-300 hover:shadow-md"
                            : "border-emerald-200 bg-gradient-to-br from-emerald-50/30 to-white shadow-md"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleCollapsed(idx)}
                          className="w-full flex items-start justify-between gap-4 p-4 sm:p-5 transition-all duration-200 text-left hover:bg-emerald-50/50"
                          aria-expanded={!isCollapsed}
                        >
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                              isCollapsed
                                ? "bg-gray-100 group-hover:bg-emerald-100"
                                : "bg-emerald-100"
                            }`}>
                              <span className={`text-lg font-bold transition-colors duration-300 ${
                                isCollapsed ? "text-gray-600" : "text-emerald-600"
                              }`}>
                                {r.roomType.charAt(0)}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="font-bold text-gray-900 text-base">{r.roomType}</span>
                                <span className="px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-semibold">
                                  {r.roomsCount} {r.roomsCount === 1 ? "room" : "rooms"}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-100">
                                  <span className="font-semibold text-gray-700">Beds:</span>
                                  <span>T{r.beds?.twin ?? 0}</span>
                                  <span className="text-gray-400">/</span>
                                  <span>F{r.beds?.full ?? 0}</span>
                                  <span className="text-gray-400">/</span>
                                  <span>Q{r.beds?.queen ?? 0}</span>
                                  <span className="text-gray-400">/</span>
                                  <span>K{r.beds?.king ?? 0}</span>
                                </div>
                                <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100">
                                  <span className="font-semibold text-gray-700">Smoking:</span>
                                  <span className={r.smoking === "yes" ? "text-amber-600" : "text-gray-600"}>
                                    {r.smoking === "yes" ? "Yes" : "No"}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100">
                                  <span className="font-semibold text-gray-700">Bath:</span>
                                  <span className={r.bathPrivate === "yes" ? "text-emerald-600" : "text-gray-600"}>
                                    {r.bathPrivate === "yes" ? "Private" : "Shared"}
                                  </span>
                                </div>
                                {distLabel && (
                                  <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100">
                                    <span className="font-semibold text-gray-700">Floors:</span>
                                    <span>{distLabel}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`text-xs font-semibold transition-colors duration-200 ${
                              isCollapsed ? "text-gray-500" : "text-emerald-600"
                            }`}>
                              {isCollapsed ? "Show" : "Hide"}
                            </span>
                            <ChevronDown
                              className={`w-4 h-4 transition-transform duration-300 ${
                                isCollapsed ? "" : "rotate-180"
                              } text-gray-400`}
                            />
                          </div>
                        </button>

                        {!isCollapsed && (
                          <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-emerald-200/50 bg-white">
                            {Array.isArray(r.roomImages) && r.roomImages.length > 0 ? (
                              <div className="mt-4">
                                <div className="text-xs font-semibold text-gray-700 mb-2">Room Images</div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                  {r.roomImages.slice(0, 3).map((u: string, i: number) => (
                                    <div
                                      key={i}
                                      className="relative aspect-square rounded-xl overflow-hidden border-2 border-gray-200 hover:border-emerald-300 transition-all duration-200 shadow-sm hover:shadow-md"
                                    >
                                      {/^https?:\/\//i.test(u) ? (
                                        <Image
                                          src={u}
                                          alt={`Room ${idx + 1} image ${i + 1}`}
                                          width={200}
                                          height={200}
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                          src={u}
                                          alt={`Room ${idx + 1} image ${i + 1}`}
                                          className="w-full h-full object-cover"
                                        />
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="mt-4 p-4 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 text-center">
                                <div className="text-xs text-gray-500">No images uploaded for this room type</div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
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


