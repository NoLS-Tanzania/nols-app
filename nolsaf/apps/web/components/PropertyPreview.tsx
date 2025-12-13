"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { 
  MapPin, 
  Star, 
  Wifi, 
  Car, 
  UtensilsCrossed, 
  Dumbbell, 
  Waves, 
  Tv, 
  AirVent,
  CheckCircle2,
  XCircle,
  Edit,
  Save,
  X,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Bed,
  Bath,
  Users,
  DollarSign,
  Calendar,
  Phone,
  Mail,
  Building2,
  Info,
  AlertCircle,
  Coffee,
  Beer,
  Thermometer,
  Package,
  Shield,
  Bandage,
  FireExtinguisher,
  ShoppingBag,
  Store,
  PartyPopper,
  Gamepad,
  Fuel,
  Bus,
  Link as LinkIcon,
  Sparkles,
  ScrollText,
  ShowerHead,
  Flame,
  Toilet as ToiletIcon,
  Wind,
  Trash2,
  Brush,
  ScanFace,
  FootprintsIcon,
  Shirt,
  RectangleHorizontal,
  Table2,
  Armchair,
  CircleDot,
  MonitorPlay,
  Gamepad2,
  Refrigerator,
  LampDesk,
  Heater,
  LockKeyhole,
  Eclipse,
  Sofa,
  WashingMachine,
  Share2,
  Heart,
  BadgeCheck,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle as XCircleIcon,
  Ban,
  FileText,
  Map,
  Loader2
} from "lucide-react";
import axios from "axios";
import { motion } from "framer-motion";
import NeighborhoodGuide from "./NeighborhoodGuide";

const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL });

interface PropertyPreviewProps {
  propertyId: number;
  mode?: "admin" | "public" | "owner";
  onApproved?: () => void;
  onRejected?: () => void;
  onUpdated?: () => void;
}

