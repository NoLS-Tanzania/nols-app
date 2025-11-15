"use client";
import type { ReactNode } from "react";
import { useMemo, useRef, useState, useEffect, useLayoutEffect } from "react";
import Image from "next/image";
import { Plus, ChevronDown, Minus } from "lucide-react";
import axios from "axios";
import { REGIONS, REGION_BY_ID } from "@/lib/tzRegions";

const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL });
function authify(){ const t = typeof window!=="undefined" ? localStorage.getItem("token") : null; if(t) api.defaults.headers.common["Authorization"]=`Bearer ${t}`; }

type BedKey = "twin" | "full" | "queen" | "king";
const PROPERTY_TYPES = ["Villa","Apartment","Hotel","Lodge","Condo","Guest House","Bungalow","Cabin","Homestay","Townhouse","House","Other"] as const;
const HOTEL_STAR_OPTIONS = [
  { value: "", label: "Select rating" },
  { value: "basic", label: "Basic accommodations" },
  { value: "simple", label: "Simple and affordable" },
  { value: "moderate", label: "Moderate quality" },
  { value: "high", label: "High-end comfort" },
  { value: "luxury", label: "Luxury and exceptional service" },
];

/** Facilities config */
const FACILITY_TYPES = ["Hospital","Pharmacy","Polyclinic","Clinic","Emergency Center"] as const;
const REACH_MODES = ["Walking","Boda","Public Transport","Car/Taxi"] as const;
type FacilityType = typeof FACILITY_TYPES[number];
type ReachMode = typeof REACH_MODES[number];
type NearbyFacility = {
  id: string;
  type: FacilityType;
  name: string;
  ownership: "Public/Government" | "Private" | "";
  distanceKm: number | "";
  reachableBy: ReachMode[];
  url?: string;
};

type RoomEntry = {
  roomType: string;
  beds: Record<BedKey, number>;
  roomsCount: number;
  smoking: "yes" | "no";
  bathPrivate: "yes" | "no";
  bathItems: string[];
  towelColor: string;
  otherAmenities: string[];
  roomDescription: string;
  roomImages: string[];
  pricePerNight: number;
};

type ServicesState = {
  parking: "no"|"free"|"paid";
  parkingPrice: number | "";
  breakfastIncluded: boolean;
  breakfastAvailable: boolean;
  restaurant: boolean;
  bar: boolean;
  pool: boolean;
  sauna: boolean;
  laundry: boolean;
  roomService: boolean;
  security24: boolean;
  firstAid: boolean;
  fireExtinguisher: boolean;
  onSiteShop: boolean;
  nearbyMall: boolean;
  socialHall: boolean;
  sportsGames: boolean;
  gym: boolean;
  distanceHospital: number | "";
};

type BoolKeys = {
  [K in keyof ServicesState]: ServicesState[K] extends boolean ? K : never
}[keyof ServicesState];

