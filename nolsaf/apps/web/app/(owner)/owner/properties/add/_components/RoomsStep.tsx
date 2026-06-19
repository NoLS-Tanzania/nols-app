import Image from "next/image";
import PicturesUploader from "@/components/PicturesUploader";
import type { Dispatch, SetStateAction } from "react";
import { Minus, Plus, CheckCircle2, ChevronDown, Bath, Camera, ArrowRight, Circle, Cigarette, CigaretteOff, Info } from "lucide-react";
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
  const selectedBedsSummary = ["twin", "full", "queen", "king"]
    .filter((key) => Number(beds?.[key]) > 0)
    .map((key) => `${beds[key]} ${key.charAt(0).toUpperCase() + key.slice(1)}`)
    .join(" + ");
  const selectedBedTypeCount = ["twin", "full", "queen", "king"].filter((key) => Number(beds?.[key]) > 0).length;
  const shouldConfirmMixedBeds = roomCountNum > 1 && selectedBedTypeCount > 1;

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
  const roomSetupOk = roomTypeOk && roomsCountOk && bedsOk && floorsOk;
  const requiredChecks = [
    { label: "Room type", done: roomTypeOk },
    { label: "Rooms & beds", done: roomsCountOk && bedsOk && floorsOk },
    { label: "3 photos", done: roomImagesOk },
    { label: "Nightly price", done: priceOk },
  ];
  const completedChecks = requiredChecks.filter((item) => item.done).length;
  const savedRoomTypeNames = Array.from(new Set((definedRooms || []).map((room) => String(room?.roomType || "").trim()).filter(Boolean)));

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

  const moveRoomToFloor = (targetFloor: number) => {
    setRoomFloorDistribution((prev) => {
      const next = { ...prev };
      const assigned = roomFloors.reduce((sum, floor) => sum + Number(next[floor] || 0), 0);
      if (assigned >= roomCountNum) {
        const donor = roomFloors
          .filter((floor) => floor !== targetFloor && Number(next[floor] || 0) > 0)
          .sort((a, b) => Number(next[b] || 0) - Number(next[a] || 0))[0];
        if (donor === undefined) return prev;
        next[donor] = Number(next[donor] || 0) - 1;
      }
      next[targetFloor] = Number(next[targetFloor] || 0) + 1;
      return next;
    });
  };

  const moveRoomFromFloor = (sourceFloor: number) => {
    setRoomFloorDistribution((prev) => {
      if (Number(prev?.[sourceFloor] || 0) <= 0) return prev;
      const receiver = roomFloors
        .filter((floor) => floor !== sourceFloor)
        .sort((a, b) => a - b)[0];
      if (receiver === undefined) return prev;
      return {
        ...prev,
        [sourceFloor]: Number(prev[sourceFloor] || 0) - 1,
        [receiver]: Number(prev[receiver] || 0) + 1,
      };
    });
  };

  const inputClass =
    "w-full h-12 rounded-xl border-2 border-gray-300 bg-white px-4 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition-all hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500";

  return (
    <AddPropertySection
      as="section"
      sectionRef={sectionRef}
      isVisible={isVisible}
      className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-sm"
    >
      {isVisible && (
        <div className="w-full">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">2</span>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-gray-900 sm:text-xl">Set up your rooms</h2>
                <p className="mt-0.5 text-sm text-gray-500">Group identical rooms together, then add beds, photos, and price.</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 rounded-lg bg-slate-100 px-3 py-2">
              <CheckCircle2 className={`h-4 w-4 ${definedRooms.length > 0 ? "text-emerald-600" : "text-slate-400"}`} />
              <span className="text-xs font-semibold text-slate-600">{definedRooms.length} saved</span>
            </div>
          </div>

          <div className="pt-4 space-y-6">

            {/* Compact room-type flow */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <div className="flex min-w-max items-center">
                {["Choose type", "Rooms & beds", "Photos", "Price"].map((label, index) => (
                  <div key={label} className="flex items-center">
                    <div className="flex items-center gap-2 px-2 sm:px-4">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200">{index + 1}</span>
                      <span className="text-xs font-semibold text-slate-600">{label}</span>
                    </div>
                    {index < 3 && <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />}
                  </div>
                ))}
              </div>
            </div>

            {/* ── Room Setup Card ────────────────────────────────────── */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">
              <div className="mb-6 border-b border-slate-200 pb-4">
                <h3 className="text-xl font-bold text-gray-900">Room details</h3>
                <p className="mt-1 text-sm text-gray-500">Describe one group of identical rooms.</p>
              </div>

              <div className="flex flex-col gap-8">

                {/* Room Type Selection */}
                <div className="order-1 max-w-2xl">
                  <div className="flex items-center justify-between gap-3">
                    <label htmlFor="room-type" className="block text-base font-bold text-gray-900">
                      What type of room is this? <span className="text-red-500">*</span>
                    </label>
                    <details className="group relative shrink-0">
                      <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-50 [&::-webkit-details-marker]:hidden">
                        <Info className="h-4 w-4" />
                        Room type guide
                      </summary>
                      <div className="absolute right-0 z-20 mt-2 w-80 max-w-[calc(100vw-3rem)] rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
                        <p className="text-sm font-bold text-gray-900">Room type guide</p>
                        <p className="mt-1 text-xs text-gray-500">Choose the description that best matches how guests use the room.</p>
                        <dl className="mt-3 space-y-2.5 text-xs">
                          {[
                            ["Single", "A room mainly intended for one guest."],
                            ["Double", "A room intended for two guests, usually with one larger bed."],
                            ["Studio", "An open-plan unit where sleeping and living areas share one space."],
                            ["Suite", "A larger premium unit with a separate or defined living area."],
                            ["Family", "A room designed for a family or group, often with multiple beds."],
                            ["Other", "Use when none of the listed room types accurately describe it."],
                          ].map(([name, meaning]) => (
                            <div key={name} className="grid grid-cols-[4.5rem_1fr] gap-2">
                              <dt className="font-bold text-gray-900">{name}</dt>
                              <dd className="leading-relaxed text-gray-600">{meaning}</dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    </details>
                  </div>
                  <select
                    id="room-type"
                    value={roomType}
                    onChange={(e) => setRoomType(e.target.value)}
                    className="mt-3 h-14 w-full rounded-lg border border-slate-400 bg-white px-4 text-base font-medium text-gray-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                  >
                    <option value="">Select a room type</option>
                    <option value="Single">Single</option>
                    <option value="Double">Double</option>
                    <option value="Studio">Studio</option>
                    <option value="Suite">Suite</option>
                    <option value="Family">Family</option>
                    <option value="Other">Other</option>
                  </select>
                  <p className="mt-2 text-xs text-gray-500">Rooms with different beds or prices should be saved as separate options.</p>
                </div>

                {/* Beds: inside ONE room of this type */}
                <div className="order-3 border-t border-slate-200 pt-7">
                  <div className="mb-5">
                    <h4 className="text-base font-bold text-gray-900 sm:text-lg">What beds are available in one {roomTypeOk ? roomType : "room"}?</h4>
                    <p className="mt-1 text-sm text-gray-500">Add only the beds physically inside one room. Mixed bed types are allowed when the room really contains them.</p>
                  </div>

                  <div className="grid max-w-3xl grid-cols-1 gap-2">
                    {[
                      { key: "twin", label: "Twin", size: "Approx. 99 × 191 cm", sleeps: "Usually sleeps 1" },
                      { key: "full", label: "Full", size: "Approx. 137 × 191 cm", sleeps: "Usually sleeps 2" },
                      { key: "queen", label: "Queen", size: "Approx. 152 × 203 cm", sleeps: "Usually sleeps 2" },
                      { key: "king", label: "King", size: "Approx. 193 × 203 cm", sleeps: "Usually sleeps 2" },
                    ].map(({ key: k, label, size, sleeps }) => {
                      const BedIcon = BED_ICONS[k];
                      const bedCount = beds[k] ?? 0;
                      return (
                        <div
                          key={k}
                          className={`flex flex-col gap-3 rounded-lg border bg-white p-3 transition-all sm:flex-row sm:items-center sm:justify-between ${bedCount > 0 ? "border-blue-400" : "border-slate-200 hover:border-blue-300"}`}
                        >
                          <div className="flex items-start gap-3">
                            {BedIcon && (
                              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${bedCount > 0 ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                                <BedIcon className="h-5 w-5" />
                              </span>
                            )}
                            <div className="min-w-0">
                              <div className="text-sm font-bold text-gray-900">{label} bed</div>
                              <div className="mt-0.5 text-[11px] text-gray-500">{size}</div>
                              <div className="mt-0.5 text-[11px] font-medium text-gray-600">{sleeps}</div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between border-t border-slate-100 pt-3 sm:justify-end sm:border-0 sm:pt-0">
                            <span className="text-xs font-medium text-gray-500 sm:hidden">Number in this room</span>
                            <div className="flex items-center gap-2">
                            <button
                              type="button"
                              aria-label={`Remove one ${k} bed`}
                              onClick={() => changeBed(k, -1)}
                              disabled={bedCount === 0}
                              className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 transition-all hover:border-gray-400 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 active:scale-95"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <div className={`flex h-9 w-12 items-center justify-center rounded-lg text-sm font-bold transition-all ${
                              bedCount > 0 ? "border-2 border-emerald-200 bg-emerald-50 text-emerald-700" : "border border-gray-200 bg-gray-50 text-gray-400"
                            }`}>
                              {bedCount}
                            </div>
                            <button
                              type="button"
                              aria-label={`Add one ${k} bed`}
                              onClick={() => changeBed(k, 1)}
                              className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white transition-all hover:bg-emerald-700 active:scale-95"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className={`mt-4 rounded-xl border px-4 py-3 ${
                    shouldConfirmMixedBeds ? "border-amber-300 bg-amber-50" : bedsPerRoom > 0 ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"
                  }`}>
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-medium text-gray-500">This setup will apply to every {roomTypeOk ? roomType : "room"}</p>
                        <p className="mt-0.5 text-sm font-bold text-gray-900">{bedsPerRoom > 0 ? selectedBedsSummary : "No beds selected yet"}</p>
                      </div>
                      {roomCountNum > 0 && bedsPerRoom > 0 && <p className="text-xs font-semibold text-emerald-700">Bed setup selected</p>}
                    </div>
                  </div>
                  {shouldConfirmMixedBeds && (
                    <div className="mt-3 rounded-xl border border-amber-300 bg-white p-4 text-xs text-amber-950">
                      <p className="font-bold">Are these bed types together inside every room?</p>
                      <p className="mt-1.5 leading-relaxed">
                        Your current setup means all {roomCountNum} {roomType || "rooms"} contain <strong>{selectedBedsSummary}</strong> each.
                      </p>
                      <p className="mt-2 leading-relaxed text-amber-800">
                        If the beds belong to different rooms, save separate options instead—for example, <strong>3 Single rooms with 1 Queen</strong>, then <strong>2 Single rooms with 1 King</strong>. Each option can still be distributed across Ground and 1st floor.
                      </p>
                    </div>
                  )}
                  {roomCountNum > 0 && bedsPerRoom === 0 && (
                    <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
                      <span>⚠️</span>
                      <span>Room count set but no beds — add at least 1 bed type.</span>
                    </div>
                  )}
                  {roomCountNum === 0 && bedsPerRoom > 0 && (
                    <div className="mt-3 flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs text-sky-700">
                      <ArrowRight className="h-4 w-4 shrink-0" />
                      <span>Good. Next, enter how many rooms have this exact bed setup.</span>
                    </div>
                  )}
                </div>

                {/* Rooms: how many of this type + rules */}
                <div className="order-2 border-t border-slate-200 pt-7">
                  <div className="mb-5">
                    <div className="text-base font-bold text-gray-900 sm:text-lg">
                      How many {roomTypeOk ? `${roomType} rooms` : "rooms of this type"} are in this building?
                    </div>
                    <p className="mt-1 text-sm text-gray-500">Count only rooms with the same bed setup, photos, and nightly rate.</p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                    <div className="rounded-xl border border-emerald-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <label htmlFor="rooms-count" className="block text-sm font-bold text-gray-900">
                            Number of {roomTypeOk ? roomType : "identical"} rooms <span className="text-red-500">*</span>
                          </label>
                          <p className="mt-1 text-xs text-gray-500">Enter the total available in this building.</p>
                        </div>
                        {roomsCountOk && <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />}
                      </div>
                      <div className="mt-4 flex items-stretch gap-2">
                        <button
                          type="button"
                          aria-label="Remove one room"
                          onClick={() => setRoomsCount(roomCountNum <= 1 ? "" : roomCountNum - 1)}
                          disabled={roomCountNum === 0}
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <div className="relative min-w-0 flex-1">
                          <input
                            id="rooms-count"
                            value={roomsCount as any}
                            onChange={(e) => setRoomsCount(numOrEmpty(e.target.value))}
                            type="number"
                            min={1}
                            placeholder="0"
                            className="h-12 w-full rounded-xl border-2 border-slate-300 bg-white px-4 pr-20 text-center text-lg font-bold text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                          />
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400">rooms</span>
                        </div>
                        <button
                          type="button"
                          aria-label="Add one room"
                          onClick={() => setRoomsCount(roomCountNum + 1)}
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white transition hover:bg-emerald-700 active:scale-95"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <div>
                        <p className="text-sm font-bold text-gray-900">Smoking policy</p>
                        <p className="mt-1 text-xs text-gray-500">Is smoking allowed inside these rooms?</p>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Smoking allowed">
                        {[
                          { value: "no" as const, label: "No", icon: CigaretteOff },
                          { value: "yes" as const, label: "Yes", icon: Cigarette },
                        ].map(({ value, label, icon: SmokingIcon }) => {
                          const selected = smoking === value;
                          return (
                            <button
                              key={value}
                              type="button"
                              role="radio"
                              aria-checked={selected}
                              onClick={() => setSmoking(value)}
                              className={`flex h-12 items-center justify-center gap-2 rounded-xl border text-sm font-bold transition ${
                                selected ? "border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                              }`}
                            >
                              <SmokingIcon className="h-4 w-4" />
                              {label}
                            </button>
                          );
                        })}
                      </div>
                      <p className="mt-3 text-xs text-gray-500">Guests will see this rule before booking.</p>
                    </div>
                  </div>

                  {/* Floor distribution (multi-storey) */}
                  {isMultiStorey ? (
                    <div className="mt-4 min-w-0 rounded-xl border border-gray-200 bg-white p-4">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-900">Room location</div>
                          <p className="mt-0.5 text-xs text-gray-500">Select floors and distribute rooms across them.</p>
                        </div>
                      </div>
                      {floorOptions.length === 0 ? (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
                          Please set <span className="font-semibold">Total floors</span> in Step 1 (Basics) to enable floor selection.
                        </div>
                      ) : (
                        <>
                          <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                                  className={`shrink-0 snap-start rounded-lg border px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                                    selected
                                      ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                                      : "border-gray-200 bg-white text-gray-700 hover:border-emerald-300 hover:bg-emerald-50/40"
                                  }`}
                                >
                                  {floorLabel(f)}
                                </button>
                              );
                            })}
                          </div>
                          {floorOptions.length > 4 && (
                            <p className="mt-1 text-[11px] text-gray-400 sm:hidden">Swipe sideways to see more floors</p>
                          )}
                          {roomFloors.length === 0 && (
                            <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                              <span>⚠️</span>
                              <span>Select at least one floor for this room type.</span>
                            </div>
                          )}
                          {roomFloors.length > 0 && (
                            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-bold text-gray-900">Room allocation</p>
                                  <p className="mt-0.5 text-xs text-gray-500">Use + to move rooms between floors automatically.</p>
                                </div>
                                <div className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                                  floorDistSum === (roomCountNum || 0) ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                                }`}>
                                  {floorDistSum} of {roomCountNum || 0} assigned
                                </div>
                              </div>
                              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
                                <div
                                  className={`h-full rounded-full transition-all ${floorDistSum === (roomCountNum || 0) ? "bg-emerald-500" : "bg-amber-400"}`}
                                  style={{ width: `${Math.min(100, roomCountNum > 0 ? (floorDistSum / roomCountNum) * 100 : 0)}%` }}
                                />
                              </div>
                              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {roomFloors.map((f) => (
                                  <div key={f} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
                                    <div className="flex items-center gap-2">
                                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-xs font-bold text-emerald-700">
                                        {f === 0 ? "G" : f}
                                      </div>
                                      <div>
                                        <span className="block text-sm font-semibold text-gray-800">{floorLabel(f)} floor</span>
                                        <span className="block text-[11px] text-gray-400">Rooms on this floor</span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        aria-label={`Move one room away from ${floorLabel(f)} floor`}
                                        onClick={() => moveRoomFromFloor(f)}
                                        disabled={Number(roomFloorDistribution?.[f] || 0) === 0 || roomFloors.length < 2}
                                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
                                      >
                                        <Minus className="h-3.5 w-3.5" />
                                      </button>
                                      <span className="flex h-9 min-w-10 items-center justify-center rounded-lg bg-slate-100 px-2 text-sm font-bold text-gray-900">
                                        {roomFloorDistribution?.[f] ?? 0}
                                      </span>
                                      <button
                                        type="button"
                                        aria-label={`Move one room to ${floorLabel(f)} floor`}
                                        onClick={() => moveRoomToFloor(f)}
                                        disabled={roomCountNum <= 0 || Number(roomFloorDistribution?.[f] || 0) >= roomCountNum || (floorDistSum >= roomCountNum && !roomFloors.some((floor) => floor !== f && Number(roomFloorDistribution?.[floor] || 0) > 0))}
                                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                                      >
                                        <Plus className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {roomCountNum > 0 && floorDistSum !== roomCountNum && (
                                <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
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
                    <div className="mt-4 flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs text-gray-500">
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

                <div className={`order-4 flex flex-col gap-3 rounded-xl border p-3.5 sm:flex-row sm:items-center sm:justify-between ${
                  roomSetupOk ? "border-emerald-200 bg-emerald-50/70" : "border-slate-200 bg-slate-50"
                }`}>
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${roomSetupOk ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500"}`}>
                      {roomSetupOk ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-gray-900">{roomTypeOk ? `${roomType} room group` : "Room group"}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
                        <span><strong className="text-gray-900">{roomCountNum || 0}</strong> room{roomCountNum === 1 ? "" : "s"}</span>
                        <span><strong className="text-gray-900">{selectedBedTypeCount}</strong> bed type{selectedBedTypeCount === 1 ? "" : "s"}</span>
                      </div>
                    </div>
                  </div>
                  <span className={`shrink-0 self-start rounded-full px-3 py-1.5 text-xs font-bold sm:self-auto ${
                    roomSetupOk ? "bg-white text-emerald-700 ring-1 ring-emerald-200" : "bg-white text-slate-500 ring-1 ring-slate-200"
                  }`}>
                    {roomSetupOk ? "Ready" : "Incomplete"}
                  </span>
                </div>

                <div className="order-5 border-t border-slate-200 pt-6">
                  <label className="block text-base font-bold text-gray-900">
                    {roomTypeOk ? `Describe this ${roomType} room` : "Describe this room"}
                  </label>
                  <p className="mt-1 text-xs text-gray-500">Share what guests should know about its space, comfort, or special features.</p>
                  <textarea
                    value={roomDescription}
                    onChange={(e) => setRoomDescription(e.target.value)}
                    rows={4}
                    className="mt-3 block w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="e.g. Spacious rooms with natural light, a work desk, and garden views"
                  />
                </div>

              </div>
            </div>

            {/* ── Bathroom & Amenities Card ──────────────────────────── */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                  <Bath className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Bathroom &amp; room amenities</h3>
                  <p className="text-xs text-gray-500">Choose the bathroom type, then select everything guests will find in this room.</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  {/* Left: bath privacy + towel */}
                  <div className="space-y-5">
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-gray-900">What kind of bathroom does this room have?</label>
                      <p className="mb-3 text-xs text-gray-500">Private means only guests in this room use it.</p>
                      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Bathroom type">
                        {[
                          { value: "yes" as const, label: "Private", help: "For this room" },
                          { value: "no" as const, label: "Shared", help: "Used by others" },
                        ].map((option) => {
                          const selected = bathPrivate === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              role="radio"
                              aria-checked={selected}
                              onClick={() => setBathPrivate(option.value)}
                              className={`rounded-xl border px-3 py-3 text-left transition ${
                                selected ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500" : "border-slate-200 bg-white hover:border-slate-300"
                              }`}
                            >
                              <span className={`block text-sm font-bold ${selected ? "text-emerald-800" : "text-gray-900"}`}>{option.label}</span>
                              <span className="mt-0.5 block text-[11px] text-gray-500">{option.help}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-900">
                        Towel color
                      </label>
                      <input
                        value={towelColor}
                        onChange={(e) => setTowelColor(e.target.value)}
                        className={inputClass}
                        placeholder="e.g. white"
                      />
                    </div>
                  </div>
                  {/* Right: bathroom items */}
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-900">What is provided in the bathroom?</label>
                    <p className="mb-3 text-xs text-gray-500">Select every item guests can expect to use.</p>
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
                              className={`relative flex cursor-pointer items-center gap-2 rounded-xl border-2 p-2.5 transition-all ${
                                isChecked ? "border-emerald-500 bg-emerald-50" : "border-gray-200 bg-white hover:border-emerald-300"
                              }`}
                            >
                              <input type="checkbox" className="sr-only" checked={isChecked} onChange={() => toggleStr(bathItems, setBathItems, i)} />
                              {Icon && (
                                <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg ${isChecked ? "bg-emerald-100" : colors.bg}`}>
                                  <Icon className={`h-3.5 w-3.5 ${isChecked ? "text-emerald-600" : colors.text}`} />
                                </div>
                              )}
                              <span className={`text-xs font-medium leading-tight ${isChecked ? "text-emerald-700" : "text-gray-600"}`}>{i}</span>
                              {isChecked && <div className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                            </label>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>

                {/* Other room amenities */}
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-900">What else is available inside this room?</label>
                  <p className="mb-3 text-xs text-gray-500">Select everything guests can use in this room group. Do not include shared property facilities here.</p>
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
                            className={`relative flex cursor-pointer items-center gap-2 rounded-xl border-2 p-2.5 transition-all ${
                              isChecked ? "border-emerald-500 bg-emerald-50" : "border-gray-200 bg-white hover:border-emerald-300"
                            }`}
                          >
                            <input type="checkbox" className="sr-only" checked={isChecked} onChange={() => toggleStr(otherAmenities, setOtherAmenities, i)} />
                            {Icon && (
                              <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg ${isChecked ? "bg-emerald-100" : colors.bg}`}>
                                <Icon className={`h-3.5 w-3.5 ${isChecked ? "text-emerald-600" : colors.text}`} />
                              </div>
                            )}
                            <span className={`text-xs font-medium leading-tight ${isChecked ? "text-emerald-700" : "text-gray-600"}`}>{i}</span>
                            {isChecked && <div className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                          </label>
                        );
                      });
                    })()}
                  </div>
                  <div className="mt-4">
                    <label className="mb-1 block text-sm font-semibold text-gray-900">Is something inside the room missing from the list?</label>
                    <p className="mb-2 text-xs text-gray-500">Type any extra room amenities separated by commas.</p>
                    <input
                      value={otherAmenitiesText}
                      onChange={(e) => setOtherAmenitiesText(e.target.value)}
                      className={inputClass}
                      placeholder="e.g. minibar, balcony, mosquito net"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Photos & Pricing Card ──────────────────────────────── */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                  <Camera className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Finish this room type</h3>
                  <p className="text-xs text-gray-500">Show guests the room, then set what it costs per night.</p>
                </div>
              </div>

              <div className="space-y-5">
                {/* Room photos */}
                <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
                  <PicturesUploader
                    title="Room photos"
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
                    uploading={roomImageUploading}
                  />
                </div>

                {/* Price per night */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                  <div>
                    <label htmlFor="room-nightly-price" className="block text-base font-bold text-gray-900">
                      Your nightly room rate <span className="text-red-500">*</span>
                    </label>
                    <p className="mt-1 text-xs text-gray-500">Enter your base rate for one {roomTypeOk ? roomType : "room"} for one night. NoLSAF commission is added later.</p>
                  </div>
                  <div className="mt-4 flex max-w-md items-stretch overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm transition-all focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20">
                    <span className="pointer-events-none flex h-12 flex-shrink-0 items-center border-r border-slate-200 bg-slate-50 px-4 text-sm font-bold tracking-wide text-slate-700">TZS</span>
                    <input
                      id="room-nightly-price"
                      value={pricePerNight === "" ? "" : Number(pricePerNight).toLocaleString("en-US")}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/,/g, "");
                        const val = numOrEmpty(raw);
                        setPricePerNight(val);
                      }}
                      type="text"
                      inputMode="numeric"
                      placeholder="50,000"
                      className="block h-12 min-w-0 flex-1 appearance-none border-0 bg-transparent px-4 text-lg font-bold tracking-wide text-gray-900 placeholder-gray-300 outline-none ring-0 focus:outline-none focus:ring-0"
                    />
                    <span className="pointer-events-none flex h-12 shrink-0 items-center border-l border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-500">/ night</span>
                  </div>
                  {!priceOk && pricePerNight !== "" && (
                    <div className="mt-3 flex max-w-xl items-center gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-xs font-medium text-amber-800">
                      <Circle className="h-3.5 w-3.5 shrink-0" />
                      Minimum nightly price is TZS 5,000.
                    </div>
                  )}
                </div>

                {/* Clear save checklist */}
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-gray-900">Ready to save?</p>
                      <p className="mt-0.5 text-xs text-gray-500">{completedChecks} of {requiredChecks.length} required items complete</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${canAddRoomType ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
                      {canAddRoomType ? "Ready" : `${requiredChecks.length - completedChecks} left`}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {requiredChecks.map((item) => (
                      <div key={item.label} className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-semibold ${
                        item.done ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-gray-200 bg-gray-50 text-gray-500"
                      }`}>
                        {item.done ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <Circle className="h-4 w-4 shrink-0" />}
                        {item.label}
                      </div>
                    ))}
                  </div>
                  {isMultiStorey && roomsCountOk && !floorsOk && (
                    <p className="mt-3 text-xs font-medium text-amber-700">Room distribution must equal the total number of rooms.</p>
                  )}
                </div>

                {/* Add room type button */}
                <div className="flex flex-col gap-2 pt-1 sm:items-end">
                  <button
                    type="button"
                    onClick={addRoomType}
                    disabled={!canAddRoomType}
                    className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow-md disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none active:scale-[0.98] sm:w-auto"
                  >
                    Save {roomTypeOk ? `${roomType} ` : ""}room type
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  {!canAddRoomType && <p className="text-xs text-gray-500">Complete the checklist above to enable saving.</p>}
                </div>
              </div>
            </div>

            {/* ── Saved Room Types Card ──────────────────────────────── */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      {savedRoomTypeNames.length === 1 ? `Saved ${savedRoomTypeNames[0]} room` : "Saved room types"}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {savedRoomTypeNames.length > 1 ? `${savedRoomTypeNames.join(", ")} rooms have been added.` : savedRoomTypeNames.length === 1 ? `${savedRoomTypeNames[0]} room details have been added.` : "Saved rooms will appear here."}
                    </p>
                  </div>
                </div>
                {definedRooms.length > 0 && (
                  <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                    {definedRooms.length} {definedRooms.length === 1 ? "type" : "types"}
                  </div>
                )}
              </div>
              <div className="space-y-3">
                {definedRooms.length === 0 ? (
                  <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-8 text-center">
                    <div className="text-sm font-medium text-gray-500">No room types saved yet</div>
                    <div className="mt-1 text-xs text-gray-400">Add your first room type above</div>
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
                    const bedLabel = [
                      { key: "twin", label: "Twin" },
                      { key: "full", label: "Full" },
                      { key: "queen", label: "Queen" },
                      { key: "king", label: "King" },
                    ]
                      .filter(({ key }) => Number(r.beds?.[key]) > 0)
                      .map(({ key, label }) => `${r.beds[key]} ${label}`)
                      .join(" · ") || "No beds";
                    return (
                      <div
                        key={idx}
                        className={`overflow-hidden rounded-xl border-2 transition-all duration-200 ${
                          isCollapsed ? "border-gray-200" : "border-emerald-300 shadow-sm"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleCollapsed(idx)}
                          className={`w-full flex items-start justify-between gap-4 p-4 text-left transition-colors ${
                            isCollapsed ? "bg-white hover:bg-gray-50" : "bg-emerald-50/50 hover:bg-emerald-50"
                          }`}
                          aria-expanded={!isCollapsed}
                        >
                          <div className="flex flex-1 min-w-0 items-start gap-3">
                            <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-lg font-bold transition-all ${
                              isCollapsed ? "bg-gray-100 text-gray-500" : "bg-emerald-100 text-emerald-700"
                            }`}>
                              {r.roomType.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                                <span className="text-sm font-bold text-gray-900">{r.roomType}</span>
                                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                                  isCollapsed ? "border-gray-200 bg-gray-100 text-gray-600" : "border-emerald-200 bg-emerald-50 text-emerald-700"
                                }`}>
                                  {r.roomsCount} {r.roomsCount === 1 ? "room" : "rooms"}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <div className="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-600">
                                  <span className="font-medium">Beds:</span> {bedLabel}
                                </div>
                                <div className="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-600">
                                  <span className="font-medium">Smoke:</span> {r.smoking === "yes" ? "Yes" : "No"}
                                </div>
                                <div className="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-600">
                                  <span className="font-medium">Bath:</span> {r.bathPrivate === "yes" ? "Private" : "Shared"}
                                </div>
                                {distLabel && (
                                  <div className="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-600">
                                    <span className="font-medium">Floors:</span> {distLabel}
                                  </div>
                                )}
                                {Number(r.pricePerNight) > 0 && (
                                  <div className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                                    TZS {Number(r.pricePerNight).toLocaleString("en-US")} / night
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-shrink-0 items-center gap-1.5 pt-0.5">
                            <span className={`text-xs font-medium ${isCollapsed ? "text-gray-400" : "text-emerald-600"}`}>
                              {isCollapsed ? "Show" : "Hide"}
                            </span>
                            <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${isCollapsed ? "" : "rotate-180"} ${isCollapsed ? "text-gray-400" : "text-emerald-600"}`} />
                          </div>
                        </button>

                        {!isCollapsed && (
                          <div className="border-t border-gray-200 bg-white px-4 pb-4 pt-4 sm:px-5">
                            {Array.isArray(r.roomImages) && r.roomImages.length > 0 ? (
                              <div>
                                <div className="mb-3 flex items-center justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-semibold text-gray-900">Room photos</p>
                                    <p className="mt-0.5 text-xs text-gray-500">Slide sideways to view every photo.</p>
                                  </div>
                                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600">{r.roomImages.length} photos</span>
                                </div>
                                <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                  {r.roomImages.map((u: string, i: number) => (
                                    <div key={i} className="relative aspect-[4/3] w-64 shrink-0 snap-start overflow-hidden rounded-xl border border-gray-200 bg-gray-100 shadow-sm sm:w-72">
                                      {/^https?:\/\//i.test(u) ? (
                                        <Image
                                          src={u}
                                          alt={`Room ${idx + 1} image ${i + 1}`}
                                          width={288}
                                          height={216}
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
                                      <span className="absolute bottom-2 left-2 rounded-full bg-black/65 px-2 py-0.5 text-[11px] font-semibold text-white">{i + 1} / {r.roomImages.length}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-4 text-center">
                                <div className="text-xs text-gray-400">No images for this room type</div>
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
