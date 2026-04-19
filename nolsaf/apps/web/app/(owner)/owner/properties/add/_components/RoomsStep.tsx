import Image from "next/image";
import PicturesUploader from "@/components/PicturesUploader";
import type { Dispatch, SetStateAction } from "react";
import { Minus, Plus, Lock, CheckCircle2, ChevronDown } from "lucide-react";
import { BATHROOM_ICONS, OTHER_AMENITIES_ICONS } from "@/lib/amenityIcons";
import { useEffect, useMemo, useState } from "react";
import { AddPropertySection } from "./AddPropertySection";
import { StepFooter } from "./StepFooter";

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
      className="add-property-section-premium"
    >
      {isVisible && (
        <div className="min-w-0 w-full">
          <div className="flex items-start justify-between gap-4 border-b border-white/15 pb-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-white/20 bg-white/15 text-xs font-semibold text-white">
                  2
                </span>
                <h2 className="truncate text-base font-semibold text-white sm:text-lg">Room types</h2>
              </div>
              <p className="mt-1 text-sm text-white/60">
                Define each room type, the beds per room, how many rooms you have, and upload room photos.
              </p>
            </div>
          </div>
          <div className="space-y-5 pt-4">

            {/* ── Status bar ──────────────────────────────────────────── */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#02665e] to-[#014e47] px-5 py-4 shadow-md">
              <div
                className="pointer-events-none absolute inset-0 opacity-10"
                style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "20px 20px" }}
              />
              <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl text-lg font-bold transition-all ${
                    definedRooms.length > 0 ? "bg-white/20 text-white" : "bg-white/10 text-white/60"
                  }`}>
                    {definedRooms.length}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {definedRooms.length === 0
                        ? "No room types saved yet"
                        : definedRooms.length === 1
                        ? "1 room type saved"
                        : `${definedRooms.length} room types saved`}
                    </div>
                    <div className="mt-0.5 text-xs text-[#6ee7b7]">
                      Need at least <span className="font-bold">1</span> to continue
                    </div>
                  </div>
                </div>
                <div className="self-start rounded-full border border-white/20 bg-white/10 px-3 py-1.5 sm:self-auto">
                  <span className="text-xs text-white/80">Beds set are </span>
                  <span className="text-xs font-bold text-[#6ee7b7]">per room</span>
                </div>
              </div>
            </div>

            {/* ── Room Setup Card ──────────────────────────────────────── */}
            <div className="overflow-hidden rounded-2xl border border-white/15 bg-white/10 shadow-sm">
              <div className="flex items-center gap-2 border-b border-white/15 px-5 py-3">
                <div className="h-4 w-1 rounded-full bg-emerald-400" />
                <span className="text-sm font-semibold text-white">Room setup</span>
                <span className="ml-1 text-xs text-white/50">· Pick type, set beds &amp; room count</span>
              </div>
              <div className="min-w-0 space-y-6 p-5 sm:p-6">

                {/* Room Type Selection */}
                <div>
                  <label className="mb-1 block text-sm font-semibold text-white">
                    What type of room is this? <span className="text-red-300">*</span>
                  </label>
                  <p className="mb-4 text-xs text-white/50">Select the category that best fits.</p>
                  <div
                    role="radiogroup"
                    aria-labelledby="roomTypeLabel"
                    className="grid grid-cols-2 sm:grid-cols-3 gap-3"
                  >
                  {[
                    { rt: "Single",  emoji: "🛏️", desc: "One guest",        idleGrad: "from-sky-50 to-blue-50/60",      selGrad: "from-sky-100 to-blue-100/70",      idleBorder: "border-sky-200",     selBorder: "border-sky-500",     iconBg: "bg-sky-100",    iconColor: "text-sky-700",    nameSel: "text-sky-800",   dot: "bg-sky-500",    shadow: "shadow-sky-300/40"   },
                    { rt: "Double",  emoji: "🛌", desc: "Two guests",        idleGrad: "from-rose-50 to-pink-50/60",     selGrad: "from-rose-100 to-pink-100/70",     idleBorder: "border-rose-200",    selBorder: "border-rose-500",    iconBg: "bg-rose-100",   iconColor: "text-rose-700",   nameSel: "text-rose-800",  dot: "bg-rose-500",   shadow: "shadow-rose-300/40"  },
                    { rt: "Studio",  emoji: "🏠", desc: "Open-plan space",   idleGrad: "from-violet-50 to-purple-50/60", selGrad: "from-violet-100 to-purple-100/70", idleBorder: "border-violet-200",  selBorder: "border-violet-500",  iconBg: "bg-violet-100", iconColor: "text-violet-700", nameSel: "text-violet-800",dot: "bg-violet-500", shadow: "shadow-violet-300/40"},
                    { rt: "Suite",   emoji: "✨", desc: "Premium room",      idleGrad: "from-amber-50 to-yellow-50/60",  selGrad: "from-amber-100 to-yellow-100/70",  idleBorder: "border-amber-200",   selBorder: "border-amber-500",   iconBg: "bg-amber-100",  iconColor: "text-amber-300",  nameSel: "text-amber-300", dot: "bg-amber-500",  shadow: "shadow-amber-300/40" },
                    { rt: "Family",  emoji: "👨‍👩‍👧", desc: "Multiple guests",  idleGrad: "from-emerald-50 to-teal-50/60",  selGrad: "from-emerald-100 to-teal-100/70",  idleBorder: "border-emerald-200", selBorder: "border-emerald-500", iconBg: "bg-emerald-100",iconColor: "text-emerald-700",nameSel: "text-emerald-800",dot: "bg-emerald-500",shadow: "shadow-emerald-300/40"},
                    { rt: "Other",   emoji: "🏷️", desc: "Custom type",       idleGrad: "from-slate-50 to-gray-50/60",    selGrad: "from-slate-100 to-gray-100/70",    idleBorder: "border-slate-200",   selBorder: "border-slate-500",   iconBg: "bg-slate-100",  iconColor: "text-slate-700",  nameSel: "text-slate-800", dot: "bg-slate-500",  shadow: "shadow-slate-300/40" },
                  ].map(({ rt, emoji, desc }) => {
                    const selected = roomType === rt;
                    const isCompleted = definedRooms.some((r) => r.roomType === rt);
                    return (
                      <label
                        key={rt}
                        onClick={() => setRoomType(rt)}
                        className={`relative flex cursor-pointer flex-col gap-2 rounded-xl border-2 p-4 transition-all duration-200 hover:-translate-y-0.5 ${
                          selected
                            ? "border-[#02665e] bg-[#02665e] shadow-lg shadow-[#02665e]/20"
                            : isCompleted
                            ? "border-amber-400/50 bg-amber-500/15 hover:border-amber-400/70 hover:shadow-sm"
                            : "border-white/15 bg-white/10 hover:border-white/25 hover:shadow-sm"
                        }`}
                      >
                        <input type="radio" name="roomType" value={rt} checked={selected} onChange={(e) => setRoomType(e.target.value)} className="sr-only" />
                        <div className="flex items-center gap-2">
                          <span className="text-xl leading-none">{emoji}</span>
                          <div>
                            <div className={`text-sm font-bold leading-tight ${selected ? "text-white" : "text-white"}`}>{rt}</div>
                            <div className={`mt-0.5 text-[11px] ${selected ? "text-[#6ee7b7]" : "text-white/50"}`}>{desc}</div>
                          </div>
                        </div>
                        {selected && !isCompleted && (
                          <div className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[#6ee7b7]" />
                        )}
                        {isCompleted && !selected && (
                          <div className="absolute right-2 top-2">
                            <CheckCircle2 className="h-4 w-4 text-amber-500" />
                          </div>
                        )}
                        {isCompleted && selected && (
                          <div className="absolute right-2 top-2 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                            Editing
                          </div>
                        )}
                      </label>
                    );
                  })}
                </div>
                {definedRooms.length > 0 && (
                  <p className="mt-3 flex items-center gap-1 text-xs text-white/50">
                    <Lock className="h-3 w-3" />
                    Completed types are marked. Click to edit an existing room type.
                  </p>
                )}
              </div>

              {/* Beds per room */}
              <div>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <label className="mb-0.5 block text-sm font-semibold text-white">
                      Beds per room <span className="text-white/50 font-normal">(each room has these beds)</span>
                    </label>
                    <p className="text-xs text-white/50">Use + / − to set beds inside each room.</p>
                  </div>
                  <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5">
                    <div className="text-xs font-bold text-white">{bedsPerRoom} beds / room</div>
                    <div className="mt-0.5 text-xs text-white/50">
                      {roomCountNum ? `${bedsPerRoom} × ${roomCountNum} = ${totalBeds} total` : "Set room count to see total"}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {["twin", "full", "queen", "king"].map((k) => {
                    const BedIcon = BED_ICONS[k];
                    const bedCount = beds[k] ?? 0;
                    return (
                      <div
                        key={k}
                        className="flex items-center justify-between rounded-xl border border-white/15 bg-white/10 p-4 transition-all hover:border-white/25 hover:shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          {BedIcon && (
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-white/15">
                              <BedIcon className="h-5 w-5 text-white" />
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-semibold capitalize text-white">{k} bed</div>
                            <div className="text-xs text-white/50">per room</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            aria-label={`Remove one ${k} bed`}
                            onClick={() => changeBed(k, -1)}
                            disabled={bedCount === 0}
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white transition-all hover:border-white/30 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40 active:scale-95"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <div className={`flex h-9 w-12 items-center justify-center rounded-lg text-sm font-bold transition-all ${
                            bedCount > 0 ? "border border-white/25 bg-white/15 text-white" : "border border-white/10 bg-white/[0.06] text-white/40"
                          }`}>
                            {bedCount}
                          </div>
                          <button
                            type="button"
                            aria-label={`Add one ${k} bed`}
                            onClick={() => changeBed(k, 1)}
                            className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-400/80 text-white transition-all hover:bg-emerald-400 active:scale-95"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {roomCountNum > 0 && bedsPerRoom === 0 && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-500/15 p-3 text-xs text-amber-300">
                    <span>⚠️</span>
                    <span>Room count set but no beds — add at least 1 bed type.</span>
                  </div>
                )}
                {roomCountNum === 0 && bedsPerRoom > 0 && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-500/15 p-3 text-xs text-amber-300">
                    <span>⚠️</span>
                    <span>Beds set but room count is empty — enter the number of rooms.</span>
                  </div>
                )}
              </div>

              {/* Room Count and Smoking Section - Modern Grid Layout */}
              {/* Room count + Smoking */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-white">
                    Number of rooms <span className="text-red-300">*</span>
                  </label>
                  <input
                    value={roomsCount as any}
                    onChange={(e) => setRoomsCount(numOrEmpty(e.target.value))}
                    type="number"
                    min={1}
                    placeholder="e.g. 3"
                    className="h-12 w-full rounded-2xl border border-white/25 bg-white/95 px-4 text-slate-900 placeholder-slate-400 transition-all hover:border-slate-300 focus:border-[#02665e] focus:outline-none focus:ring-2 focus:ring-[#02665e]/15"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-white">Smoking allowed?</label>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={smoking === "yes"}
                    onClick={() => setSmoking(smoking === "yes" ? "no" : "yes")}
                    className="group flex h-12 items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-4 transition-all hover:bg-white/15"
                  >
                    <div className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors duration-200 ${smoking === "yes" ? "bg-emerald-400" : "bg-white/20"}`}>
                      <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${smoking === "yes" ? "translate-x-[22px]" : "translate-x-0.5"}`} />
                    </div>
                    <span className="text-sm font-semibold text-white">{smoking === "yes" ? "Yes" : "No"}</span>
                  </button>
                </div>
              </div>

              {/* Floor distribution (multi-storey) */}
              {isMultiStorey ? (
                <div className="rounded-xl border border-white/15 bg-white/[0.06] p-4">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-sm font-semibold text-white">Room location</div>
                      <p className="mt-0.5 text-xs text-white/50">Select floors and distribute rooms across them.</p>
                    </div>
                    {floorOptions.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (!roomFloors?.length || !roomCountNum) return;
                          const base = Math.floor(roomCountNum / roomFloors.length);
                          const extra = roomCountNum % roomFloors.length;
                          const next: Record<number, number> = {};
                          roomFloors.forEach((f, idx) => { next[f] = base + (idx < extra ? 1 : 0); });
                          setRoomFloorDistribution(next);
                        }}
                        disabled={!isMultiStorey || roomFloors.length === 0 || roomCountNum <= 0}
                        className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition-all hover:border-white/30 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Auto distribute
                      </button>
                    )}
                  </div>
                  {floorOptions.length === 0 ? (
                    <div className="rounded-lg border border-amber-400/30 bg-amber-500/15 p-3 text-xs text-amber-300">
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
                              aria-pressed={selected}
                              className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                                selected
                                  ? "border-emerald-400 bg-emerald-400/80 text-white shadow-sm"
                                  : "border-white/15 bg-white/10 text-white/70 hover:border-white/25 hover:bg-white/15"
                              }`}
                            >
                              {floorLabel(f)}
                            </button>
                          );
                        })}
                      </div>
                      {roomFloors.length === 0 && (
                        <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-400/30 bg-red-500/15 p-3 text-xs text-red-300">
                          <span>⚠️</span>
                          <span>Select at least one floor for this room type.</span>
                        </div>
                      )}
                      {roomFloors.length > 0 && (
                        <div className="mt-4 rounded-xl border border-white/15 bg-white/[0.08] p-4">
                          <div className="mb-4 flex items-center justify-between gap-3">
                            <div className="text-xs text-white/60">
                              Distribute <span className="font-bold text-white">{roomCountNum || 0}</span> rooms across{" "}
                              <span className="font-bold text-white">{roomFloors.length}</span> floor{roomFloors.length !== 1 ? "s" : ""}
                            </div>
                            <div className={`rounded-lg border px-3 py-1 text-xs font-bold ${
                              floorDistSum === (roomCountNum || 0)
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-amber-400/30 bg-amber-500/15 text-amber-300"
                            }`}>
                              {floorDistSum}/{roomCountNum || 0}
                            </div>
                          </div>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {roomFloors.map((f) => (
                              <div key={f} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.06] p-3">
                                <div className="flex items-center gap-2">
                                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white/15 text-xs font-bold text-white">
                                    {f === 0 ? "G" : f}
                                  </div>
                                  <span className="text-sm font-medium text-white/70">{floorLabel(f)} floor</span>
                                </div>
                                <input
                                  type="number"
                                  min={0}
                                  value={(roomFloorDistribution?.[f] ?? 0) as any}
                                  onChange={(e) => {
                                    const v = e.target.value ? parseInt(e.target.value, 10) : 0;
                                    setRoomFloorDistribution((prev) => ({ ...prev, [f]: Number.isFinite(v) ? Math.max(0, v) : 0 }));
                                  }}
                                  className="h-9 w-20 rounded-lg border border-white/20 bg-white/90 text-center text-sm font-semibold text-slate-900 focus:border-[#02665e] focus:outline-none focus:ring-1 focus:ring-[#02665e]/20"
                                  aria-label={`Rooms on ${floorLabel(f)} floor`}
                                />
                              </div>
                            ))}
                          </div>
                          {roomCountNum > 0 && floorDistSum !== roomCountNum && (
                            <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-500/15 p-3 text-xs text-amber-300">
                              <span>⚠️</span>
                              <span>Distribution ({floorDistSum}) does not match total rooms ({roomCountNum}).</span>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.06] p-4 text-xs text-white/50">
                  <span className="mt-0.5 text-base">🏠</span>
                  <span>
                    {buildingType === "single_storey"
                      ? "Single storey: all rooms will be placed on the ground floor."
                      : buildingType === "separate_units"
                      ? "Separate units: rooms are spread across different units (no floor levels)."
                      : "All rooms will be on the ground floor."}
                  </span>
                </div>
              )}

              </div>
            </div>

            {/* ── Bathroom & Amenities Card ────────────────────────────── */}
            <div className="overflow-hidden rounded-2xl border border-white/15 bg-white/10 shadow-sm">
              <div className="flex items-center gap-2 border-b border-white/15 px-5 py-3">
                <div className="h-4 w-1 rounded-full bg-emerald-400" />
                <span className="text-sm font-semibold text-white">Bathroom &amp; amenities</span>
                <span className="ml-1 text-xs text-white/50">· Privacy, items &amp; extras</span>
              </div>
              <div className="space-y-6 p-5 sm:p-6">

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  {/* Left: bath privacy + towel */}
                  <div className="space-y-5">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-white">Is the bathroom private?</label>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={bathPrivate === "yes"}
                        onClick={() => setBathPrivate(bathPrivate === "yes" ? "no" : "yes")}
                        className="group flex h-12 items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-4 transition-all hover:bg-white/15"
                      >
                        <div className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors duration-200 ${bathPrivate === "yes" ? "bg-emerald-400" : "bg-white/20"}`}>
                          <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${bathPrivate === "yes" ? "translate-x-[22px]" : "translate-x-0.5"}`} />
                        </div>
                        <span className="text-sm font-semibold text-white">{bathPrivate === "yes" ? "Private" : "Shared"}</span>
                      </button>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-white">
                        Towel color <span className="text-white/40 font-normal">(optional)</span>
                      </label>
                      <input
                        value={towelColor}
                        onChange={(e) => setTowelColor(e.target.value)}
                        className="block h-12 min-w-0 w-full max-w-full box-border rounded-2xl border border-white/25 bg-white/95 px-4 text-slate-900 placeholder-slate-400 transition-all hover:border-slate-300 focus:border-[#02665e] focus:outline-none focus:ring-2 focus:ring-[#02665e]/15"
                        placeholder="e.g. white"
                      />
                    </div>
                  </div>
                  {/* Right: bathroom items */}
                  <div>
                    <label className="mb-3 block text-sm font-semibold text-white">Bathroom items</label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {(() => {
                        const iconColors: Record<string, { bg: string; text: string }> = {
                          "Free toiletries": { bg: "bg-yellow-50", text: "text-yellow-600" },
                          "Toilet paper": { bg: "bg-stone-50", text: "text-stone-500" },
                          "Shower": { bg: "bg-blue-50", text: "text-blue-600" },
                          "Water Heater": { bg: "bg-red-50", text: "text-red-600" },
                          "Toilet": { bg: "bg-slate-50", text: "text-slate-500" },
                          "Hairdryer": { bg: "bg-pink-50", text: "text-pink-600" },
                          "Trash Bin": { bg: "bg-gray-50", text: "text-gray-500" },
                          "Toilet Brush": { bg: "bg-cyan-50", text: "text-cyan-600" },
                          "Mirror": { bg: "bg-slate-50", text: "text-slate-500" },
                          "Slippers": { bg: "bg-amber-50", text: "text-amber-600" },
                          "Bathrobe": { bg: "bg-rose-50", text: "text-rose-600" },
                          "Bath Mat": { bg: "bg-teal-50", text: "text-teal-600" },
                          "Towel": { bg: "bg-sky-50", text: "text-sky-600" },
                        };
                        return ["Free toiletries","Toilet paper","Shower","Water Heater","Toilet","Hairdryer","Trash Bin","Toilet Brush","Mirror","Slippers","Bathrobe","Bath Mat","Towel"].map((i) => {
                          const Icon = (BATHROOM_ICONS as any)[i];
                          const isChecked = bathItems.includes(i);
                          const colors = iconColors[i] || { bg: "bg-gray-50", text: "text-gray-500" };
                          return (
                            <label
                              key={i}
                              className={`relative flex cursor-pointer items-center gap-2 rounded-xl border p-2.5 transition-all ${
                                isChecked ? "border-emerald-400/60 bg-emerald-400/15" : "border-white/15 bg-white/10 hover:border-white/25"
                              }`}
                            >
                              <input type="checkbox" className="sr-only" checked={isChecked} onChange={() => toggleStr(bathItems, setBathItems, i)} />
                              {Icon && (
                                <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg ${isChecked ? "bg-emerald-400/20" : colors.bg}`}>
                                  <Icon className={`h-3.5 w-3.5 ${isChecked ? "text-emerald-300" : colors.text}`} />
                                </div>
                              )}
                              <span className={`text-xs font-medium leading-tight ${isChecked ? "text-emerald-300" : "text-white/70"}`}>{i}</span>
                              {isChecked && <div className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400" />}
                            </label>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>

                {/* Other room amenities */}
                <div>
                  <label className="mb-3 block text-sm font-semibold text-white">Other room amenities</label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    {(() => {
                      const iconColors: Record<string, { bg: string; text: string }> = {
                        "Free Wi-Fi": { bg: "bg-blue-50", text: "text-blue-600" },
                        "Table": { bg: "bg-amber-50", text: "text-amber-600" },
                        "Chair": { bg: "bg-amber-50", text: "text-amber-600" },
                        "Iron": { bg: "bg-purple-50", text: "text-purple-600" },
                        "TV": { bg: "bg-indigo-50", text: "text-indigo-600" },
                        "Flat Screen TV": { bg: "bg-indigo-50", text: "text-indigo-600" },
                        "PS Station": { bg: "bg-violet-50", text: "text-violet-600" },
                        "Wardrobe": { bg: "bg-rose-50", text: "text-rose-600" },
                        "Air Conditioning": { bg: "bg-cyan-50", text: "text-cyan-600" },
                        "Mini Fridge": { bg: "bg-sky-50", text: "text-sky-600" },
                        "Coffee Maker": { bg: "bg-orange-50", text: "text-orange-600" },
                        "Phone": { bg: "bg-teal-50", text: "text-teal-600" },
                        "Mirror": { bg: "bg-slate-50", text: "text-slate-500" },
                        "Bedside Lamps": { bg: "bg-yellow-50", text: "text-yellow-600" },
                        "Heating": { bg: "bg-red-50", text: "text-red-600" },
                        "Desk": { bg: "bg-stone-50", text: "text-stone-500" },
                        "Safe": { bg: "bg-zinc-50", text: "text-zinc-600" },
                        "Clothes Rack": { bg: "bg-pink-50", text: "text-pink-600" },
                        "Blackout Curtains": { bg: "bg-gray-50", text: "text-gray-500" },
                        "Couches": { bg: "bg-amber-50", text: "text-amber-600" },
                      };
                      return ["Free Wi-Fi","Table","Chair","Iron","TV","Flat Screen TV","PS Station","Wardrobe","Air Conditioning","Mini Fridge","Coffee Maker","Phone","Mirror","Bedside Lamps","Heating","Desk","Safe","Clothes Rack","Blackout Curtains","Couches"].map((i) => {
                        const Icon = (OTHER_AMENITIES_ICONS as any)[i];
                        const isChecked = otherAmenities.includes(i);
                        const colors = iconColors[i] || { bg: "bg-gray-50", text: "text-gray-500" };
                        return (
                          <label
                            key={i}
                            className={`relative flex cursor-pointer items-center gap-2 rounded-xl border p-2.5 transition-all ${
                              isChecked ? "border-emerald-400/60 bg-emerald-400/15" : "border-white/15 bg-white/10 hover:border-white/25"
                            }`}
                          >
                            <input type="checkbox" className="sr-only" checked={isChecked} onChange={() => toggleStr(otherAmenities, setOtherAmenities, i)} />
                            {Icon && (
                              <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg ${isChecked ? "bg-emerald-400/20" : colors.bg}`}>
                                <Icon className={`h-3.5 w-3.5 ${isChecked ? "text-emerald-300" : colors.text}`} />
                              </div>
                            )}
                            <span className={`text-xs font-medium leading-tight ${isChecked ? "text-emerald-300" : "text-white/70"}`}>{i}</span>
                            {isChecked && <div className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400" />}
                          </label>
                        );
                      });
                    })()}
                  </div>
                  <div className="mt-4">
                    <label className="mb-2 block text-sm font-semibold text-white">
                      Additional amenities <span className="text-white/40 font-normal">(comma separated)</span>
                    </label>
                    <input
                      value={otherAmenitiesText}
                      onChange={(e) => setOtherAmenitiesText(e.target.value)}
                      className="block h-12 min-w-0 w-full max-w-full box-border rounded-2xl border border-white/25 bg-white/95 px-4 text-slate-900 placeholder-slate-400 transition-all hover:border-slate-300 focus:border-[#02665e] focus:outline-none focus:ring-2 focus:ring-[#02665e]/15"
                      placeholder="e.g. minibar, balcony"
                    />
                  </div>
                </div>

              </div>
            </div>

            {/* ── Photos & Pricing Card ────────────────────────────────── */}
            <div className="overflow-hidden rounded-2xl border border-white/15 bg-white/10 shadow-sm">
              <div className="flex items-center gap-2 border-b border-white/15 px-5 py-3">
                <div className="h-4 w-1 rounded-full bg-emerald-400" />
                <span className="text-sm font-semibold text-white">Photos &amp; pricing</span>
                <span className="ml-1 text-xs text-white/50">· Upload photos, describe &amp; set price</span>
              </div>
              <div className="space-y-5 p-5 sm:p-6">

                {/* Room photos */}
                <div className="rounded-xl border border-white/10 bg-white/[0.06] p-4">
                  <label className="mb-3 block text-sm font-semibold text-white">
                    Room photos <span className="text-red-300">*</span>
                    <span className="ml-2 text-xs font-normal text-white/40">(min. 3 required)</span>
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
                    <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-500/15 p-3 text-xs text-amber-300">
                      <span>⚠️</span>
                      <span>Upload at least 3 room photos.</span>
                    </div>
                  )}
                </div>

                  {/* Room Description */}
                  <div className="rounded-xl border border-white/10 bg-white/[0.06] p-4">
                    <label className="mb-2 block text-sm font-semibold text-white">
                      Room description <span className="text-white/40 font-normal">(optional)</span>
                    </label>
                    <textarea
                      value={roomDescription}
                      onChange={(e) => setRoomDescription(e.target.value)}
                      rows={4}
                      className="block min-w-0 w-full max-w-full box-border resize-none rounded-2xl border border-white/25 bg-white/95 px-4 py-3 text-slate-900 placeholder-slate-400 transition-all hover:border-slate-300 focus:border-[#02665e] focus:outline-none focus:ring-2 focus:ring-[#02665e]/15"
                      placeholder="Short description for this room type"
                    />
                  </div>

                  {/* Price per night */}
                  <div className="min-w-0 overflow-hidden rounded-xl border border-white/10 bg-white/[0.06] p-4">
                    <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-400/20 text-emerald-300 text-xs font-bold">₸</span>
                      Price per night <span className="text-red-300">*</span>
                    </label>
                    <div className="relative flex min-w-0 max-w-full items-stretch overflow-hidden rounded-xl border-2 border-emerald-400/30 bg-gradient-to-r from-slate-900 to-slate-800 shadow-lg shadow-black/20 transition-all focus-within:border-emerald-400/60 focus-within:shadow-emerald-500/10">
                      <span className="pointer-events-none flex h-14 flex-shrink-0 items-center border-r border-emerald-400/20 bg-emerald-400/10 px-4">
                        <span className="text-sm font-bold tracking-wide text-emerald-300">TZS</span>
                      </span>
                      <input
                        value={pricePerNight === "" ? "" : Number(pricePerNight).toLocaleString("en-US")}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/,/g, "");
                          const val = numOrEmpty(raw);
                          setPricePerNight(val);
                        }}
                        type="text"
                        inputMode="numeric"
                        placeholder="50,000"
                        className="block h-14 min-w-0 flex-1 appearance-none border-0 bg-transparent px-4 text-xl font-semibold tracking-wide text-white placeholder-white/20 outline-none ring-0 focus:outline-none focus:ring-0"
                      />
                      <span className="pointer-events-none flex h-14 flex-shrink-0 items-center whitespace-nowrap border-l border-white/10 bg-white/[0.04] px-4 text-[11px] font-medium text-white/40">
                        per night
                      </span>
                    </div>
                    {pricePerNight !== "" && (
                      <div className="mt-2 text-right text-xs text-white/30">
                        {Number(pricePerNight) >= 5000
                          ? `≈ USD ${(Number(pricePerNight) / 2650).toFixed(2)}`
                          : ""}
                      </div>
                    )}
                    {!priceOk && pricePerNight !== "" && (
                      <div className="mt-2 flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-500/15 p-3 text-xs text-amber-300">
                        <span>⚠️</span>
                        <span>Minimum price is 5,000 TZS per night.</span>
                      </div>
                    )}
                    {priceOk && (
                      <div className="mt-2 flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-3 text-xs text-emerald-300">
                        <span>✓</span>
                        <span>Price looks good!</span>
                      </div>
                    )}
                  </div>

                {/* Validation warnings */}
                {(!floorsOk || !bedsOk || !roomsCountOk) && (
                  <div className="rounded-xl border border-amber-400/30 bg-amber-500/15 p-4">
                    <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-amber-200">
                      <span>⚠️</span>
                      <span>Complete these to save this room type:</span>
                    </p>
                    <ul className="space-y-1.5 text-xs text-amber-300">
                      {!floorsOk && (
                        <li className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          Complete floor distribution to match rooms count
                        </li>
                      )}
                      {!bedsOk && (
                        <li className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          Add at least 1 bed per room
                        </li>
                      )}
                      {!roomsCountOk && (
                        <li className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          Set the number of rooms
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                {/* Add room type button */}
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={addRoomType}
                    disabled={!canAddRoomType}
                    className="rounded-xl bg-[#02665e] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#014e47] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.98]"
                  >
                    Add room type
                  </button>
                </div>

              </div>
            </div>

            {/* ── Saved Room Types Card ────────────────────────────────── */}
            <div className="overflow-hidden rounded-2xl border border-white/15 bg-white/10 shadow-sm">
              <div className="flex items-center justify-between gap-4 border-b border-white/15 px-5 py-3">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-1 rounded-full bg-emerald-400" />
                  <span className="text-sm font-semibold text-white">Saved room types</span>
                </div>
                {definedRooms.length > 0 && (
                  <div className="rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-bold text-white">
                    {definedRooms.length} {definedRooms.length === 1 ? "type" : "types"}
                  </div>
                )}
              </div>
              <div className="space-y-3 p-4 sm:p-5">
                {definedRooms.length === 0 ? (
                  <div className="rounded-xl border-2 border-dashed border-white/15 bg-white/[0.06] p-8 text-center">
                    <div className="text-sm font-medium text-white/50">No room types saved yet</div>
                    <div className="mt-1 text-xs text-white/30">Add your first room type above</div>
                  </div>
                ) : (
                  definedRooms.map((r, idx) => {
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
                        className={`overflow-hidden rounded-xl border-2 transition-all duration-200 ${
                          isCollapsed ? "border-white/15" : "border-emerald-400/30 shadow-sm"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleCollapsed(idx)}
                          className={`w-full flex items-start justify-between gap-4 p-4 text-left transition-colors ${
                            isCollapsed ? "bg-white/[0.06] hover:bg-white/10" : "bg-white/10 hover:bg-white/15"
                          }`}
                          aria-expanded={!isCollapsed}
                      >
                        <div className="flex flex-1 min-w-0 items-start gap-3">
                          <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-lg font-bold transition-all ${
                            isCollapsed ? "bg-white/10 text-white/60" : "bg-emerald-400/20 text-emerald-300"
                          }`}>
                            {r.roomType.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="mb-1.5 flex flex-wrap items-center gap-2">
                              <span className="text-sm font-bold text-white">{r.roomType}</span>
                              <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                                isCollapsed ? "border-white/15 bg-white/10 text-white/60" : "border-emerald-400/30 bg-emerald-400/15 text-emerald-300"
                              }`}>
                                {r.roomsCount} {r.roomsCount === 1 ? "room" : "rooms"}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <div className="rounded-md bg-white/10 px-2 py-1 text-xs text-white/60">
                                <span className="font-medium">Beds:</span> T{r.beds?.twin ?? 0}/F{r.beds?.full ?? 0}/Q{r.beds?.queen ?? 0}/K{r.beds?.king ?? 0}
                              </div>
                              <div className="rounded-md bg-white/10 px-2 py-1 text-xs text-white/60">
                                <span className="font-medium">Smoke:</span> {r.smoking === "yes" ? "Yes" : "No"}
                              </div>
                              <div className="rounded-md bg-white/10 px-2 py-1 text-xs text-white/60">
                                <span className="font-medium">Bath:</span> {r.bathPrivate === "yes" ? "Private" : "Shared"}
                              </div>
                              {distLabel && (
                                <div className="rounded-md bg-white/10 px-2 py-1 text-xs text-white/60">
                                  <span className="font-medium">Floors:</span> {distLabel}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-1.5 pt-0.5">
                          <span className={`text-xs font-medium ${isCollapsed ? "text-white/40" : "text-emerald-300"}`}>
                            {isCollapsed ? "Show" : "Hide"}
                          </span>
                          <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${isCollapsed ? "" : "rotate-180"} ${isCollapsed ? "text-white/40" : "text-emerald-300"}`} />
                        </div>
                      </button>

                      {!isCollapsed && (
                        <div className="border-t border-white/15 px-4 pb-4 pt-4 sm:px-5">
                          {Array.isArray(r.roomImages) && r.roomImages.length > 0 ? (
                            <div>
                              <div className="mb-2 text-xs font-semibold text-white/60">Room Images</div>
                              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                {r.roomImages.slice(0, 3).map((u: string, i: number) => (
                                  <div key={i} className="relative aspect-square overflow-hidden rounded-xl border border-white/15 shadow-sm">
                                    {/^https?:\/\//i.test(u) ? (
                                      <Image
                                        src={u}
                                        alt={`Room ${idx + 1} image ${i + 1}`}
                                        width={200}
                                        height={200}
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img
                                        src={u}
                                        alt={`Room ${idx + 1} image ${i + 1}`}
                                        className="h-full w-full object-cover"
                                      />
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="rounded-xl border-2 border-dashed border-white/15 bg-white/[0.06] p-4 text-center">
                              <div className="text-xs text-white/30">No images for this room type</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
                )}
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