export default function AddProperty() {
  useEffect(()=>{ authify(); },[]);

  const [propertyId, setPropertyId] = useState<number|null>(null);

  // collapses
  const [showBasics, setShowBasics] = useState(true);
  const [showRooms, setShowRooms] = useState(true);
  const [showServices, setShowServices] = useState(true);
  const [showPhotos, setShowPhotos] = useState(true);
  const [showReview, setShowReview] = useState(true);
  const [showTotals, setShowTotals] = useState(true);

  // basics / location
  const [title, setTitle] = useState("");
  const [type, setType] = useState<string>("");
  const [otherType, setOtherType] = useState<string>("");
  const isHotel = type === "Hotel";
  // default empty so placeholder "Select rating" is shown until user selects
  const [hotelStar, setHotelStar] = useState("");

  // ✅ Region/district now sourced from helper
  const [regionId, setRegionId] = useState<string>("");
  const [district, setDistrict] = useState<string>("");
  const regionName = useMemo(() => REGION_BY_ID[regionId]?.name ?? "", [regionId]);
  const districts = useMemo(() => REGION_BY_ID[regionId]?.districts ?? [], [regionId]);

  const [street, setStreet] = useState("");
  const [apartment, setApartment] = useState("");
  const [city, setCity] = useState("");
  const [zip, setZip] = useState("");
  const country = "Tanzania";
  const [latitude, setLatitude] = useState<number | "">("");
  const [longitude, setLongitude] = useState<number | "">("");

  // overall counts + description
  const [totalBedrooms, setTotalBedrooms] = useState<number | "">("");
  const [totalBathrooms, setTotalBathrooms] = useState<number | "">("");
  const [maxGuests, setMaxGuests] = useState<number | "">("");
  const [desc, setDesc] = useState("");

  // property photos (controlled here)
  const [photos, setPhotos] = useState<string[]>([]);

  // room-type mini form
  const [roomType, setRoomType] = useState("Single");
  const [beds, setBeds] = useState<Record<BedKey, number>>({ twin: 0, full: 0, queen: 0, king: 0 });
  const [roomsCount, setRoomsCount] = useState<number | "">("");
  const [smoking, setSmoking] = useState<"yes"|"no">("yes");
  const [bathPrivate, setBathPrivate] = useState<"yes"|"no">("yes");
  const [bathItems, setBathItems] = useState<string[]>([]);
  const [towelColor, setTowelColor] = useState("");
  const [otherAmenities, setOtherAmenities] = useState<string[]>([]);
  const [otherAmenitiesText, setOtherAmenitiesText] = useState("");
  const [roomDescription, setRoomDescription] = useState("");
  const [roomImages, setRoomImages] = useState<string[]>([]);
  const roomImageInput = useRef<HTMLInputElement>(null);
  const [pricePerNight, setPricePerNight] = useState<number | "">("");
  const [definedRooms, setDefinedRooms] = useState<RoomEntry[]>([]);

  // services (added nearbyFacilities)
  const [services, setServices] = useState<ServicesState>({
    parking: "no",
    parkingPrice: "",
    breakfastIncluded: false, breakfastAvailable: false,
    restaurant: false, bar: false,
    pool: false, sauna: false,
    laundry: false, roomService: false,
    security24: false, firstAid: false, fireExtinguisher: false,
    onSiteShop: false, nearbyMall: false,
    socialHall: false, sportsGames: false,
    gym: false,
    distanceHospital: "", // legacy; can keep for compatibility
  });
  const [nearbyFacilities, setNearbyFacilities] = useState<NearbyFacility[]>([]);

  // helpers
  const changeBed = (k: BedKey, d: number)=> setBeds(b=>({ ...b, [k]: Math.max(0, (b[k]??0)+d) }));
  const toggleStr = (arr: string[], setArr:(v:string[])=>void, v: string)=> {
    const s = new Set(arr); s.has(v) ? s.delete(v) : s.add(v); setArr(Array.from(s));
  };

  // Stepper refs + progress overlay
  const stepperContainerRef = useRef<HTMLDivElement|null>(null);
  const markerRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const [progressHeight, setProgressHeight] = useState(0);

  // compute overlay height up to last "reached" marker (we treat expanded sections as reached)
  useLayoutEffect(() => {
    const container = stepperContainerRef.current;
    if (!container) return;
    const shows = [showBasics, showRooms, showTotals, showPhotos, showReview];
    const lastIndex = shows.reduce((acc, v, i) => v ? Math.max(acc, i) : acc, -1);
    if (lastIndex < 0) { setProgressHeight(0); return; }
    const marker = markerRefs.current[lastIndex];
    if (!marker) { setProgressHeight(0); return; }
    const containerRect = container.getBoundingClientRect();
    const markerRect = marker.getBoundingClientRect();
    // container has top padding of 6 (top-6), so subtract that offset
    const offset = 6;
    const h = Math.max(0, Math.round((markerRect.top + markerRect.height/2) - containerRect.top - offset));
    setProgressHeight(h);

    const onResize = () => {
      const cRect = container.getBoundingClientRect();
      const mRect = marker.getBoundingClientRect();
      const hh = Math.max(0, Math.round((mRect.top + mRect.height/2) - cRect.top - offset));
      setProgressHeight(hh);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [showBasics, showRooms, showTotals, showPhotos, showReview]);

  type CloudinarySig = {
    timestamp: number;
    apiKey: string;
    signature: string;
    folder: string;
    cloudName: string;
  };

  async function uploadToCloudinary(file: File, folder: string) {
    const sig = await api.get(`/uploads/cloudinary/sign?folder=${encodeURIComponent(folder)}`);
    const fd = new FormData();
    fd.append("file", file);
    const sigData = sig.data as CloudinarySig;
    fd.append("timestamp", String(sigData.timestamp));
    fd.append("api_key", sigData.apiKey);
    fd.append("signature", sigData.signature);
    fd.append("folder", sigData.folder);
    const resp = await axios.post(`https://api.cloudinary.com/v1_1/${sigData.cloudName}/auto/upload`, fd);
    return (resp.data as { secure_url: string }).secure_url;
  }

  const pickPropertyPhotos = async (files: FileList | null) => {
    if (!files) return;
    const chosen = Array.from(files).slice(0, 10);
    const uploaded: string[] = [];
    for (const f of chosen) {
      const url = await uploadToCloudinary(f, "properties");
      uploaded.push(url);
    }
    setPhotos(prev=>[...prev, ...uploaded]);
  };

  const onPickRoomImages = async (files: FileList | null) => {
    if (!files) return;
    const chosen = Array.from(files).slice(0, 6);
    const uploaded: string[] = [];
    for (const f of chosen) {
      const url = await uploadToCloudinary(f, "properties/rooms");
      uploaded.push(url);
    }
    setRoomImages(prev=>[...prev, ...uploaded]);
  };

  const addRoomType = () => {
    const errs: string[] = [];
    if (!roomsCount || Number(roomsCount) <= 0) errs.push("Rooms count is required.");
    if (roomImages.length === 0) errs.push("At least one room image is required.");
    if (errs.length) { alert(errs.join("\n")); return; }

    const entry: RoomEntry = {
      roomType, beds, roomsCount: Number(roomsCount),
      smoking, bathPrivate, bathItems, towelColor,
      otherAmenities: Array.from(new Set([...otherAmenities, ...splitComma(otherAmenitiesText)])),
      roomDescription, roomImages, pricePerNight: Number(pricePerNight || 0)
    };
    setDefinedRooms(list => [...list, entry]);

    // reset mini
    setBeds({ twin:0, full:0, queen:0, king:0 });
    setRoomsCount(""); setSmoking("yes"); setBathPrivate("yes");
    setBathItems([]); setTowelColor(""); setOtherAmenities([]);
    setOtherAmenitiesText(""); setRoomDescription(""); setRoomImages([]);
    setPricePerNight("");
  };

  const payload = () => ({
    title,
    type: toServerType(type),
    description: desc || null,
    // location mirrors
    regionId, regionName, district,
    street, apartment, city, zip, country,
    latitude: numOrNull(latitude), longitude: numOrNull(longitude),

    photos,

    hotelStar: isHotel ? hotelStar : null,

    roomsSpec: definedRooms,

    totalBedrooms: numOrNull(totalBedrooms),
    totalBathrooms: numOrNull(totalBathrooms),
    maxGuests: numOrNull(maxGuests),

    services: {
      ...services,
      parkingPrice: numOrNull(services.parkingPrice),
      distanceHospital: numOrNull(services.distanceHospital),
      nearbyFacilities: nearbyFacilities.map(f => ({
        type: f.type,
        name: f.name.trim(),
        ownership: f.ownership || null,
        distanceKm: numOrNull(f.distanceKm),
        reachableBy: f.reachableBy,
        url: f.url?.trim() || null,
      })),
    },

    basePrice: inferBasePrice(definedRooms),
    currency: "TZS",
  });

  const completeEnough =
    title.trim().length >= 3 &&
    !!regionId &&
    !!district &&
    photos.length >= 3 &&
    definedRooms.length >= 1 &&
    // if this is a Hotel, ensure a star rating was chosen
    (!isHotel || (typeof hotelStar === "string" && hotelStar !== ""));

  async function saveDraft() {
    try {
      const body = payload();
      if (!propertyId) {
  const r = await api.post("/owner/properties", body);
  setPropertyId((r.data as { id: number }).id);
        alert("Draft created.");
      } else {
        await api.put(`/owner/properties/${propertyId}`, body);
        alert("Draft saved.");
      }
    } catch (e:any) {
      alert(e?.response?.data?.error ? JSON.stringify(e.response.data.error) : "Save failed");
    }
  }

  async function submitForReview() {
    if (!completeEnough) {
      const missing = [
        !(title.trim().length >= 3) ? "name" : null,
        !regionId ? "location" : null,
        !(photos.length >= 3) ? "≥3 photos" : null,
        !(definedRooms.length >= 1) ? "≥1 room type" : null,
        (isHotel && (!hotelStar || hotelStar === "")) ? "hotel star rating" : null,
      ].filter(Boolean);
      alert("Please complete: " + missing.join(", ") + ".");
      return;
    }
    try {
      if (!propertyId) {
  const r = await api.post("/owner/properties", payload());
  setPropertyId((r.data as { id: number }).id);
      } else {
        await api.put(`/owner/properties/${propertyId}`, payload());
      }
      const id = propertyId ?? (await refetchLatestId());
      await api.post(`/owner/properties/${id}/submit`);
      alert("Submitted for review!");
      window.location.href = "/owner/properties";
    } catch (e:any) {
      alert(e?.response?.data?.error || "Submit failed");
    }
  }

  async function refetchLatestId(): Promise<number | undefined> {
    const r = await api.get("/owner/properties/mine?status=DRAFT");
    return (r.data as { id: number }[])?.[0]?.id;
  }

  /* —— UI below —— */

  return (
    <div id="addPropertyView" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="bg-white rounded shadow-md p-6 border-l-4 border-emerald-500">
  <div className="max-w-4xl mx-auto relative" ref={stepperContainerRef} data-progress={progressHeight}>
    {/* vertical step line */}
    <div className="absolute left-8 top-6 bottom-6 w-px bg-primary-600" />
        {/* header constrained so it doesn't stretch full width */}
        <div className="mb-6 text-center max-w-md mx-auto">
          <Plus className="h-10 w-10 text-blue-500 mx-auto mb-2" />
          <h1 className="text-2xl font-bold text-gray-900">Add New Property</h1>
        </div>

        {/* BASICS */}
        <section className="mt-0 bg-white rounded p-4 border-l-4 border-primary-600">
            <div className="relative flex items-center justify-between mb-1">
            <span className={`absolute -left-10 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 ${showBasics ? 'bg-primary-600 border-primary-600' : 'bg-white border-primary-600'}`} />
            <h4 className="text-lg font-semibold text-gray-900">Basic details</h4>
            <button type="button" aria-label={showBasics ? "Collapse basic details" : "Expand basic details"} className="p-1 rounded hover:bg-white/10" onClick={() => setShowBasics(v=>!v)}>
              <ChevronDown className={`h-4 w-4 transition-transform ${showBasics ? "rotate-180" : "rotate-0"} text-primary-600`} />
            </button>
          </div>

          {showBasics && (
            <div id="propertyBasicsInner">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 items-start">
                <div className="space-y-1 md:pr-4 md:border-r md:border-gray-100">
                  <label className="block text-sm font-medium text-gray-700">Property Name <span className="text-red-600">*</span></label>
                  <input
                    value={title}
                    onChange={e=>setTitle(e.target.value)}
                    type="text"
                    className="w-full h-9 border border-gray-300 rounded-lg px-3 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Enter property name"
                  />
                </div>
                <div className="space-y-1 md:pl-4">
                  <label htmlFor="propertyTypeSelect" className="block text-sm font-medium text-gray-700">Property Type <span className="text-red-600">*</span></label>
                    <div className="relative">
                      <select
                        id="propertyTypeSelect"
                        title="Property Type"
                        value={type}
                        onChange={e=>setType(e.target.value)}
                        className="w-full h-9 appearance-none border border-gray-300 rounded-lg px-3 pr-10 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="">Select Type</option>
                        {PROPERTY_TYPES.map(t=> <option key={t} value={t}>{t}</option>)}
                      </select>
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-transparent border-0 flex items-center justify-center pointer-events-none text-gray-400">
                        <ChevronDown className="h-4 w-4" />
                      </div>
                    </div>

                  {type === "Other" && (
                    <div className="mt-2">
                      <label className="block text-sm font-medium text-gray-700">Please specify</label>
                      <input
                        value={otherType}
                        onChange={e=>setOtherType(e.target.value)}
                        type="text"
                        className="w-full h-9 border border-gray-300 rounded-lg px-3 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Specify property type"
                      />
                    </div>
                  )}

                  <div className={`mt-2 ${type==="Hotel" ? "" : "hidden"}`}>
                    <label className="block text-sm font-medium text-gray-700">Hotel Star Rating <span className="text-red-600">*</span></label>
                    <div className="relative">
                      <select
                        title="Hotel Star Rating"
                        aria-required="true"
                        required
                        value={hotelStar}
                        onChange={e=>setHotelStar(e.target.value)}
                        className="w-full h-9 appearance-none border border-gray-300 rounded-lg px-3 pr-10 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        {HOTEL_STAR_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-transparent border-0 flex items-center justify-center pointer-events-none text-gray-400">
                        <ChevronDown className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* location */}
                <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Where is your property Located?</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-600">Region <span className="text-red-600">*</span></label>
                    <div className="relative">
                      <select
                        title="Region"
                        aria-required="true"
                        required
                        value={regionId}
                        onChange={e=>{ setRegionId(e.target.value); setDistrict(""); }}
                        className="w-full h-9 appearance-none border border-gray-300 rounded-lg px-3 pr-10 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="">Select region</option>
                        {REGIONS.map((r: { id: string; name: string }) => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-transparent border-0 flex items-center justify-center pointer-events-none text-gray-400">
                        <ChevronDown className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">District <span className="text-red-600">*</span></label>
                    <div className="relative">
                      <select
                        title="District"
                        aria-required="true"
                        required
                        value={district}
                        onChange={e=>setDistrict(e.target.value)}
                        className="w-full h-9 appearance-none border border-gray-300 rounded-lg px-3 pr-10 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="">{regionId ? "Select district" : "Select region first"}</option>
                        {districts.map((d: string) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-transparent border-0 flex items-center justify-center pointer-events-none text-gray-400">
                        <ChevronDown className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <label className="text-xs text-gray-600">Street Address <span className="text-red-600">*</span></label>
                  <input aria-required="true" required value={street} onChange={e=>setStreet(e.target.value)} className="w-full h-9 border rounded-lg px-3" placeholder="Street address" />
                </div>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-600">Apartment or floor (optional)</label>
                    <input value={apartment} onChange={e=>setApartment(e.target.value)} className="w-full h-9 border rounded-lg px-3" placeholder="Apartment, building, floor, etc" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">City (optional)</label>
                    <input value={city} onChange={e=>setCity(e.target.value)} className="w-full h-9 border rounded-lg px-3" placeholder="e.g. Dar es Salaam" />
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-gray-600">Zip code (optional)</label>
                    <input value={zip} onChange={e=>setZip(e.target.value)} className="w-full h-9 border rounded-lg px-3" placeholder="Postal / ZIP code" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Latitude (optional)</label>
                    <input title="Latitude" placeholder="e.g. -6.792400" value={latitude} onChange={e=>setLatitude(numOrEmpty(e.target.value))} type="number" step="0.000001" className="w-full h-9 border rounded-lg px-3" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Longitude (optional)</label>
                    <input title="Longitude" placeholder="e.g. 39.208300" value={longitude} onChange={e=>setLongitude(numOrEmpty(e.target.value))} type="number" step="0.000001" className="w-full h-9 border rounded-lg px-3" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ROOM TYPES */}
        <section className="mt-6 bg-white rounded p-4 border-l-4 border-primary-600">
          <div className="relative flex items-center justify-between mb-1">
            <span className={`absolute -left-10 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 ${showRooms ? 'bg-primary-600 border-primary-600' : 'bg-white border-primary-600'}`} />
            <h3 className="text-lg font-semibold text-gray-900">Room & Bathroom Details</h3>
            <button type="button" aria-label={showRooms ? "Collapse room details" : "Expand room details"} className="p-1 rounded hover:bg-white/10" onClick={()=>setShowRooms(v=>!v)}>
              <ChevronDown className={`h-4 w-4 transition-transform ${showRooms ? "rotate-180" : "rotate-0"} text-primary-600`} />
            </button>
          </div>
          {showRooms && (
            <div className="space-y-4 text-gray-700 mt-2">
              <div>
                <label className="block text-sm font-medium">What type of room is this? <span className="text-red-600">*</span></label>
                <div className="relative">
                  <select title="Room type" value={roomType} onChange={e=>setRoomType(e.target.value)} className="mt-2 w-full h-9 appearance-none rounded-lg px-3 pr-10 border border-gray-300">
                    {["Single","Double","Studio","Suite","Family","Other"].map(o=><option key={o}>{o}</option>)}
                  </select>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-transparent border-0 flex items-center justify-center pointer-events-none text-gray-400">
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium">What beds are available in this room?</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                  {(["twin","full","queen","king"] as BedKey[]).map(k=>(
                    <div key={k} className="bg-gray-50 p-2 rounded flex items-center justify-between">
                      <div className="text-sm capitalize">{k} bed(s)</div>
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          aria-label={`Remove one ${k} bed`}
                          onClick={()=>changeBed(k,-1)}
                          className="inline-flex items-center justify-center h-8 w-8 rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <input
                          readOnly
                          aria-label={`${k} beds count`}
                          title={`${k} beds count`}
                          className="w-10 h-8 text-center rounded border border-gray-200"
                          value={beds[k]}
                        />
                        <button
                          type="button"
                          aria-label={`Add one ${k} bed`}
                          onClick={()=>changeBed(k,1)}
                          className="inline-flex items-center justify-center h-8 w-8 rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm">How many rooms of this type do you have? <span className="text-red-600">*</span></label>
                  <input value={roomsCount} onChange={e=>setRoomsCount(numOrEmpty(e.target.value))} type="number" min={1} placeholder="e.g. 3" className="mt-2 w-full h-9 border rounded-lg px-3" />
                </div>
                <div>
                  <label className="text-sm">Is smoking allowed in this room?</label>
                  <div className="mt-2">
                    <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <label className="inline-flex items-center">
                          <input type="radio" checked={smoking==="yes"} onChange={()=>setSmoking("yes")} className="mr-2" />
                          Yes
                        </label>
                        <label className="inline-flex items-center">
                          <input type="radio" checked={smoking==="no"} onChange={()=>setSmoking("no")} className="mr-2" />
                          No
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* bathroom */}
              <div className="mt-2">
                <h4 className="font-semibold">Bathroom Details</h4>
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                    <label className="text-sm">Is the bathroom private?</label>
                    <div className="mt-2 flex items-center space-x-4">
                      <label className="inline-flex items-center"><input type="radio" checked={bathPrivate==="yes"} onChange={()=>setBathPrivate("yes")} className="mr-2" /> Yes</label>
                      <label className="inline-flex items-center"><input type="radio" checked={bathPrivate==="no"} onChange={()=>setBathPrivate("no")} className="mr-2" /> No, it&apos;s shared</label>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm">What bathroom items are available in this room?</label>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                      {["Free toiletries","Toilet paper","Shower","Water Heater","Toilet","Hairdryer","Trash Bin","Toilet Brush","Mirror","Slippers","Bathrobe","Bath Mat","Towel"].map(i=>(
                        <label key={i} className="flex items-center">
                          <input type="checkbox" className="mr-2" checked={bathItems.includes(i)} onChange={()=>toggleStr(bathItems,setBathItems,i)} />
                          <span className="text-sm">{i}</span>
                        </label>
                      ))}
                    </div>
                    <div className="mt-2">
                      <label className="text-sm">Towel color (optional)</label>
                      <input value={towelColor} onChange={e=>setTowelColor(e.target.value)} className="mt-1 w-full h-9 border rounded-lg px-3" placeholder="e.g. white, blue" />
                    </div>
                  </div>
                </div>
              </div>

              {/* other amenities */}
              <div className="mt-2">
                <h4 className="font-semibold">Other room amenities</h4>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  {["Free Wi-Fi","Table","Chair","Iron","TV","Flat Screen TV","PS Station","Wardrobe","Air Conditioning","Mini Fridge","Coffee Maker","Phone","Mirror","Bedside Lamps","Heating","Desk","Safe","Clothes Rack","Blackout Curtains","Couches"].map(i=>(
                    <label key={i} className="flex items-center">
                      <input type="checkbox" className="mr-2" checked={otherAmenities.includes(i)} onChange={()=>toggleStr(otherAmenities,setOtherAmenities,i)} />
                      <span className="text-sm">{i}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-2">
                  <label className="text-sm">Other amenities (comma separated)</label>
                  <input value={otherAmenitiesText} onChange={e=>setOtherAmenitiesText(e.target.value)} className="mt-1 w-full h-9 border rounded-lg px-3" placeholder="e.g. minibar, balcony" />
                </div>
              </div>

              {/* room desc + images + price */}
              <div className="mt-4">
                <label className="text-sm">Room description (optional)</label>
                <textarea value={roomDescription} onChange={e=>setRoomDescription(e.target.value)} rows={3} className="mt-2 w-full rounded border border-gray-300 px-3 py-2" placeholder="Short description for this room type" />
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                <div>
                  <label htmlFor="roomImageInput" className="text-sm">Room image <span className="text-red-600">*</span></label>
                  <input
                    id="roomImageInput"
                    ref={roomImageInput}
                    type="file"
                    accept="image/*"
                    multiple
                    title="Upload room images"
                    aria-label="Upload room images"
                    placeholder="Select room images"
                    className="mt-2 text-sm text-gray-700"
                    onChange={e=>onPickRoomImages(e.target.files)}
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    {roomImages.map((u,i)=>(
                      <div key={i} className="w-20 h-20 rounded overflow-hidden border relative">
                        <Image src={u} alt="" width={80} height={80} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm">Price per night for this room type</label>
                  <div className="mt-2 flex items-center">
                    <input value={pricePerNight} onChange={e=>setPricePerNight(numOrEmpty(e.target.value))} type="number" step="0.01" placeholder="e.g. 45.00" className="w-full h-9 border rounded-lg px-3" />
                    <span className="ml-2 text-sm">/ night</span>
                  </div>
                </div>
                <div className="text-right">
                  <button type="button" onClick={addRoomType} className="bg-primary-600 px-4 py-2 rounded text-white">Add room type</button>
                </div>
              </div>

              <div className="mt-6">
                <h4 className="text-lg font-semibold">Defined room types</h4>
                <div className="mt-3 space-y-3 text-gray-800">
                  {definedRooms.length === 0 && <div className="text-sm opacity-70">No room types yet.</div>}
                  {definedRooms.map((r, idx)=>(
                    <div key={idx} className="border rounded-xl p-3">
                      <div className="font-medium">{r.roomType} • {r.roomsCount} room(s)</div>
                      <div className="text-xs opacity-70">Beds: T{r.beds.twin} / F{r.beds.full} / Q{r.beds.queen} / K{r.beds.king}</div>
                      <div className="text-xs opacity-70 mt-1">Smoking: {r.smoking}, Private bath: {r.bathPrivate}</div>
                      <div className="mt-2 flex gap-2 flex-wrap">{r.roomImages.map((u:string,i:number)=>(<Image key={i} src={u} alt={`Room ${idx+1} image ${i+1}`} width={80} height={80} className="rounded border object-cover" />))}</div>
                      <div className="mt-2 flex gap-2 flex-wrap">{r.roomImages.map((u:string,i:number)=>(<Image key={i} src={u} alt={`Room ${idx+1} image ${i+1}`} width={80} height={80} className="w-20 h-20 rounded border object-cover" />))}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* important services */}
              <div className="mt-6 bg-white rounded p-4 border-l-4 border-primary-600">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold text-gray-900">Important Services Available</h4>
                  <button type="button" aria-label={showServices ? "Collapse services" : "Expand services"} className="p-1 rounded hover:bg-white/10" onClick={()=>setShowServices(v=>!v)}>
                    <ChevronDown className={`h-4 w-4 transition-transform ${showServices ? "rotate-180" : "rotate-0"} text-primary-600`} />
                  </button>
                </div>
                {showServices && (
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {/* Parking */}
                    <div>
                      <label className="block">Parking</label>
                      <div className="mt-2 flex items-center space-x-3">
                        {(["no","free","paid"] as const).map(v=>(
                          <label key={v} className="inline-flex items-center">
                            <input type="radio" checked={services.parking===v} onChange={()=>setServices(s=>({...s,parking:v}))} className="mr-2" /> {labelParking(v)}
                          </label>
                        ))}
                      </div>
                      <div className={`${services.parking==="paid" ? "" : "hidden"} mt-2`}>
                        <label className="block text-xs text-gray-600">If paid, price per day (optional)</label>
                        <input value={services.parkingPrice as any} onChange={e=>setServices(s=>({...s,parkingPrice:numOrEmpty(e.target.value)}))} type="number" step="0.01" className="mt-1 w-full h-9 border rounded-lg px-3" placeholder="e.g. 5.00" />
                      </div>
                    </div>
                    {/* Breakfast */}
                    <div>
                      <label className="block">Breakfast</label>
                      <div className="mt-2 flex items-center space-x-3">
                        <label className="inline-flex items-center"><input type="checkbox" checked={services.breakfastIncluded} onChange={e=>setServices(s=>({...s,breakfastIncluded:e.target.checked}))} className="mr-2" /> Included</label>
                        <label className="inline-flex items-center"><input type="checkbox" checked={services.breakfastAvailable} onChange={e=>setServices(s=>({...s,breakfastAvailable:e.target.checked}))} className="mr-2" /> Available (extra)</label>
                      </div>
                    </div>
                    {/* Restaurant / Bar */}
                    <Check id="restaurant" label="Restaurant / Bar" a={[
                      {k:"restaurant", t:"Restaurant"},
                      {k:"bar", t:"Bar"}
                    ]} services={services} setServices={setServices} />
                    {/* Wellness */}
                    <Check id="wellness" label="Wellness & Leisure" a={[
                      {k:"pool", t:"Swimming Pool"},
                      {k:"sauna", t:"Sauna"}
                    ]} services={services} setServices={setServices} />
                    {/* Housekeeping */}
                    <Check id="housekeeping" label="Housekeeping & Services" a={[
                      {k:"laundry", t:"Laundry Service"},
                      {k:"roomService", t:"Room Service"}
                    ]} services={services} setServices={setServices} />
                    {/* Safety */}
                    <div>
                      <label className="block">Safety & First Aid</label>
                      <div className="mt-2 flex items-center space-x-3">
                        <Ck v="security24" t="24/7 Security" services={services} setServices={setServices}/>
                        <Ck v="firstAid" t="First Aid Kit" services={services} setServices={setServices}/>
                      </div>
                      <div className="mt-2">
                        <Ck v="fireExtinguisher" t="Fire Extinguisher on Premises" services={services} setServices={setServices}/>
                      </div>
                    </div>
                    {/* Shops */}
                    <Check id="shops" label="Shops & Nearby Facilities" a={[
                      {k:"onSiteShop", t:"Shop on-site"},
                      {k:"nearbyMall", t:"Mall nearby"}
                    ]} services={services} setServices={setServices} />
                    {/* Events */}
                    <Check id="events" label="Events & Community" a={[
                      {k:"socialHall", t:"Social Hall"},
                      {k:"sportsGames", t:"Sports & Games Area"}
                    ]} services={services} setServices={setServices} />
                    {/* Fitness */}
                    <Check id="fitness" label="Fitness" a={[
                      {k:"gym", t:"Gym / Fitness Center"},
                    ]} services={services} setServices={setServices} />

                    {/* Nearby services — Enhanced Facilities */}
                    <div className="md:col-span-2">
                      <label className="block">Nearby Services</label>

                      {/* Inline add form */}
                      <AddFacilityInline onAdd={(f) => setNearbyFacilities(list => [...list, f])} />

                      {/* List */}
                      <div className="mt-4 space-y-3">
                        {nearbyFacilities.length === 0 && (
                          <div className="text-sm opacity-70">No facilities added yet.</div>
                        )}

                        {nearbyFacilities.map((f: NearbyFacility, idx: number) => (
                          <FacilityRow
                            key={f.id}
                            facility={f}
                            onChange={(updated: NearbyFacility) =>
                              setNearbyFacilities((list: NearbyFacility[]) =>
                                list.map((x: NearbyFacility, i: number) => (i === idx ? updated : x))
                              )
                            }
                            onRemove={() =>
                              setNearbyFacilities((list: NearbyFacility[]) =>
                                list.filter((_: NearbyFacility, i: number) => i !== idx)
                              )
                            }
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* totals + description */}
        <section className="mt-6 bg-white rounded p-4 border-l-4 border-primary-600">
          <div className="relative flex items-center justify-between mb-1">
            <span className={`absolute -left-10 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 ${showTotals ? 'bg-primary-600 border-primary-600' : 'bg-white border-primary-600'}`} />
            <h3 className="text-lg font-semibold text-gray-900">Totals & Description</h3>
            <button type="button" aria-label={showTotals ? "Collapse totals" : "Expand totals"} className="p-1 rounded hover:bg-white/10" onClick={() => setShowTotals(v => !v)}>
              <ChevronDown className={`h-4 w-4 transition-transform ${showTotals ? "rotate-180" : "rotate-0"} text-primary-600`} />
            </button>
          </div>
          {showTotals && (
            <>
              <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-6">
                <Num label="Total Bedrooms" v={totalBedrooms} set={setTotalBedrooms}/>
                <Num label="Total Bathrooms" v={totalBathrooms} set={setTotalBathrooms}/>
                <Num label="Max Guests" v={maxGuests} set={setMaxGuests}/>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea rows={4} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent" placeholder="Enter property description" value={desc} onChange={e=>setDesc(e.target.value)} />
              </div>
            </>
          )}
        </section>

        {/* PROPERTY PHOTOS */}
        <section className="mt-6 bg-white rounded p-4 border-l-4 border-primary-600">
          <div className="relative flex items-center justify-between mb-1">
            <span className={`absolute -left-10 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 ${showPhotos ? 'bg-primary-600 border-primary-600' : 'bg-white border-primary-600'}`} />
            <h3 className="text-lg font-semibold text-gray-900">Property Photos</h3>
            <button type="button" aria-label={showPhotos ? "Collapse photos" : "Expand photos"} className="p-1 rounded hover:bg-white/10" onClick={()=>setShowPhotos(v=>!v)}>
              <ChevronDown className={`h-4 w-4 transition-transform ${showPhotos ? "rotate-180" : "rotate-0"} text-primary-600`} />
            </button>
          </div>
          {showPhotos && (
            <div className="grid gap-3">
              <div className="flex flex-wrap gap-2">
                {photos.map((u,i)=>(
                  <div key={i} className="w-28 h-28 border rounded-lg relative overflow-hidden">
                    <Image src={u} alt="" width={112} height={112} className="w-full h-full object-cover" />
                    <button className="absolute top-1 right-1 text-[11px] px-1.5 py-0.5 bg-white/80 rounded border" onClick={()=>setPhotos(p=>p.filter((_,idx)=>idx!==i))}>Remove</button>
                  </div>
                ))}
                <label className="w-28 h-28 border rounded-lg flex items-center justify-center text-sm cursor-pointer">
                  <input type="file" title="Upload property photos" aria-label="Upload property photos" accept="image/*" multiple className="hidden" onChange={e=>pickPropertyPhotos(e.target.files)} />
                  Upload
                </label>
              </div>
              <div className="text-xs opacity-70">Add at least 3 photos before final submission.</div>
            </div>
          )}
        </section>

        {/* REVIEW */}
        <section className="mt-6 bg-white rounded p-4 border-l-4 border-emerald-600">
          <div className="relative flex items-center justify-between mb-1">
            <span className={`absolute -left-10 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 ${showReview ? 'bg-primary-600 border-primary-600' : 'bg-white border-primary-600'}`} />
            <h3 className="text-lg font-semibold text-gray-900">Review & Submit</h3>
            <button type="button" aria-label={showReview ? "Collapse review" : "Expand review"} className="p-1 rounded hover:bg-white/10" onClick={()=>setShowReview(v=>!v)}>
              <ChevronDown className={`h-4 w-4 transition-transform ${showReview ? "rotate-180" : "rotate-0"} text-emerald-700`} />
            </button>
          </div>
          {showReview && (
            <div className="grid gap-3">
              <div className="text-sm">Minimum required before submit: name, location, ≥3 photos, ≥1 room type.</div>
              <div className="text-sm">
                Status: {completeEnough ? <span className="text-green-700">Looks good ✅</span> : <span className="text-red-700">Incomplete ❌</span>}
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-2 rounded-xl border" onClick={saveDraft}>Save Draft</button>
                <button className={`px-3 py-2 rounded-xl ${completeEnough ? "bg-emerald-600 text-white":"border opacity-60 cursor-not-allowed"}`} disabled={!completeEnough} onClick={submitForReview}>
                  Submit for Review
                </button>
              </div>
            </div>
          )}
        </section>
        </div>
      </div>
    </div>
  );
}

/* Small pieces */
function Num({label,v,set}:{label:string; v:number|""; set:(v:number|"")=>void}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <input type="number" value={v} onChange={e=>set(numOrEmpty(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent" placeholder="0" />
    </div>
  );
}
function Check<K extends BoolKeys>(props:{ id?: string; label:string; a:{k:K,t:string}[]; services:ServicesState; setServices:React.Dispatch<React.SetStateAction<ServicesState>> }) {
  const { label, a, services, setServices } = props;
  return (
    <div>
      <label className="block">{label}</label>
      <div className="mt-2 flex items-center flex-wrap gap-3">
        {a.map(x=>(
          <label key={x.k as string} className="inline-flex items-center">
            <input type="checkbox" checked={services[x.k]} onChange={e=>setServices((s)=>({...s,[x.k]: e.target.checked } as ServicesState))} className="mr-2" /> {x.t}
          </label>
        ))}
      </div>
    </div>
  );
}
function Ck({v,t,services,setServices}:{v:BoolKeys;t:string;services:ServicesState;setServices:React.Dispatch<React.SetStateAction<ServicesState>>}) {
  return <label className="inline-flex items-center"><input type="checkbox" checked={services[v]} onChange={e=>setServices((s)=>({...s,[v]: e.target.checked } as ServicesState))} className="mr-2" /> {t}</label>;
}

/** Facilities mini-components */
function AddFacilityInline({ onAdd }:{ onAdd:(f:NearbyFacility)=>void }) {
  const [type, setType] = useState<FacilityType>("Hospital");
  const [name, setName] = useState("");
  const [ownership, setOwnership] = useState<"Public/Government"|"Private"|"">("");
  const [distanceKm, setDistanceKm] = useState<number| "">("");
  const [reachableBy, setReachableBy] = useState<ReachMode[]>([]);
  const [url, setUrl] = useState("");

  const toggleMode = (m: ReachMode) =>
    setReachableBy(prev => prev.includes(m) ? prev.filter(x=>x!==m) : [...prev, m]);

  const canAdd = name.trim().length >= 2;

  const add = () => {
    if (!canAdd) return;
    onAdd({
      id: cryptoId(),
      type, name, ownership,
      distanceKm,
      reachableBy,
      url: url || undefined,
    });
    // reset
    setName(""); setOwnership(""); setDistanceKm(""); setReachableBy([]); setUrl("");
  };

  return (
    <div className="mt-3 border rounded-xl p-3 bg-gray-50">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div>
          <LabelSmall>Type</LabelSmall>
          <div className="relative">
            <select
              title="Type"
              value={type}
              onChange={e=>setType(e.target.value as FacilityType)}
              className="w-full h-9 appearance-none rounded border border-gray-300 px-3 pr-10"
            >
              {FACILITY_TYPES.map(t=> <option key={t}>{t}</option>)}
            </select>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-transparent border-0 flex items-center justify-center pointer-events-none text-gray-400">
              <ChevronDown className="h-4 w-4" />
            </div>
          </div>
        </div>
        <div>
          <LabelSmall>Name</LabelSmall>
          <input
            value={name}
            onChange={e=>setName(e.target.value)}
            className="w-full h-9 border rounded-lg px-3"
            placeholder="e.g. Aga Khan Hospital"
          />
        </div>
        <div>
          <LabelSmall>Ownership</LabelSmall>
          <div className="relative">
            <select
              title="Ownership"
              value={ownership}
              onChange={e=>setOwnership(e.target.value as any)}
              className="w-full h-9 appearance-none rounded border border-gray-300 px-3 pr-10"
            >
              <option value="">Select</option>
              <option>Public/Government</option>
              <option>Private</option>
            </select>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-transparent border-0 flex items-center justify-center pointer-events-none text-gray-400">
              <ChevronDown className="h-4 w-4" />
            </div>
          </div>
        </div>
        <div>
          <LabelSmall>Distance (km)</LabelSmall>
          <input
            value={distanceKm as any}
            onChange={e=>setDistanceKm(numOrEmpty(e.target.value))}
            type="number" step="0.1"
            className="w-full h-9 border rounded-lg px-3"
            placeholder="e.g. 2.5"
          />
        </div>
        <div>
          <LabelSmall>More info (URL)</LabelSmall>
          <input
            value={url}
            onChange={e=>setUrl(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2"
            placeholder="https://..."
          />
        </div>
      </div>

      <div className="mt-3">
        <LabelSmall>Reachable by</LabelSmall>
        <div className="mt-1 flex flex-wrap gap-3 text-sm">
          {REACH_MODES.map(m=>(
            <label key={m} className="inline-flex items-center">
              <input
                type="checkbox"
                className="mr-2"
                checked={reachableBy.includes(m)}
                onChange={()=>toggleMode(m)}
              />
              {m}
            </label>
          ))}
        </div>
      </div>

      <div className="mt-3 text-right">
        <button
          type="button"
          onClick={add}
          disabled={!canAdd}
          className={`px-3 py-1.5 rounded-lg ${canAdd ? "bg-primary-600 text-white" : "border opacity-60 cursor-not-allowed"}`}
        >
          Add facility
        </button>
      </div>
    </div>
  );
}

function FacilityRow({
  facility, onChange, onRemove
}:{ facility: NearbyFacility; onChange:(f:NearbyFacility)=>void; onRemove:()=>void }) {

  const toggleMode = (m: ReachMode) =>
    onChange({ ...facility, reachableBy: facility.reachableBy.includes(m)
      ? facility.reachableBy.filter(x=>x!==m) : [...facility.reachableBy, m] });

  return (
    <div className="border rounded-xl p-3">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div>
          <LabelSmall>Type</LabelSmall>
          <div className="relative">
            <select
              title="Type"
              value={facility.type}
              onChange={e=>onChange({ ...facility, type: e.target.value as FacilityType })}
              className="w-full h-9 appearance-none rounded border border-gray-300 px-3 pr-10"
            >
              {FACILITY_TYPES.map(t=> <option key={t}>{t}</option>)}
            </select>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-transparent border-0 flex items-center justify-center pointer-events-none text-gray-400">
              <ChevronDown className="h-4 w-4" />
            </div>
          </div>
        </div>
        <div>
          <LabelSmall>Name</LabelSmall>
          <input
            title="Facility name"
            placeholder="e.g. Aga Khan Hospital"
            value={facility.name}
            onChange={e=>onChange({ ...facility, name: e.target.value })}
            className="w-full h-9 border rounded-lg px-3"
          />
        </div>
        <div>
          <LabelSmall>Ownership</LabelSmall>
          <div className="relative">
            <select
              title="Ownership"
              value={facility.ownership}
              onChange={e=>onChange({ ...facility, ownership: e.target.value as any })}
              className="w-full h-9 appearance-none rounded border border-gray-300 px-3 pr-10"
            >
              <option value="">Select</option>
              <option>Public/Government</option>
              <option>Private</option>
            </select>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-transparent border-0 flex items-center justify-center pointer-events-none">
              <ChevronDown className="h-4 w-4 text-gray-500" />
            </div>
          </div>
        </div>
        <div>
          <LabelSmall>Distance (km)</LabelSmall>
          <input
            title="Distance (km)"
            placeholder="e.g. 2.5"
            value={facility.distanceKm as any}
            onChange={e=>onChange({ ...facility, distanceKm: numOrEmpty(e.target.value) })}
            type="number" step="0.1"
            className="w-full h-9 border rounded-lg px-3"
          />
        </div>
        <div>
          <LabelSmall>More info (URL)</LabelSmall>
          <input
            title="More info (URL)"
            placeholder="https://..."
            value={facility.url ?? ""}
            onChange={e=>onChange({ ...facility, url: e.target.value })}
            className="w-full h-9 border rounded-lg px-3"
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-sm">
        {REACH_MODES.map(m=>(
          <label key={m} className="inline-flex items-center">
            <input
              type="checkbox"
              className="mr-2"
              checked={facility.reachableBy.includes(m)}
              onChange={()=>toggleMode(m)}
            />
            {m}
          </label>
        ))}
      </div>

      <div className="mt-3 text-right">
        <button type="button" onClick={onRemove} className="px-3 py-1.5 rounded-lg border">Remove</button>
      </div>
    </div>
  );
}

function LabelSmall({children, className=""}:{children:ReactNode; className?:string}) {
  return <label className={`block text-xs text-gray-600 ${className}`}>{children}</label>;
}

/* utils */
function numOrEmpty(v: string){ if(v==="") return ""; const n=Number(v); return Number.isFinite(n)? n : ""; }
function numOrNull(v: any){ return v==="" || v==null ? null : Number(v); }
function splitComma(s:string){ return s.split(",").map(x=>x.trim()).filter(Boolean); }
function labelParking(v:"no"|"free"|"paid"){ return v==="no"?"No":v==="free"?"Yes (Free)":"Yes (Paid)"; }
function inferBasePrice(rooms: any[]){ const prices = rooms.map(r=>Number(r.pricePerNight||0)).filter(n=>n>0); return prices.length? Math.min(...prices) : null; }
function toServerType(t: string){
  const map: Record<string,string> = { "Guest House":"GUEST_HOUSE", "Townhouse":"TOWNHOUSE", "Other":"OTHER" };
  const up = t.toUpperCase().replace(/\s+/g,"_");
  return (map[t] ?? up);
}
function cryptoId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2);
}