export default function PropertyPreview({ 
  propertyId, 
  mode = "public",
  onApproved,
  onRejected,
  onUpdated
}: PropertyPreviewProps) {
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);
  const [rejectReasons, setRejectReasons] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [displayPhotos, setDisplayPhotos] = useState<string[]>([]);
  const [checkInDate, setCheckInDate] = useState<string>("");
  const [checkOutDate, setCheckOutDate] = useState<string>("");
  const [numAdults, setNumAdults] = useState<number>(2);
  const [numChildren, setNumChildren] = useState<number>(0);
  const [numRooms, setNumRooms] = useState<number>(1);
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [showShareMenu, setShowShareMenu] = useState<boolean>(false);
  const [reviews, setReviews] = useState<any>(null);
  const [reviewsLoading, setReviewsLoading] = useState<boolean>(false);

  useEffect(() => {
    loadProperty();
  }, [propertyId]);

  useEffect(() => {
    if (property && mode === "public") {
      loadReviews();
    }
  }, [property, mode]);

  async function loadReviews() {
    try {
      setReviewsLoading(true);
      const response = await api.get(`/property-reviews/${propertyId}`);
      setReviews(response.data);
    } catch (err: any) {
      console.error("Load reviews error:", err);
      // Don't show error - reviews are optional
    } finally {
      setReviewsLoading(false);
    }
  }

  // Close share menu when clicking outside
  useEffect(() => {
    if (showShareMenu) {
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (!target.closest('.share-menu-container')) {
          setShowShareMenu(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showShareMenu]);

  function authify() {
    const t = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (t) api.defaults.headers.common["Authorization"] = `Bearer ${t}`;
  }

  async function loadProperty() {
    try {
      setLoading(true);
      authify();
      const endpoint = mode === "admin" 
        ? `/admin/properties/${propertyId}`
        : mode === "owner"
        ? `/owner/properties/${propertyId}`
        : `/public/properties/${propertyId}`;
      
      const response = await api.get(endpoint);
      const data = mode === "admin" || mode === "owner" 
        ? response.data 
        : response.data?.item || response.data;
      
      setProperty(data);
      setEditData(data);
      // Initialize display photos array
      if (data.photos && Array.isArray(data.photos)) {
        setDisplayPhotos(data.photos);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to load property");
      console.error("Load property error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    if (!confirm("Are you sure you want to approve this property?")) return;
    try {
      setSaving(true);
      authify();
      await api.post(`/admin/properties/${propertyId}/approve`, { note: "" });
      await loadProperty();
      onApproved?.();
      alert("Property approved successfully!");
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to approve property");
    } finally {
      setSaving(false);
    }
  }

  async function handleReject() {
    if (!rejectReasons.trim()) {
      alert("Please provide rejection reasons");
      return;
    }
    try {
      setSaving(true);
      authify();
      const reasons = rejectReasons.split(",").map((s) => s.trim()).filter(Boolean);
      await api.post(`/admin/properties/${propertyId}/reject`, { reasons, note: "" });
      await loadProperty();
      setShowRejectDialog(false);
      setRejectReasons("");
      onRejected?.();
      alert("Property rejected");
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to reject property");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEdit() {
    try {
      setSaving(true);
      authify();
      await api.patch(`/admin/properties/${propertyId}`, {
        title: editData?.title,
        description: editData?.description,
        basePrice: editData?.basePrice,
        currency: editData?.currency,
      });
      await loadProperty();
      setIsEditing(false);
      onUpdated?.();
      alert("Property updated successfully!");
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to update property");
    } finally {
      setSaving(false);
    }
  }

  function handleShare() {
    if (navigator.share) {
      navigator.share({
        title: property?.title,
        text: property?.description?.substring(0, 100),
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard!");
    }
    setShowShareMenu(false);
  }

  function handleFavorite() {
    setIsFavorite(!isFavorite);
    // TODO: Implement favorite API call
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading property...</p>
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">{error || "Property not found"}</p>
        </div>
      </div>
    );
  }

  // Calculate mock booking count (would come from API)
  const bookingCount = property?.status === "APPROVED" ? Math.floor(Math.random() * 50) + 10 : 0;
  const isPopular = bookingCount > 30;
  const isRecentlyBooked = bookingCount > 0 && Math.random() > 0.5;

  const photos = displayPhotos.length > 0 ? displayPhotos : (property.photos || []);
  const rooms = property.roomsSpec || [];
  const servicesRaw = property.services;
  const location = property.location || {};
  const status = property.status;
  const hotelStar = property.hotelStar;
  const totalBedrooms = property.totalBedrooms;
  const totalBathrooms = property.totalBathrooms;
  const maxGuests = property.maxGuests;

  // Parse services - can be array of strings or object
  const servicesArray = Array.isArray(servicesRaw) ? servicesRaw : [];
  const servicesObj = typeof servicesRaw === 'object' && !Array.isArray(servicesRaw) ? servicesRaw : {};
  
  // Extract nearby facilities - check both services array (as JSON string) and services object
  let nearbyFacilities: any[] = [];
  try {
    // Try to find nearbyFacilities in services object
    if (servicesObj.nearbyFacilities && Array.isArray(servicesObj.nearbyFacilities)) {
      nearbyFacilities = servicesObj.nearbyFacilities;
    }
    // Also check if it's stored as a JSON string in the services array
    const facilitiesStr = servicesArray.find((s: string) => s.includes('nearbyFacilities') || s.startsWith('['));
    if (facilitiesStr) {
      try {
        const parsed = JSON.parse(facilitiesStr);
        if (Array.isArray(parsed)) nearbyFacilities = parsed;
      } catch {}
    }
  } catch {}

  // Build comprehensive amenities list from services array/object
  const parseServiceLabel = (s: string) => {
    if (s.includes("Free parking")) return { key: "parking", label: "Free Parking", icon: Car, value: true };
    if (s.includes("Paid parking")) return { key: "parking", label: s, icon: Car, value: true };
    if (s.includes("Breakfast included")) return { key: "breakfast", label: "Breakfast Included", icon: Coffee, value: true };
    if (s.includes("Breakfast available")) return { key: "breakfast", label: "Breakfast Available", icon: Coffee, value: true };
    if (s.includes("Restaurant")) return { key: "restaurant", label: "Restaurant", icon: UtensilsCrossed, value: true };
    if (s.includes("Bar")) return { key: "bar", label: "Bar", icon: Beer, value: true };
    if (s.includes("Pool")) return { key: "pool", label: "Swimming Pool", icon: Waves, value: true };
    if (s.includes("Sauna")) return { key: "sauna", label: "Sauna", icon: Thermometer, value: true };
    if (s.includes("Laundry")) return { key: "laundry", label: "Laundry", icon: WashingMachine, value: true };
    if (s.includes("Room service")) return { key: "roomService", label: "Room Service", icon: Package, value: true };
    if (s.includes("24h security") || s.includes("24-hour security")) return { key: "security", label: "24/7 Security", icon: Shield, value: true };
    if (s.includes("First aid")) return { key: "firstAid", label: "First Aid", icon: Bandage, value: true };
    if (s.includes("Fire extinguisher")) return { key: "fireExtinguisher", label: "Fire Extinguisher", icon: FireExtinguisher, value: true };
    if (s.includes("On-site shop")) return { key: "onSiteShop", label: "On-site Shop", icon: ShoppingBag, value: true };
    if (s.includes("Nearby mall")) return { key: "nearbyMall", label: "Nearby Mall", icon: Store, value: true };
    if (s.includes("Social hall")) return { key: "socialHall", label: "Social Hall", icon: PartyPopper, value: true };
    if (s.includes("Sports") || s.includes("Sports & games")) return { key: "sports", label: "Sports & Games", icon: Gamepad, value: true };
    if (s.includes("Gym")) return { key: "gym", label: "Gym / Fitness Center", icon: Dumbbell, value: true };
    return null;
  };

  const amenities = servicesArray.map(parseServiceLabel).filter(Boolean) as Array<{ key: string; label: string; icon: any; value: boolean }>;
  
  // Add common amenities that might be in services object
  if (servicesObj.wifi || servicesArray.some((s: string) => s.toLowerCase().includes("wifi"))) {
    amenities.push({ key: "wifi", label: "Free WiFi", icon: Wifi, value: true });
  }
  if (servicesObj.ac || servicesArray.some((s: string) => s.toLowerCase().includes("air conditioning"))) {
    amenities.push({ key: "ac", label: "Air Conditioning", icon: AirVent, value: true });
  }

  return (
    <div className="w-full bg-white">
      {/* Header with Status and Actions */}
      {mode === "admin" && (
        <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  status === "PENDING" ? "bg-amber-100 text-amber-800" :
                  status === "APPROVED" ? "bg-emerald-100 text-emerald-800" :
                  status === "REJECTED" ? "bg-red-100 text-red-800" :
                  "bg-gray-100 text-gray-800"
                }`}>
                  {status}
                </span>
                {property.owner && (
                  <div className="text-sm text-gray-600">
                    Owner: <span className="font-medium">{property.owner.name || property.owner.email}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!isEditing ? (
                  <>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                      Edit
                    </button>
                    {status === "PENDING" && (
                      <>
                        <button
                          onClick={handleApprove}
                          disabled={saving}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => setShowRejectDialog(true)}
                          disabled={saving}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditData(property);
                      }}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      {saving ? "Saving..." : "Save"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Gallery - Exact Booking.com Style Layout */}
      <div className="relative w-full bg-gray-100">
        {photos.length > 0 ? (
          <>
            {/* Main Gallery Grid */}
            <div className="grid grid-cols-3 gap-2 h-[500px] md:h-[600px]">
              {/* Main Large Image (Left 2/3) */}
              <div 
                className="col-span-2 relative group cursor-pointer overflow-hidden rounded-l-2xl" 
                onClick={() => {
                  setSelectedImageIndex(0);
                  setShowLightbox(true);
                }}
              >
                <Image
                  src={photos[0]}
                  alt={property.title || "Property image"}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  priority
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                {/* Show all photos button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImageIndex(0);
                    setShowLightbox(true);
                  }}
                  className="absolute bottom-4 right-4 bg-white hover:bg-gray-50 text-gray-800 px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 text-sm font-semibold transition-all z-10"
                >
                  <Maximize2 className="h-4 w-4" />
                  Show all photos
                  {photos.length > 5 && (
                    <span className="ml-1 text-xs bg-gray-100 px-2 py-0.5 rounded font-medium">
                      {photos.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Right Grid (1/3) - 2x2 Grid */}
              <div className="grid grid-rows-2 gap-2">
                {photos.slice(1, 5).map((photo: string, idx: number) => {
                  const isLast = idx === 3;
                  const roundedClass = 
                    idx === 0 ? "rounded-tr-2xl" :
                    idx === 3 ? "rounded-br-2xl" : "";
                  return (
                    <div
                      key={idx}
                      className={`relative group cursor-pointer overflow-hidden ${roundedClass}`}
                      onClick={() => {
                        setSelectedImageIndex(idx + 1);
                        setShowLightbox(true);
                      }}
                    >
                      <Image
                        src={photo}
                        alt={`Property image ${idx + 2}`}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                      {isLast && photos.length > 5 && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[1px]">
                          <span className="text-white font-bold text-2xl">
                            +{photos.length - 5} photos
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
                {photos.length === 1 && (
                  <>
                    <div className="bg-gray-200 rounded-tr-2xl" />
                    <div className="bg-gray-200" />
                    <div className="bg-gray-200" />
                    <div className="bg-gray-200 rounded-br-2xl" />
                  </>
                )}
              </div>
            </div>

            {/* Thumbnail Strip Below - Booking.com Style */}
            {photos.length > 1 && (
              <div className="mt-2 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {photos.slice(0, 5).map((photo: string, idx: number) => (
                  <button
                    key={`${photo}-${idx}`}
                    onClick={() => {
                      // Swap clicked thumbnail with main gallery position (index 0)
                      const newPhotos = [...photos];
                      [newPhotos[0], newPhotos[idx]] = [newPhotos[idx], newPhotos[0]];
                      setDisplayPhotos(newPhotos);
                      setSelectedImageIndex(0);
                    }}
                    className={`relative w-20 h-20 md:w-24 md:h-24 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                      idx === 0 ? "border-emerald-500 scale-105 shadow-md" : "border-transparent hover:border-gray-300 opacity-80 hover:opacity-100"
                    }`}
                  >
                    <Image
                      src={photo}
                      alt={`Thumbnail ${idx + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
                {photos.length > 5 && (
                  <button
                    onClick={() => {
                      setSelectedImageIndex(0);
                      setShowLightbox(true);
                    }}
                    className="relative w-20 h-20 md:w-24 md:h-24 flex-shrink-0 rounded-lg overflow-hidden border-2 border-gray-300 bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all cursor-pointer"
                  >
                    <div className="text-center">
                      <span className="text-gray-700 font-bold text-lg block">+{photos.length - 5}</span>
                      <span className="text-gray-600 text-xs">photos</span>
                    </div>
                  </button>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-[500px] md:h-[600px] flex items-center justify-center bg-gray-200 rounded-2xl">
            <p className="text-gray-500">No images available</p>
          </div>
        )}
      </div>

      {/* Availability Section - Booking.com Style */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <section className="bg-white rounded-xl border border-gray-200 p-6 md:p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-gray-900">Availability</h2>
            <a href="#" className="text-blue-600 hover:text-blue-700 text-sm font-medium underline">
              We Price Match
            </a>
          </div>

          {/* Alert if dates not selected */}
          {!checkInDate || !checkOutDate ? (
            <div className="mb-6 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">
                Select dates to see this property's availability and prices
              </p>
            </div>
          ) : null}

          {/* Date and Guest Selection */}
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            {/* Date Range Picker */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Check-in date — Check-out date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={checkInDate}
                  onChange={(e) => setCheckInDate(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-yellow-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-gray-900 font-medium"
                />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
              </div>
              {checkInDate && (
                <input
                  type="date"
                  value={checkOutDate}
                  onChange={(e) => setCheckOutDate(e.target.value)}
                  min={checkInDate}
                  className="w-full mt-2 px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 font-medium"
                />
              )}
            </div>

            {/* Guest/Room Selector */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Guests & Rooms
              </label>
              <div className="relative">
                <select
                  value={`${numAdults} adults · ${numChildren} children · ${numRooms} room${numRooms !== 1 ? 's' : ''}`}
                  onChange={() => {}}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 font-medium appearance-none bg-white"
                >
                  <option>{numAdults} adults · {numChildren} children · {numRooms} room{numRooms !== 1 ? 's' : ''}</option>
                </select>
                <Users className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Search Button */}
            <div className="flex items-end">
              <button
                onClick={() => {
                  // Handle search - could trigger price fetching
                  console.log("Search availability", { checkInDate, checkOutDate, numAdults, numChildren, numRooms });
                }}
                className="w-full md:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors whitespace-nowrap"
              >
                Search
              </button>
            </div>
          </div>

          {/* Room Availability Table */}
          {rooms.length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Table Header */}
              <div className="bg-blue-900 text-white px-6 py-4 grid grid-cols-[2fr_1fr] gap-4">
                <div className="font-semibold">Room Type</div>
                <div className="font-semibold">Number of guests</div>
              </div>

              {/* Table Rows */}
              <div className="divide-y divide-gray-200">
                {rooms.map((room: any, idx: number) => {
                  const totalAdults = room.maxAdults || numAdults;
                  const totalChildren = room.maxChildren || numChildren;
                  
                  return (
                    <div key={idx} className="px-6 py-5 grid grid-cols-[2fr_1fr] gap-4 hover:bg-gray-50 transition-colors">
                      {/* Room Type Column */}
                      <div className="flex items-start gap-3">
                        <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0 mt-1" />
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-2">
                            {room.roomType || `Room Type ${idx + 1}`}
                          </h3>
                          {/* Bed Configuration */}
                          <div className="space-y-1 text-sm text-gray-600">
                            {room.beds ? (
                              <div className="flex items-center gap-2">
                                <Bed className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                <div className="flex flex-wrap gap-x-3 gap-y-1">
                                  {room.beds.king > 0 && <span>{room.beds.king} king bed{room.beds.king > 1 ? 's' : ''}</span>}
                                  {room.beds.queen > 0 && <span>{room.beds.queen} queen bed{room.beds.queen > 1 ? 's' : ''}</span>}
                                  {room.beds.twin > 0 && <span>{room.beds.twin} twin bed{room.beds.twin > 1 ? 's' : ''}</span>}
                                  {room.beds.full > 0 && <span>{room.beds.full} full bed{room.beds.full > 1 ? 's' : ''}</span>}
                                </div>
                              </div>
                            ) : room.roomsCount > 1 ? (
                              // Multi-room suite - show bedroom breakdown
                              Array.from({ length: room.roomsCount || 1 }).map((_, bedIdx: number) => {
                                const bedConfig = room.bedrooms?.[bedIdx] || {};
                                const bedTypes: string[] = [];
                                if (bedConfig.king > 0) bedTypes.push(`${bedConfig.king} king bed${bedConfig.king > 1 ? 's' : ''}`);
                                if (bedConfig.twin > 0) bedTypes.push(`${bedConfig.twin} twin bed${bedConfig.twin > 1 ? 's' : ''}`);
                                if (bedConfig.queen > 0) bedTypes.push(`${bedConfig.queen} queen bed${bedConfig.queen > 1 ? 's' : ''}`);
                                if (bedTypes.length === 0) bedTypes.push("1 bed");
                                
                                return (
                                  <div key={bedIdx} className="flex items-center gap-2">
                                    <Bed className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                    <span>Bedroom {bedIdx + 1} {bedTypes.join(", ")}</span>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="flex items-center gap-2">
                                <Bed className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                <span>1 bed</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Number of Guests Column */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {/* Adult Icons */}
                          {Array.from({ length: Math.min(totalAdults, 6) }).map((_, i) => (
                            <Users key={`adult-${i}`} className="h-5 w-5 text-gray-700" />
                          ))}
                          {totalAdults > 6 && (
                            <span className="text-sm font-medium text-gray-700">×{totalAdults}</span>
                          )}
                          {/* Children Icons */}
                          {totalChildren > 0 && (
                            <>
                              {Array.from({ length: Math.min(totalChildren, 3) }).map((_, i) => (
                                <Users key={`child-${i}`} className="h-4 w-4 text-gray-700" />
                              ))}
                              {totalChildren > 3 && (
                                <span className="text-sm font-medium text-gray-700">×{totalChildren}</span>
                              )}
                            </>
                          )}
                          <Info className="h-4 w-4 text-gray-400 cursor-help" />
                        </div>
                        <button
                          onClick={() => {
                            // Handle show prices
                            console.log("Show prices for", room.roomType);
                          }}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded transition-colors whitespace-nowrap"
                        >
                          Show prices
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-[1fr_400px] gap-12">
          {/* Left Column - Main Content */}
          <div className="space-y-10">
            {/* Title and Location - Booking.com Style */}
            <div className="border-b border-gray-200 pb-6">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight flex-1">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editData?.title || ""}
                          onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-3xl font-bold"
                        />
                      ) : (
                        property.title
                      )}
                    </h1>
                    {/* Share & Favorite Buttons */}
                    {mode === "public" && (
                      <div className="flex items-center gap-2 share-menu-container">
                        <div className="relative">
                          <button
                            onClick={() => setShowShareMenu(!showShareMenu)}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            aria-label="Share"
                          >
                            <Share2 className="h-5 w-5 text-gray-600" />
                          </button>
                          {showShareMenu && (
                            <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 p-2 z-10 min-w-[150px]">
                              <button
                                onClick={handleShare}
                                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded flex items-center gap-2"
                              >
                                <Share2 className="h-4 w-4" />
                                Share property
                              </button>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(window.location.href);
                                  setShowShareMenu(false);
                                  alert("Link copied!");
                                }}
                                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded flex items-center gap-2"
                              >
                                <LinkIcon className="h-4 w-4" />
                                Copy link
                              </button>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={handleFavorite}
                          className={`p-2 hover:bg-gray-100 rounded-full transition-colors ${
                            isFavorite ? "text-red-500" : "text-gray-600"
                          }`}
                          aria-label="Favorite"
                        >
                          <Heart className={`h-5 w-5 ${isFavorite ? "fill-current" : ""}`} />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {/* Social Proof Badges */}
                  {mode === "public" && (
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      {property.status === "APPROVED" && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-full">
                          <BadgeCheck className="h-4 w-4 text-emerald-600" />
                          <span className="text-xs font-semibold text-emerald-700">Verified Property</span>
                        </div>
                      )}
                      {isPopular && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-full">
                          <TrendingUp className="h-4 w-4 text-blue-600" />
                          <span className="text-xs font-semibold text-blue-700">Popular</span>
                        </div>
                      )}
                      {isRecentlyBooked && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-50 border border-orange-200 rounded-full">
                          <Clock className="h-4 w-4 text-orange-600" />
                          <span className="text-xs font-semibold text-orange-700">Recently Booked</span>
                        </div>
                      )}
                      {bookingCount > 0 && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-full">
                          <Users className="h-4 w-4 text-gray-600" />
                          <span className="text-xs font-medium text-gray-700">{bookingCount}+ bookings</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-gray-600 text-lg">
                    <MapPin className="h-5 w-5 flex-shrink-0" />
                    <span className="underline hover:text-emerald-600 cursor-pointer">
                      {location.street && `${location.street}${location.apartment ? `, ${location.apartment}` : ''}, `}
                      {location.ward && `${location.ward}, `}
                      {location.district && `${location.district}, `}
                      {location.regionName && location.regionName}
                      {location.city && `, ${location.city}`}
                    </span>
                  </div>
                  {(totalBedrooms || totalBathrooms || maxGuests) && (
                    <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-600">
                      {totalBedrooms && (
                        <div className="flex items-center gap-2">
                          <Bed className="h-4 w-4 text-gray-400" />
                          <span>{totalBedrooms} bedroom{totalBedrooms !== 1 ? 's' : ''}</span>
                        </div>
                      )}
                      {totalBathrooms && (
                        <div className="flex items-center gap-2">
                          <Bath className="h-4 w-4 text-gray-400" />
                          <span>{totalBathrooms} bathroom{totalBathrooms !== 1 ? 's' : ''}</span>
                        </div>
                      )}
                      {maxGuests && (
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span>Up to {maxGuests} guest{maxGuests !== 1 ? 's' : ''}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {property.type && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg">
                      <Building2 className="h-5 w-5 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">{property.type}</span>
                    </div>
                  )}
                  {hotelStar && (
                    <div className="flex items-center gap-1 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                      <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                      <span className="text-sm font-semibold text-amber-700 capitalize">{hotelStar}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Amenities Grid - Booking.com Style with Verified Badges */}
            {amenities.length > 0 && (
              <section className="border-b border-gray-200 pb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">What this place offers</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {amenities.map((amenity, idx) => {
                    const Icon = amenity.icon;
                    return (
                      <div key={`${amenity.key}-${idx}`} className="flex items-center gap-4 p-4 hover:bg-gray-50 rounded-lg transition-colors group">
                        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center relative">
                          <Icon className="h-6 w-6 text-emerald-600" />
                          {property.status === "APPROVED" && (
                            <CheckCircle className="h-4 w-4 text-emerald-500 absolute -top-1 -right-1 bg-white rounded-full" />
                          )}
                        </div>
                        <div className="flex-1 flex items-center justify-between">
                          <span className="text-base font-medium text-gray-900">{amenity.label}</span>
                          {property.status === "APPROVED" && (
                            <span className="text-xs text-emerald-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                              Verified
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Services & Facilities - Comprehensive Display */}
            {(servicesArray.length > 0 || Object.keys(servicesObj).length > 0) && (
              <section className="border-b border-gray-200 pb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Services & Facilities</h2>
                <div className="space-y-6">
                  {/* Parking */}
                  {servicesArray.some((s: string) => s.includes("parking")) && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <Car className="h-5 w-5 text-blue-600" />
                        <span className="font-semibold text-gray-900">Parking</span>
                      </div>
                      <div className="text-sm text-gray-700 ml-8">
                        {servicesArray.find((s: string) => s.includes("parking"))}
                      </div>
                    </div>
                  )}

                  {/* Breakfast */}
                  {(servicesArray.some((s: string) => s.includes("Breakfast")) || servicesObj.breakfastIncluded || servicesObj.breakfastAvailable) && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <Coffee className="h-5 w-5 text-orange-600" />
                        <span className="font-semibold text-gray-900">Breakfast</span>
                      </div>
                      <div className="text-sm text-gray-700 ml-8 space-y-1">
                        {servicesArray.filter((s: string) => s.includes("Breakfast")).map((s: string, i: number) => (
                          <div key={i}>{s}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Restaurant & Bar */}
                  {(servicesArray.some((s: string) => s.includes("Restaurant") || s.includes("Bar")) || servicesObj.restaurant || servicesObj.bar) && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <UtensilsCrossed className="h-5 w-5 text-purple-600" />
                        <span className="font-semibold text-gray-900">Dining & Drinks</span>
                      </div>
                      <div className="text-sm text-gray-700 ml-8 space-y-1">
                        {servicesArray.filter((s: string) => s.includes("Restaurant") || s.includes("Bar")).map((s: string, i: number) => (
                          <div key={i}>{s}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Wellness */}
                  {(servicesArray.some((s: string) => s.includes("Pool") || s.includes("Sauna")) || servicesObj.pool || servicesObj.sauna) && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <Waves className="h-5 w-5 text-cyan-600" />
                        <span className="font-semibold text-gray-900">Wellness & Leisure</span>
                      </div>
                      <div className="text-sm text-gray-700 ml-8 space-y-1">
                        {servicesArray.filter((s: string) => s.includes("Pool") || s.includes("Sauna")).map((s: string, i: number) => (
                          <div key={i}>{s}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Housekeeping */}
                  {(servicesArray.some((s: string) => s.includes("Laundry") || s.includes("Room service")) || servicesObj.laundry || servicesObj.roomService) && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <WashingMachine className="h-5 w-5 text-indigo-600" />
                        <span className="font-semibold text-gray-900">Housekeeping</span>
                      </div>
                      <div className="text-sm text-gray-700 ml-8 space-y-1">
                        {servicesArray.filter((s: string) => s.includes("Laundry") || s.includes("Room service")).map((s: string, i: number) => (
                          <div key={i}>{s}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Safety */}
                  {(servicesArray.some((s: string) => s.includes("security") || s.includes("First aid") || s.includes("Fire")) || servicesObj.security24 || servicesObj.firstAid || servicesObj.fireExtinguisher) && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <Shield className="h-5 w-5 text-red-600" />
                        <span className="font-semibold text-gray-900">Safety & Security</span>
                      </div>
                      <div className="text-sm text-gray-700 ml-8 space-y-1">
                        {servicesArray.filter((s: string) => s.includes("security") || s.includes("First aid") || s.includes("Fire")).map((s: string, i: number) => (
                          <div key={i}>{s}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Shopping */}
                  {(servicesArray.some((s: string) => s.includes("shop") || s.includes("mall")) || servicesObj.onSiteShop || servicesObj.nearbyMall) && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <ShoppingBag className="h-5 w-5 text-pink-600" />
                        <span className="font-semibold text-gray-900">Shopping</span>
                      </div>
                      <div className="text-sm text-gray-700 ml-8 space-y-1">
                        {servicesArray.filter((s: string) => s.includes("shop") || s.includes("mall")).map((s: string, i: number) => (
                          <div key={i}>{s}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Events */}
                  {(servicesArray.some((s: string) => s.includes("Social") || s.includes("Sports")) || servicesObj.socialHall || servicesObj.sportsGames) && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <PartyPopper className="h-5 w-5 text-yellow-600" />
                        <span className="font-semibold text-gray-900">Events & Recreation</span>
                      </div>
                      <div className="text-sm text-gray-700 ml-8 space-y-1">
                        {servicesArray.filter((s: string) => s.includes("Social") || s.includes("Sports")).map((s: string, i: number) => (
                          <div key={i}>{s}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Fitness */}
                  {(servicesArray.some((s: string) => s.includes("Gym")) || servicesObj.gym) && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <Dumbbell className="h-5 w-5 text-green-600" />
                        <span className="font-semibold text-gray-900">Fitness</span>
                      </div>
                      <div className="text-sm text-gray-700 ml-8">
                        {servicesArray.find((s: string) => s.includes("Gym")) || "Gym / Fitness Center"}
                      </div>
                    </div>
                  )}

                  {/* Hospital Distance */}
                  {servicesArray.find((s: string) => s.includes("Hospital distance")) && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <Building2 className="h-5 w-5 text-blue-600" />
                        <span className="font-semibold text-gray-900">Medical Facilities</span>
                      </div>
                      <div className="text-sm text-gray-700 ml-8">
                        {servicesArray.find((s: string) => s.includes("Hospital distance"))}
                      </div>
                    </div>
                  )}

                  {/* Petrol Station */}
                  {servicesArray.find((s: string) => s.includes("petrol station")) && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <Fuel className="h-5 w-5 text-orange-600" />
                        <span className="font-semibold text-gray-900">Petrol Station</span>
                      </div>
                      <div className="text-sm text-gray-700 ml-8">
                        {servicesArray.find((s: string) => s.includes("petrol station"))}
                      </div>
                    </div>
                  )}

                  {/* Bus Station */}
                  {servicesArray.find((s: string) => s.includes("bus station")) && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <Bus className="h-5 w-5 text-blue-600" />
                        <span className="font-semibold text-gray-900">Bus Station</span>
                      </div>
                      <div className="text-sm text-gray-700 ml-8">
                        {servicesArray.find((s: string) => s.includes("bus station"))}
                      </div>
                    </div>
                  )}

                  {/* Nearby Facilities */}
                  {nearbyFacilities.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-4">
                        <MapPin className="h-5 w-5 text-pink-600" />
                        <span className="font-semibold text-gray-900">Nearby Facilities</span>
                      </div>
                      <div className="space-y-3 ml-8">
                        {nearbyFacilities.map((facility: any, idx: number) => (
                          <div key={idx} className="bg-white rounded-lg p-3 border border-gray-200">
                            <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
                              {facility.name && (
                                <div className="flex-shrink-0">
                                  <span className="text-base font-semibold text-gray-800">{facility.name}</span>
                                </div>
                              )}
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600">
                                {facility.type && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-medium">
                                    {facility.type}
                                  </span>
                                )}
                                {facility.ownership && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-medium">
                                    {facility.ownership}
                                  </span>
                                )}
                                {typeof facility.distanceKm === 'number' && (
                                  <span className="inline-flex items-center gap-1 text-gray-600">
                                    <MapPin className="h-3.5 w-3.5 text-pink-600" />
                                    <span className="font-medium">{facility.distanceKm} km</span>
                                  </span>
                                )}
                                {facility.url && (
                                  <a href={facility.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-emerald-600 hover:underline">
                                    <LinkIcon className="h-3.5 w-3.5" />
                                    <span className="text-xs font-medium">Link</span>
                                  </a>
                                )}
                              </div>
                            </div>
                            {Array.isArray(facility.reachableBy) && facility.reachableBy.length > 0 && (
                              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                                <span className="text-sm text-gray-600 font-medium">Reachable by:</span>
                                {facility.reachableBy.map((mode: string, mIdx: number) => (
                                  <span key={mIdx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-sm font-medium">
                                    {mode}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Rooms Section - Booking.com Style with Full Details */}
            {rooms.length > 0 && (
              <section className="border-b border-gray-200 pb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Rooms & Pricing</h2>
                <div className="space-y-6">
                  {rooms.map((room: any, idx: number) => (
                    <div key={idx} className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gray-900 mb-3">
                            {room.roomType || `Room Type ${idx + 1}`}
                          </h3>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                            <div className="flex items-center gap-2">
                              <Bed className="h-5 w-5 text-gray-400" />
                              <span className="font-medium">{room.roomsCount || 1} room{room.roomsCount !== 1 ? 's' : ''}</span>
                            </div>
                            {room.beds && (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500">Beds:</span>
                                <span className="font-medium">
                                  {room.beds.king > 0 && `${room.beds.king} king `}
                                  {room.beds.queen > 0 && `${room.beds.queen} queen `}
                                  {room.beds.full > 0 && `${room.beds.full} full `}
                                  {room.beds.twin > 0 && `${room.beds.twin} twin `}
                                </span>
                              </div>
                            )}
                            {room.bathPrivate !== undefined && (
                              <div className="flex items-center gap-2">
                                <Bath className="h-5 w-5 text-gray-400" />
                                <span className="font-medium">{room.bathPrivate === "yes" || room.bathPrivate === true ? "Private" : "Shared"} bathroom</span>
                              </div>
                            )}
                            {room.smoking !== undefined && (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500">Smoking:</span>
                                <span className="font-medium">{room.smoking === "yes" ? "Allowed" : "Not allowed"}</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Room Description */}
                          {room.roomDescription && (
                            <p className="text-sm text-gray-700 mb-3 leading-relaxed">{room.roomDescription}</p>
                          )}

                          {/* Bathroom Items */}
                          {room.bathItems && Array.isArray(room.bathItems) && room.bathItems.length > 0 && (
                            <div className="mb-3">
                              <div className="text-xs font-semibold text-gray-700 mb-2">Bathroom Items:</div>
                              <div className="flex flex-wrap gap-2">
                                {room.bathItems.map((item: string, itemIdx: number) => (
                                  <span key={itemIdx} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium">
                                    {item}
                                  </span>
                                ))}
                              </div>
                              {room.towelColor && (
                                <div className="mt-2 text-xs text-gray-600">
                                  <span className="font-medium">Towel color:</span> {room.towelColor}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Other Amenities */}
                          {room.otherAmenities && Array.isArray(room.otherAmenities) && room.otherAmenities.length > 0 && (
                            <div className="mb-3">
                              <div className="text-xs font-semibold text-gray-700 mb-2">Room Amenities:</div>
                              <div className="flex flex-wrap gap-2">
                                {room.otherAmenities.map((amenity: string, amenityIdx: number) => (
                                  <span key={amenityIdx} className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md text-xs font-medium">
                                    {amenity}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        {room.pricePerNight && (
                          <div className="text-right">
                            <div className="text-3xl font-bold text-emerald-600 mb-1">
                              {new Intl.NumberFormat(undefined, {
                                style: "currency",
                                currency: property.currency || "TZS",
                              }).format(room.pricePerNight)}
                            </div>
                            <div className="text-sm text-gray-500 font-medium">per night</div>
                          </div>
                        )}
                      </div>
                      {room.roomImages && room.roomImages.length > 0 && (
                        <div className="grid grid-cols-3 gap-3 mt-6">
                          {room.roomImages.slice(0, 3).map((img: string, imgIdx: number) => (
                            <div key={imgIdx} className="relative h-32 rounded-lg overflow-hidden">
                              <Image
                                src={img}
                                alt={`${room.roomType} image ${imgIdx + 1}`}
                                fill
                                className="object-cover hover:scale-105 transition-transform duration-300 cursor-pointer"
                                onClick={() => {
                                  setSelectedImageIndex(0);
                                  setShowLightbox(true);
                                }}
                              />
                            </div>
                          ))}
                          {room.roomImages.length > 3 && (
                            <button
                              onClick={() => {
                                setSelectedImageIndex(0);
                                setShowLightbox(true);
                              }}
                              className="relative h-32 rounded-lg overflow-hidden border-2 border-gray-300 bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all"
                            >
                              <div className="text-center">
                                <span className="text-gray-700 font-bold text-lg block">+{room.roomImages.length - 3}</span>
                                <span className="text-gray-600 text-xs">more</span>
                              </div>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Description - Booking.com Style */}
            {property.description && (
              <section className="border-b border-gray-200 pb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">About this place</h2>
                {isEditing ? (
                  <textarea
                    value={editData?.description || ""}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg min-h-[200px] text-gray-700 leading-relaxed"
                    rows={8}
                  />
                ) : (
                  <div className="text-gray-700 leading-relaxed whitespace-pre-wrap text-base">
                    {property.description}
                  </div>
                )}
              </section>
            )}

            {/* House Rules Section */}
            {mode === "public" && (
              <section className="border-b border-gray-200 pb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">House Rules</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-gray-900 mb-1">Check-in</div>
                      <div className="text-sm text-gray-600">3:00 PM - 11:00 PM</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-gray-900 mb-1">Check-out</div>
                      <div className="text-sm text-gray-600">Before 11:00 AM</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                    <XCircleIcon className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-gray-900 mb-1">No smoking</div>
                      <div className="text-sm text-gray-600">Smoking is not allowed</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                    <Users className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-gray-900 mb-1">Max guests</div>
                      <div className="text-sm text-gray-600">{maxGuests || "As specified"} guests maximum</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                    <Ban className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-gray-900 mb-1">No parties or events</div>
                      <div className="text-sm text-gray-600">Quiet hours after 10 PM</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                    <Shield className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-gray-900 mb-1">Security deposit</div>
                      <div className="text-sm text-gray-600">May be required</div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Reviews Section */}
            {mode === "public" && reviews && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="border-b border-gray-200 pb-10"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Guest Reviews</h2>
                  {reviews.stats && (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                        <span className="text-xl font-bold text-gray-900">
                          {reviews.stats.averageRating.toFixed(1)}
                        </span>
                      </div>
                      <span className="text-gray-600">
                        ({reviews.stats.totalReviews} {reviews.stats.totalReviews === 1 ? "review" : "reviews"})
                      </span>
                    </div>
                  )}
                </div>

                {reviews.stats && (
                  <div className="mb-6 grid grid-cols-2 md:grid-cols-5 gap-4">
                    {[5, 4, 3, 2, 1].map((rating) => (
                      <div key={rating} className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">{rating}</span>
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(reviews.stats.ratingDistribution[rating] / reviews.stats.totalReviews) * 100}%` }}
                            transition={{ duration: 0.5, delay: rating * 0.1 }}
                            className="h-full bg-amber-400"
                          />
                        </div>
                        <span className="text-xs text-gray-600 w-8 text-right">
                          {reviews.stats.ratingDistribution[rating]}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-6">
                  {reviews.reviews.slice(0, 5).map((review: any, idx: number) => (
                    <motion.div
                      key={review.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: idx * 0.1 }}
                      className="border-b border-gray-100 pb-6 last:border-0"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                            <span className="text-emerald-600 font-semibold">
                              {review.user?.name?.charAt(0) || "G"}
                            </span>
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">
                              {review.user?.name || "Anonymous Guest"}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <div className="flex items-center">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-4 w-4 ${
                                      i < review.rating
                                        ? "fill-amber-400 text-amber-400"
                                        : "text-gray-300"
                                    }`}
                                  />
                                ))}
                              </div>
                              {review.isVerified && (
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-xs font-medium">
                                  Verified Stay
                                </span>
                              )}
                              <span className="text-gray-500">
                                {new Date(review.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      {review.title && (
                        <h4 className="font-semibold text-gray-900 mb-2">{review.title}</h4>
                      )}
                      {review.comment && (
                        <p className="text-gray-700 leading-relaxed mb-3">{review.comment}</p>
                      )}
                      {review.ownerResponse && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg border-l-4 border-emerald-500">
                          <div className="font-semibold text-gray-900 mb-1">Owner Response</div>
                          <p className="text-gray-700 text-sm">{review.ownerResponse}</p>
                          {review.ownerResponseAt && (
                            <div className="text-xs text-gray-500 mt-2">
                              {new Date(review.ownerResponseAt).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </motion.section>
            )}

            {/* Neighborhood Guide */}
            {mode === "public" && location.regionName && (
              <NeighborhoodGuide location={location} />
            )}

            {/* Location Details - Booking.com Style */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Where you'll be</h2>
              <div className="space-y-3 text-base">
                {location.street && (
                  <div>
                    <span className="font-semibold text-gray-900">Street Address: </span>
                    <span className="text-gray-700">{location.street}</span>
                  </div>
                )}
                {location.apartment && (
                  <div>
                    <span className="font-semibold text-gray-900">Apartment/Building: </span>
                    <span className="text-gray-700">{location.apartment}</span>
                  </div>
                )}
                {location.ward && (
                  <div>
                    <span className="font-semibold text-gray-900">Ward: </span>
                    <span className="text-gray-700">{location.ward}</span>
                  </div>
                )}
                {location.district && (
                  <div>
                    <span className="font-semibold text-gray-900">District: </span>
                    <span className="text-gray-700">{location.district}</span>
                  </div>
                )}
                {location.regionName && (
                  <div>
                    <span className="font-semibold text-gray-900">Region: </span>
                    <span className="text-gray-700">{location.regionName}</span>
                  </div>
                )}
                {location.city && (
                  <div>
                    <span className="font-semibold text-gray-900">City: </span>
                    <span className="text-gray-700">{location.city}</span>
                  </div>
                )}
                {location.zip && (
                  <div>
                    <span className="font-semibold text-gray-900">Zip Code: </span>
                    <span className="text-gray-700">{location.zip}</span>
                  </div>
                )}
                {location.country && (
                  <div>
                    <span className="font-semibold text-gray-900">Country: </span>
                    <span className="text-gray-700">{location.country}</span>
                  </div>
                )}
                {location.lat && location.lng && (
                  <div className="mt-6">
                    <div className="w-full h-80 bg-gray-200 rounded-xl overflow-hidden border border-gray-300 relative">
                      {/* Interactive Map Placeholder - Ready for Google Maps Integration */}
                      <iframe
                        src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY'}&q=${location.lat},${location.lng}&zoom=15`}
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        className="absolute inset-0"
                      />
                      {/* Fallback if no API key */}
                      {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                          <div className="text-center">
                            <Map className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                            <p className="text-gray-600 font-medium">Map view</p>
                            <p className="text-sm text-gray-500 mt-1">
                              {location.lat}, {location.lng}
                            </p>
                            <p className="text-xs text-gray-400 mt-2">Add Google Maps API key for interactive map</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="mt-2 text-sm text-gray-600">
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-600 hover:underline flex items-center gap-1"
                      >
                        <MapPin className="h-4 w-4" />
                        View on Google Maps
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </motion.section>
          </div>

          {/* Right Column - Booking Card / Info */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              {/* Booking Card for Public */}
              {mode === "public" && property.basePrice && (
                <div className="border border-gray-200 rounded-xl p-6 shadow-lg bg-white">
                  {/* Price Breakdown */}
                  <div className="mb-4 space-y-2">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <div className="text-3xl font-bold text-gray-900 mb-1">
                          {new Intl.NumberFormat(undefined, {
                            style: "currency",
                            currency: property.currency || "TZS",
                          }).format(property.basePrice)}
                        </div>
                        <div className="text-sm text-gray-500">per night</div>
                      </div>
                    </div>
                    
                    {/* Price Details */}
                    <div className="pt-3 border-t border-gray-200 space-y-2 text-sm">
                      <div className="flex justify-between text-gray-600">
                        <span>Base price</span>
                        <span>
                          {new Intl.NumberFormat(undefined, {
                            style: "currency",
                            currency: property.currency || "TZS",
                          }).format(property.basePrice)}
                        </span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Service fee</span>
                        <span>
                          {new Intl.NumberFormat(undefined, {
                            style: "currency",
                            currency: property.currency || "TZS",
                          }).format(property.basePrice * 0.1)}
                        </span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Taxes</span>
                        <span>
                          {new Intl.NumberFormat(undefined, {
                            style: "currency",
                            currency: property.currency || "TZS",
                          }).format(property.basePrice * 0.05)}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-gray-200 flex justify-between font-bold text-gray-900">
                        <span>Total</span>
                        <span>
                          {new Intl.NumberFormat(undefined, {
                            style: "currency",
                            currency: property.currency || "TZS",
                          }).format(property.basePrice * 1.15)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Check-in/Check-out Times */}
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-700">
                      <Clock className="h-4 w-4 text-emerald-600" />
                      <span className="font-medium">Check-in:</span>
                      <span>3:00 PM - 11:00 PM</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <Clock className="h-4 w-4 text-emerald-600" />
                      <span className="font-medium">Check-out:</span>
                      <span>Before 11:00 AM</span>
                    </div>
                  </div>

                  {/* Cancellation Policy */}
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <FileText className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <div className="font-semibold text-blue-900 mb-1">Free cancellation</div>
                        <div className="text-blue-700">Cancel before check-in for a full refund</div>
                      </div>
                    </div>
                  </div>

                  <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors">
                    Reserve
                  </button>
                </div>
              )}

              {/* Admin/Owner Info Card */}
              {(mode === "admin" || mode === "owner") && (
                <div className="border border-gray-200 rounded-xl p-6 shadow-lg bg-white space-y-4">
                  {property.basePrice && (
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Base Price</div>
                      <div className="text-2xl font-bold text-gray-900">
                        {new Intl.NumberFormat(undefined, {
                          style: "currency",
                          currency: property.currency || "TZS",
                        }).format(property.basePrice)}
                      </div>
                    </div>
                  )}
                  
                  {property.owner && (
                    <div className="pt-4 border-t border-gray-200">
                      <div className="text-sm font-medium text-gray-900 mb-3">Owner Information</div>
                      
                      {/* Owner Profile Card */}
                      <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                            <Users className="h-6 w-6 text-emerald-600" />
                          </div>
                          <div className="flex-1">
                            {property.owner.name && (
                              <div className="font-semibold text-gray-900">{property.owner.name}</div>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" />
                              <span className="text-xs text-emerald-700 font-medium">Verified Host</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600 mt-2">
                          <Clock className="h-3.5 w-3.5" />
                          <span>Response time: Usually within 2 hours</span>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm">
                        {property.owner.email && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Mail className="h-4 w-4" />
                            <a href={`mailto:${property.owner.email}`} className="text-emerald-600 hover:underline">
                              {property.owner.email}
                            </a>
                          </div>
                        )}
                        {property.owner.phone && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Phone className="h-4 w-4" />
                            <a href={`tel:${property.owner.phone}`} className="text-emerald-600 hover:underline">
                              {property.owner.phone}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {property.lastSubmittedAt && (
                    <div className="pt-4 border-t border-gray-200">
                      <div className="text-sm text-gray-500 mb-1">Last Submitted</div>
                      <div className="text-sm font-medium text-gray-900">
                        {new Date(property.lastSubmittedAt).toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      {showLightbox && photos.length > 0 && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4"
          onClick={() => setShowLightbox(false)}
        >
          <div className="relative max-w-7xl w-full h-full flex items-center justify-center">
            <button
              onClick={() => setShowLightbox(false)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
              aria-label="Close"
            >
              <X className="h-8 w-8" />
            </button>
            <div className="relative w-full h-full max-h-[90vh]">
              <Image
                src={photos[selectedImageIndex]}
                alt={`Property image ${selectedImageIndex + 1}`}
                fill
                className="object-contain"
              />
            </div>
            {photos.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImageIndex((i) => (i - 1 + photos.length) % photos.length);
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white rounded-full p-3 transition-all"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImageIndex((i) => (i + 1) % photos.length);
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white rounded-full p-3 transition-all"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-full text-sm">
              {selectedImageIndex + 1} / {photos.length}
            </div>
          </div>
        </div>
      )}

      {/* Reject Dialog */}
      {showRejectDialog && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Reject Property</h3>
            <p className="text-sm text-gray-600 mb-4">Please provide reasons for rejection (comma-separated):</p>
            <textarea
              value={rejectReasons}
              onChange={(e) => setRejectReasons(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4 min-h-[100px]"
              placeholder="e.g., Insufficient photos, Missing location details, Quality issues"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowRejectDialog(false);
                  setRejectReasons("");
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={saving || !rejectReasons.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {saving ? "Rejecting..." : "Reject Property"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
