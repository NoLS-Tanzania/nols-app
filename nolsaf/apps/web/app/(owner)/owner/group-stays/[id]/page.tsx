"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { ArrowLeft, CheckCircle, Calendar, User, Phone, Mail, Building2, MapPin, Users, X, Search, MessageSquare, Send, CheckCircle2, Info, Sparkles, Car, UtensilsCrossed, UserCheck, Wrench, FileText } from "lucide-react";

const api = axios.create({ baseURL: "", withCredentials: true });

type Passenger = {
  id: number;
  firstName: string;
  lastName: string;
  phone?: string | null;
  age?: number | null;
  gender?: string | null;
  nationality?: string | null;
  sequenceNumber?: number | null;
};

type Message = {
  id: number;
  senderRole: string;
  senderName: string | null;
  messageType: string | null;
  body: string;
  createdAt: string;
};

type GroupStayDetail = {
  id: number;
  groupType: string;
  accommodationType: string;
  headcount: number;
  roomsNeeded: number;
  toRegion: string;
  toDistrict?: string | null;
  toWard?: string | null;
  toLocation?: string | null;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  user: { id: number; name: string; email: string; phone: string | null } | null;
  confirmedProperty: { id: number; title: string; type: string; status: string } | null;
  passengers?: Passenger[];
  messages?: Message[];
  createdAt: string;
  // Arrangement fields
  arrPickup?: boolean;
  arrTransport?: boolean;
  arrMeals?: boolean;
  arrGuide?: boolean;
  arrEquipment?: boolean;
  pickupLocation?: string | null;
  pickupTime?: string | null;
  arrangementNotes?: string | null;
};

export default function GroupStayDetail({ params }: { params: { id: string } }) {
  const [groupStay, setGroupStay] = useState<GroupStayDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPassengersModal, setShowPassengersModal] = useState(false);
  const [passengerSearch, setPassengerSearch] = useState("");
  const [modalRef, setModalRef] = useState<HTMLDivElement | null>(null);
  const [messageText, setMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageType, setMessageType] = useState("General");
  const [showCommunication, setShowCommunication] = useState(true);
  const MAX_MESSAGE_LENGTH = 5000;

  useEffect(() => {
    let mounted = true;
    api.get(`/api/owner/group-stays/${params.id}`)
      .then((response) => {
        if (!mounted) return;
        setGroupStay(response.data);
        setLoading(false);
      })
      .catch((err: any) => {
        if (!mounted) return;
        console.error("Failed to load group stay:", err);
        setError(err.response?.data?.error || "Failed to load group stay");
        setLoading(false);
      });

    return () => { mounted = false; };
  }, [params.id]);

  // Handle keyboard navigation for modal
  useEffect(() => {
    if (showPassengersModal) {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setShowPassengersModal(false);
          setPassengerSearch("");
        }
      };
      document.addEventListener("keydown", handleEscape);
      // Focus modal when it opens
      if (modalRef) {
        modalRef.focus();
      }
      return () => {
        document.removeEventListener("keydown", handleEscape);
      };
    }
  }, [showPassengersModal, modalRef]);

  // Filter passengers based on search
  const filteredPassengers = groupStay?.passengers
    ? groupStay.passengers.filter((passenger) => {
        if (!passengerSearch.trim()) return true;
        const searchLower = passengerSearch.toLowerCase();
        const fullName = `${passenger.firstName} ${passenger.lastName}`.toLowerCase();
        const phone = passenger.phone?.toLowerCase() || "";
        const nationality = passenger.nationality?.toLowerCase() || "";
        return (
          fullName.includes(searchLower) ||
          phone.includes(searchLower) ||
          nationality.includes(searchLower)
        );
      })
    : [];

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  // Message templates for automation
  const getMessageTemplate = (type: string): string => {
    const customerName = groupStay?.user?.name || "valued customer";
    const groupType = groupStay?.groupType ? groupStay.groupType.charAt(0).toUpperCase() + groupStay.groupType.slice(1) : "group";
    const headcountNum = groupStay?.headcount || 0;
    const headcount = String(headcountNum);
    const headcountText = headcountNum === 1 ? 'person' : 'people';
    const guestText = headcountNum === 1 ? 'guest' : 'guests';
    const checkIn = groupStay?.checkIn ? formatDate(groupStay.checkIn) : "your check-in date";
    const checkOut = groupStay?.checkOut ? formatDate(groupStay.checkOut) : "your check-out date";

    switch (type) {
      case "Provide Details":
        return `Dear ${customerName},\n\nWe're excited about hosting your group! Here are some details about what your group will enjoy during your stay:\n\n✨ **Amenities & Services:**\n• Complimentary WiFi throughout the property\n• Daily housekeeping service\n• 24/7 security and support\n• Flexible check-in/check-out times\n• Group dining arrangements available\n• Transportation assistance can be arranged\n\n📅 **Your Stay:**\n• Check-in: ${checkIn}\n• Check-out: ${checkOut}\n• Guests: ${headcount} ${headcountText}\n\nPlease let us know if you have any specific requirements or questions. We're here to make your stay memorable!\n\nWarm regards,\nProperty Owner`;

      case "Special Offers":
        return `Dear ${customerName},\n\nWe have some special offers and amenities available for your ${groupType} stay with ${headcount} ${guestText}:\n\n🎉 **Special Offers:**\n• Group discount: 15% off for bookings of 10+ people\n• Complimentary breakfast for all guests\n• Free airport/station pickup service\n• Early check-in and late check-out options\n• Special group activities and tours available\n\n📅 **Your Stay Dates:**\n• Check-in: ${checkIn}\n• Check-out: ${checkOut}\n\nLet us know if you'd like to take advantage of any of these offers! We're committed to making your group stay both comfortable and memorable.\n\nBest regards,\nProperty Owner`;

      case "Check-in Instructions":
        return `Dear ${customerName},\n\nWe're looking forward to welcoming you and your group soon! Here are the check-in instructions for your stay:\n\n📍 **Check-in Information:**\n• Check-in Date: ${checkIn}\n• Check-in Time: Flexible (please inform us of your expected arrival time)\n• Location: Our property address will be sent separately\n\n✅ **What to Bring:**\n• Valid identification for all guests\n• Booking confirmation details\n• Any special requirements or dietary needs\n\n🚗 **Getting Here:**\nIf you need assistance with transportation from the airport or station, please let us know in advance, and we'll be happy to arrange pickup service.\n\nIf you have any questions or need assistance, feel free to contact us anytime.\n\nSee you soon!\n\nWarm regards,\nProperty Owner`;

      case "Welcome Message":
        return `Dear ${customerName},\n\nWe're thrilled to welcome you and your ${headcount} ${guestText} to our property! We're committed to providing you with an exceptional ${groupType} stay experience.\n\n📋 **Your Stay Details:**\n• Group Type: ${groupType}\n• Number of Guests: ${headcount} ${headcountText}\n• Check-in: ${checkIn}\n• Check-out: ${checkOut}\n• Accommodation Type: ${groupStay?.accommodationType ? groupStay.accommodationType.charAt(0).toUpperCase() + groupStay.accommodationType.slice(1) : 'Standard'}\n\nOur team is preparing everything for your arrival and will ensure all your needs are met. We're here to make your stay comfortable, enjoyable, and memorable.\n\nIf you have any questions or special requirements, please don't hesitate to reach out. We look forward to hosting you!\n\nWarm regards,\nProperty Owner`;

      case "Amenities Information":
        return `Dear ${customerName},\n\nHere's detailed information about the amenities and services available at our property for your ${groupType} stay:\n\n🏨 **Property Amenities:**\n• Fully equipped rooms for your group\n• Complimentary WiFi throughout the property\n• Daily housekeeping and maintenance service\n• 24/7 security and on-site support staff\n• Common areas and lounges for group activities\n• Parking facilities\n\n🍽️ **Dining & Services:**\n• Group dining arrangements available\n• Catering options for special occasions\n• Room service (where applicable)\n\n🚗 **Additional Services:**\n• Airport/station pickup and drop-off (can be arranged)\n• Local transportation assistance\n• Tour and activity recommendations\n• Flexible check-in/check-out times\n\nPlease let us know if you need any specific amenities or services, and we'll do our best to accommodate your group's needs.\n\nBest regards,\nProperty Owner`;

      case "Other":
        return `Dear ${customerName},\n\nThank you for choosing our property for your ${groupType} stay.\n\n[Your message here]\n\nBest regards,\nProperty Owner`;

      default:
        return "";
    }
  };

  // Auto-update message when type changes - always replaces message with new template
  const handleMessageTypeChange = (newType: string) => {
    setMessageType(newType);
    // Always update message when type changes (except for "General" which has no template)
    if (newType !== "General") {
      const template = getMessageTemplate(newType);
      if (template) {
        // Ensure template doesn't exceed max length
        const truncatedTemplate = template.length > MAX_MESSAGE_LENGTH 
          ? template.substring(0, MAX_MESSAGE_LENGTH) 
          : template;
        setMessageText(truncatedTemplate);
      }
    } else {
      // Clear message when "General" is selected
      setMessageText("");
    }
  };

  // Auto-fill message when textarea is focused (if type is selected but message is empty)
  const handleTextareaFocus = () => {
    if (!messageText.trim() && messageType !== "General") {
      const template = getMessageTemplate(messageType);
      if (template) {
        // Ensure template doesn't exceed max length
        const truncatedTemplate = template.length > MAX_MESSAGE_LENGTH 
          ? template.substring(0, MAX_MESSAGE_LENGTH) 
          : template;
        setMessageText(truncatedTemplate);
      }
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, { bg: string; text: string; border: string }> = {
      "PENDING": { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
      "PROCESSING": { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
      "CONFIRMED": { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
      "COMPLETED": { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
      "CANCELED": { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
      "CANCELLED": { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
    };
    return statusColors[status.toUpperCase()] || { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" };
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] px-4 py-6 max-w-4xl mx-auto">
        {/* Header Skeleton */}
        <div className="mb-6">
          <div className="h-10 w-10 rounded-lg bg-slate-200 mb-4 animate-pulse" />
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-xl bg-slate-200 animate-pulse" />
            <div className="space-y-2">
              <div className="h-7 w-48 bg-slate-200 rounded animate-pulse" />
              <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
            </div>
          </div>
        </div>

        {/* Cards Skeleton */}
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="h-14 bg-slate-200 animate-pulse" />
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <div className="h-3 w-20 bg-slate-200 rounded animate-pulse" />
                  <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-16 bg-slate-200 rounded animate-pulse" />
                  <div className="h-4 w-28 bg-slate-200 rounded animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !groupStay) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Group Stay Not Found</h2>
          <p className="text-sm text-slate-600 mb-6">
            {error || "The group stay you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it."}
          </p>
          <Link 
            href="/owner/group-stays" 
            className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-brand text-white hover:bg-brand-700 transition-all duration-300 hover:scale-110"
            title="Back to Group Stays"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </div>
      </div>
    );
  }

  const statusBadge = getStatusBadge(groupStay.status);

  return (
    <div className="min-h-[60vh] px-4 py-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link 
          href="/owner/group-stays" 
          className="inline-flex items-center justify-center h-10 w-10 rounded-lg text-slate-600 hover:text-brand hover:bg-slate-100 mb-4 transition-all duration-300 hover:scale-110"
          title="Back to Group Stays"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-brand/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-brand" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Group Stay #{groupStay.id}</h1>
              <p className="text-sm text-slate-600 mt-1">Created {formatDateTime(groupStay.createdAt)}</p>
            </div>
          </div>
          <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}>
            {groupStay.status}
          </span>
        </div>
      </div>

      {/* Main Content Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Customer Information Card */}
        {groupStay.user && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md">
            <div className="bg-gradient-to-r from-brand-600 to-brand-700 px-6 py-4">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-white" />
                <h2 className="text-lg font-semibold text-white">Customer Information</h2>
              </div>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <DetailRow 
                icon={<User className="h-4 w-4 text-slate-400" />} 
                label="Name" 
                value={groupStay.user.name || "-"} 
              />
              {groupStay.user.email && (
                <DetailRow 
                  icon={<Mail className="h-4 w-4 text-slate-400" />} 
                  label="Email" 
                  value={groupStay.user.email} 
                />
              )}
              {groupStay.user.phone && (
                <DetailRow 
                  icon={<Phone className="h-4 w-4 text-slate-400" />} 
                  label="Phone" 
                  value={groupStay.user.phone} 
                />
              )}
            </div>
          </div>
        )}

        {/* Group Details Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md">
          <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-6 py-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-white" />
              <h2 className="text-lg font-semibold text-white">Group Details</h2>
            </div>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <DetailRow label="Group Type" value={groupStay.groupType ? groupStay.groupType.charAt(0).toUpperCase() + groupStay.groupType.slice(1) : "-"} />
            <DetailRow label="Accommodation Type" value={groupStay.accommodationType ? groupStay.accommodationType.charAt(0).toUpperCase() + groupStay.accommodationType.slice(1) : "-"} />
            {groupStay.passengers && groupStay.passengers.length > 0 ? (
              <button
                onClick={() => setShowPassengersModal(true)}
                className="w-full text-left p-4 rounded-xl border-2 border-brand/30 bg-brand/5 hover:bg-brand/10 hover:border-brand/50 transition-all duration-200 hover:shadow-md group focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
                title="Click to view all group members (Enter to open)"
                aria-label={`View ${groupStay.headcount} group members`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-xs text-slate-500 mb-1.5 font-medium">Headcount</div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-brand group-hover:scale-110 transition-transform" />
                      <span className="text-base font-bold text-brand">{groupStay.headcount} people</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-lg bg-brand/20 group-hover:bg-brand/30 flex items-center justify-center transition-all">
                      <Users className="h-4 w-4 text-brand" />
                    </div>
                  </div>
                </div>
              </button>
            ) : (
              <div className="opacity-60">
                <DetailRow 
                  label="Headcount" 
                  value={
                    <span className="text-slate-600">
                      {groupStay.headcount} people
                      <span className="text-xs text-slate-400 ml-2">(No passenger details available)</span>
                    </span>
                  } 
                />
              </div>
            )}
            <DetailRow label="Rooms Needed" value={`${groupStay.roomsNeeded} rooms`} />
          </div>
        </div>

        {/* Destination Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md">
          <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-white" />
              <h2 className="text-lg font-semibold text-white">Destination</h2>
            </div>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <DetailRow label="Region" value={groupStay.toRegion || "-"} />
            {groupStay.toDistrict && (
              <DetailRow label="District" value={groupStay.toDistrict} />
            )}
            {groupStay.toWard && (
              <DetailRow label="Ward" value={groupStay.toWard} />
            )}
            {groupStay.toLocation && (
              <DetailRow label="Location" value={groupStay.toLocation} />
            )}
          </div>
        </div>

        {/* Dates Card */}
        {(groupStay.checkIn || groupStay.checkOut) && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-white" />
                <h2 className="text-lg font-semibold text-white">Dates</h2>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {groupStay.checkIn && (
                <DetailRow 
                  icon={<Calendar className="h-4 w-4 text-slate-400" />} 
                  label="Check-in" 
                  value={formatDate(groupStay.checkIn)} 
                />
              )}
              {groupStay.checkOut && (
                <DetailRow 
                  icon={<Calendar className="h-4 w-4 text-slate-400" />} 
                  label="Check-out" 
                  value={formatDate(groupStay.checkOut)} 
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Arrangement Requests Card */}
      {(groupStay.arrPickup || groupStay.arrTransport || groupStay.arrMeals || groupStay.arrGuide || groupStay.arrEquipment) && (
        <div className="mt-6 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 group">
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 px-6 py-5 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent group-hover:via-white/15 transition-all duration-1000"></div>
            <div className="relative flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                <Car className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white drop-shadow-sm">Requested Arrangements</h2>
                <p className="text-xs text-blue-100 mt-0.5">For awareness only • Transportation handled by NoLSAF</p>
              </div>
            </div>
          </div>
          
          <div className="p-6 space-y-5">
            {/* Arrangement Cards - Modern Clean Design */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {groupStay.arrPickup && (
                <div className="group/card relative bg-gradient-to-br from-blue-50/50 via-white to-blue-50/30 rounded-lg border border-blue-100/60 p-4 transition-all hover:shadow-md hover:border-blue-200 hover:-translate-y-0.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {/* Left accent bar with gradient */}
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-300 to-blue-400 rounded-l-lg"></div>
                  <div className="flex flex-col items-center gap-2.5 pl-3">
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-300 to-blue-400 flex items-center justify-center transition-transform group-hover/card:scale-110 shadow-sm shadow-blue-200/50">
                      <Car className="h-5 w-5 text-blue-700" />
                    </div>
                    <span className="text-xs font-semibold text-slate-700">Pickup</span>
                  </div>
                </div>
              )}
              {groupStay.arrTransport && (
                <div className="group/card relative bg-gradient-to-br from-green-50/50 via-white to-green-50/30 rounded-lg border border-green-100/60 p-4 transition-all hover:shadow-md hover:border-green-200 hover:-translate-y-0.5 animate-in fade-in slide-in-from-bottom-2 duration-300 delay-75">
                  {/* Left accent bar with gradient */}
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-green-300 to-green-400 rounded-l-lg"></div>
                  <div className="flex flex-col items-center gap-2.5 pl-3">
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-green-300 to-green-400 flex items-center justify-center transition-transform group-hover/card:scale-110 shadow-sm shadow-green-200/50">
                      <Car className="h-5 w-5 text-green-700" />
                    </div>
                    <span className="text-xs font-semibold text-slate-700">Transport</span>
                  </div>
                </div>
              )}
              {groupStay.arrMeals && (
                <div className="group/card relative bg-gradient-to-br from-purple-50/50 via-white to-purple-50/30 rounded-lg border border-purple-100/60 p-4 transition-all hover:shadow-md hover:border-purple-200 hover:-translate-y-0.5 animate-in fade-in slide-in-from-bottom-2 duration-300 delay-150">
                  {/* Left accent bar with gradient */}
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-300 to-purple-400 rounded-l-lg"></div>
                  <div className="flex flex-col items-center gap-2.5 pl-3">
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-300 to-purple-400 flex items-center justify-center transition-transform group-hover/card:scale-110 shadow-sm shadow-purple-200/50">
                      <UtensilsCrossed className="h-5 w-5 text-purple-700" />
                    </div>
                    <span className="text-xs font-semibold text-slate-700">Meals</span>
                  </div>
                </div>
              )}
              {groupStay.arrGuide && (
                <div className="group/card relative bg-gradient-to-br from-amber-50/50 via-white to-amber-50/30 rounded-lg border border-amber-100/60 p-4 transition-all hover:shadow-md hover:border-amber-200 hover:-translate-y-0.5 animate-in fade-in slide-in-from-bottom-2 duration-300 delay-200">
                  {/* Left accent bar with gradient */}
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-300 to-amber-400 rounded-l-lg"></div>
                  <div className="flex flex-col items-center gap-2.5 pl-3">
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-amber-300 to-amber-400 flex items-center justify-center transition-transform group-hover/card:scale-110 shadow-sm shadow-amber-200/50">
                      <UserCheck className="h-5 w-5 text-amber-700" />
                    </div>
                    <span className="text-xs font-semibold text-slate-700">Guide</span>
                  </div>
                </div>
              )}
              {groupStay.arrEquipment && (
                <div className="group/card relative bg-gradient-to-br from-red-50/50 via-white to-red-50/30 rounded-lg border border-red-100/60 p-4 transition-all hover:shadow-md hover:border-red-200 hover:-translate-y-0.5 animate-in fade-in slide-in-from-bottom-2 duration-300 delay-300">
                  {/* Left accent bar with gradient */}
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-red-300 to-red-400 rounded-l-lg"></div>
                  <div className="flex flex-col items-center gap-2.5 pl-3">
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-red-300 to-red-400 flex items-center justify-center transition-transform group-hover/card:scale-110 shadow-sm shadow-red-200/50">
                      <Wrench className="h-5 w-5 text-red-700" />
                    </div>
                    <span className="text-xs font-semibold text-slate-700">Equipment</span>
                  </div>
                </div>
              )}
            </div>
            
            {/* Pickup details if requested */}
            {groupStay.arrPickup && (groupStay.pickupLocation || groupStay.pickupTime) && (
              <div className="relative p-4 bg-gradient-to-br from-blue-50 via-blue-50/80 to-blue-50/60 rounded-xl border-2 border-blue-200/60 shadow-sm transition-all hover:shadow-md hover:border-blue-300 animate-in fade-in slide-in-from-left-4 duration-500 delay-300">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-400 rounded-t-xl"></div>
                <div className="relative">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                      <MapPin className="h-4 w-4 text-blue-600" />
                    </div>
                    <h3 className="text-sm font-bold text-blue-900">Pickup Details</h3>
                  </div>
                  <div className="space-y-2 pl-10">
                    {groupStay.pickupLocation && (
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-semibold text-blue-700 min-w-[60px]">Location:</span>
                        <span className="text-xs text-blue-900 flex-1">{groupStay.pickupLocation}</span>
                      </div>
                    )}
                    {groupStay.pickupTime && (
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-semibold text-blue-700 min-w-[60px]">Time:</span>
                        <span className="text-xs text-blue-900 flex-1">{groupStay.pickupTime}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Arrangement Notes if exists */}
            {groupStay.arrangementNotes && (
              <div className="relative p-4 bg-gradient-to-br from-slate-50 via-slate-50/80 to-slate-50/60 rounded-xl border-2 border-slate-200/60 shadow-sm transition-all hover:shadow-md hover:border-slate-300 animate-in fade-in slide-in-from-right-4 duration-500 delay-500">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-300 via-slate-400 to-slate-300 rounded-t-xl"></div>
                <div className="relative flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 transition-transform duration-300 hover:scale-110">
                    <FileText className="h-5 w-5 text-slate-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 mb-2">Arrangement Notes from Customer</h3>
                    <div className="p-3 bg-white/60 rounded-lg border border-slate-200/60">
                      <p className="text-xs leading-relaxed text-slate-700 whitespace-pre-wrap break-words">{groupStay.arrangementNotes}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmed Property Card */}
      {groupStay.confirmedProperty && (
        <div className="mt-6 bg-white rounded-2xl border border-green-200 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md">
          <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-white" />
              <h2 className="text-lg font-semibold text-white">Confirmed Property</h2>
            </div>
          </div>
          <div className="p-6">
            <DetailRow 
              icon={<Building2 className="h-4 w-4 text-slate-400" />} 
              label="Property" 
              value={`${groupStay.confirmedProperty.title} • ${groupStay.confirmedProperty.type}`} 
            />
          </div>
        </div>
      )}

      {/* Communication & Feedback Section */}
      <div className="mt-6 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-200 w-full max-w-full">
        <div className="px-4 sm:px-6 py-4 border-b border-slate-200">
          <div className="flex items-center justify-between min-w-0 gap-3">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <MessageSquare className="h-5 w-5 text-brand flex-shrink-0" />
              <h2 className="text-base sm:text-lg font-semibold text-slate-900 truncate">Communication & Feedback</h2>
            </div>
            <button
              onClick={() => setShowCommunication(!showCommunication)}
              className="text-slate-600 hover:text-slate-900 transition-colors"
              aria-label={showCommunication ? "Collapse" : "Expand"}
            >
              {showCommunication ? (
                <X className="h-5 w-5" />
              ) : (
                <MessageSquare className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {showCommunication && (
          <div className="p-4 sm:p-6 space-y-6 overflow-x-hidden">
            {/* Quick Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <button
                onClick={() => {
                  const template = getMessageTemplate("Welcome Message");
                  setMessageType("Welcome Message");
                  const truncatedTemplate = template.length > MAX_MESSAGE_LENGTH 
                    ? template.substring(0, MAX_MESSAGE_LENGTH) 
                    : template;
                  setMessageText(truncatedTemplate);
                }}
                className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-green-200 bg-green-50 hover:bg-green-100 hover:border-green-300 transition-all duration-200 text-left group"
              >
                <CheckCircle2 className="h-5 w-5 text-green-600 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-semibold text-green-700">Welcome Message</span>
              </button>

              <button
                onClick={() => {
                  const template = getMessageTemplate("Provide Details");
                  setMessageType("Provide Details");
                  const truncatedTemplate = template.length > MAX_MESSAGE_LENGTH 
                    ? template.substring(0, MAX_MESSAGE_LENGTH) 
                    : template;
                  setMessageText(truncatedTemplate);
                }}
                className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 hover:border-blue-300 transition-all duration-200 text-left group"
              >
                <Info className="h-5 w-5 text-blue-600 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-semibold text-blue-700">Provide Details</span>
              </button>

              <button
                onClick={() => {
                  const template = getMessageTemplate("Special Offers");
                  setMessageType("Special Offers");
                  const truncatedTemplate = template.length > MAX_MESSAGE_LENGTH 
                    ? template.substring(0, MAX_MESSAGE_LENGTH) 
                    : template;
                  setMessageText(truncatedTemplate);
                }}
                className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-purple-200 bg-purple-50 hover:bg-purple-100 hover:border-purple-300 transition-all duration-200 text-left group"
              >
                <Sparkles className="h-5 w-5 text-purple-600 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-semibold text-purple-700">Special Offers</span>
              </button>

              <button
                onClick={() => {
                  const template = getMessageTemplate("Check-in Instructions");
                  setMessageType("Check-in Instructions");
                  const truncatedTemplate = template.length > MAX_MESSAGE_LENGTH 
                    ? template.substring(0, MAX_MESSAGE_LENGTH) 
                    : template;
                  setMessageText(truncatedTemplate);
                }}
                className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-indigo-200 bg-indigo-50 hover:bg-indigo-100 hover:border-indigo-300 transition-all duration-200 text-left group"
              >
                <Calendar className="h-5 w-5 text-indigo-600 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-semibold text-indigo-700">Check-in Instructions</span>
              </button>

              <button
                onClick={() => {
                  const template = getMessageTemplate("Amenities Information");
                  setMessageType("Amenities Information");
                  const truncatedTemplate = template.length > MAX_MESSAGE_LENGTH 
                    ? template.substring(0, MAX_MESSAGE_LENGTH) 
                    : template;
                  setMessageText(truncatedTemplate);
                }}
                className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-teal-200 bg-teal-50 hover:bg-teal-100 hover:border-teal-300 transition-all duration-200 text-left group"
              >
                <Building2 className="h-5 w-5 text-teal-600 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-semibold text-teal-700">Amenities Info</span>
              </button>
            </div>

            {/* Message Thread */}
            {groupStay.messages && groupStay.messages.length > 0 && (
              <div className="border-t border-slate-200 pt-6">
                <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-brand" />
                  Conversation History ({groupStay.messages.length} {groupStay.messages.length === 1 ? 'message' : 'messages'})
                </h3>
                <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                  {groupStay.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-4 rounded-xl ${
                        msg.senderRole === "OWNER"
                          ? "bg-brand/5 border border-brand/20 ml-8"
                          : msg.senderRole === "ADMIN"
                          ? "bg-slate-100 border border-slate-200 mr-8"
                          : "bg-blue-50 border border-blue-200 mr-8"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-700">
                            {msg.senderName || (msg.senderRole === "OWNER" ? "You" : msg.senderRole === "ADMIN" ? "Admin" : "Customer")}
                          </span>
                          {msg.messageType && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                              {msg.messageType}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-500">
                          {formatDateTime(msg.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{msg.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Send Message Form */}
            <div className="border-t border-slate-200 pt-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <Send className="h-4 w-4 text-brand flex-shrink-0" />
                <span className="truncate">Send Message to Customer</span>
              </h3>
              <div className="space-y-4 w-full min-w-0">
                <div className="w-full min-w-0">
                  <label className="block text-xs font-medium text-slate-700 mb-2">
                    Message Type
                  </label>
                  <select
                    value={messageType}
                    onChange={(e) => handleMessageTypeChange(e.target.value)}
                    className="w-full min-w-0 px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand focus:border-brand outline-none transition-all duration-200 text-sm box-border"
                    aria-label="Message Type"
                    title="Select message type - message will automatically update"
                  >
                    <option value="General">General</option>
                    <option value="Provide Details">Provide Details</option>
                    <option value="Special Offers">Special Offers</option>
                    <option value="Check-in Instructions">Check-in Instructions</option>
                    <option value="Welcome Message">Welcome Message</option>
                    <option value="Amenities Information">Amenities Information</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="w-full min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-medium text-slate-700">
                      Message
                    </label>
                    <span className={`text-xs font-medium ${
                      messageText.length > MAX_MESSAGE_LENGTH 
                        ? "text-red-600" 
                        : messageText.length > MAX_MESSAGE_LENGTH * 0.9 
                        ? "text-amber-600" 
                        : "text-slate-500"
                    }`}>
                      {messageText.length.toLocaleString()} / {MAX_MESSAGE_LENGTH.toLocaleString()}
                    </span>
                  </div>
                  <textarea
                    value={messageText}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Enforce max length on frontend
                      if (value.length <= MAX_MESSAGE_LENGTH) {
                        setMessageText(value);
                      }
                    }}
                    onFocus={handleTextareaFocus}
                    placeholder="Select a message type above to auto-fill, or type your message here..."
                    rows={6}
                    maxLength={MAX_MESSAGE_LENGTH}
                    className={`w-full min-w-0 px-4 py-3 border rounded-xl focus:ring-2 focus:ring-brand focus:border-brand outline-none transition-all duration-200 text-sm resize-none box-border ${
                      messageText.length > MAX_MESSAGE_LENGTH 
                        ? "border-red-300 bg-red-50/50" 
                        : messageText.length > MAX_MESSAGE_LENGTH * 0.9 
                        ? "border-amber-300 bg-amber-50/30" 
                        : "border-slate-300"
                    }`}
                  />
                  {messageText.length > MAX_MESSAGE_LENGTH && (
                    <p className="mt-1.5 text-xs text-red-600">
                      Message exceeds maximum length of {MAX_MESSAGE_LENGTH.toLocaleString()} characters.
                    </p>
                  )}
                </div>
                <div className="w-full min-w-0">
                  <button
                    onClick={async () => {
                      const trimmedMessage = messageText.trim();
                      
                      if (!trimmedMessage) {
                        window.dispatchEvent(
                          new CustomEvent("nols:toast", {
                            detail: { type: "error", title: "Error", message: "Please enter a message", duration: 3000 },
                          })
                        );
                        return;
                      }

                      if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
                        window.dispatchEvent(
                          new CustomEvent("nols:toast", {
                            detail: { type: "error", title: "Error", message: `Message cannot exceed ${MAX_MESSAGE_LENGTH.toLocaleString()} characters`, duration: 4000 },
                          })
                        );
                        return;
                      }

                      setSendingMessage(true);
                      let retryCount = 0;
                      const maxRetries = 2;

                      while (retryCount <= maxRetries) {
                        try {
                          const response = await api.post(`/api/owner/group-stays/${params.id}/message`, {
                            message: trimmedMessage,
                            messageType,
                          });

                          if (response.data.success) {
                            setMessageText("");
                            setMessageType("General");
                            window.dispatchEvent(
                              new CustomEvent("nols:toast", {
                                detail: { type: "success", title: "Message Sent", message: "Your message has been sent to the customer.", duration: 3000 },
                              })
                            );
                            // Reload group stay data to get updated messages
                            try {
                              const updatedResponse = await api.get(`/api/owner/group-stays/${params.id}`);
                              if (updatedResponse.data) {
                                setGroupStay(updatedResponse.data);
                              }
                            } catch (refreshErr) {
                              console.error("Failed to refresh group stay data:", refreshErr);
                              // Don't show error for refresh failure
                            }
                            break; // Success, exit retry loop
                          }
                        } catch (err: any) {
                          const status = err?.response?.status;
                          const data = err?.response?.data;
                          
                          // Don't retry on client errors (4xx)
                          if (status >= 400 && status < 500) {
                            let errorMessage = "Failed to send message";
                            
                            if (data?.code === "ACCOUNT_SUSPENDED") {
                              errorMessage = "Your account has been suspended. Please contact support for assistance.";
                            } else if (data?.code === "NO_ACTIVE_PROPERTIES") {
                              errorMessage = "You must have at least one active property to send messages to customers.";
                            } else if (data?.error) {
                              errorMessage = data.error;
                            } else if (data?.details) {
                              errorMessage = data.details;
                            }
                            
                            window.dispatchEvent(
                              new CustomEvent("nols:toast", {
                                detail: { type: "error", title: "Error", message: errorMessage, duration: 5000 },
                              })
                            );
                            break; // Exit retry loop for client errors
                          }
                          
                          // Retry on server errors (5xx) or network errors
                          if (retryCount < maxRetries) {
                            retryCount++;
                            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
                            continue;
                          } else {
                            // Max retries reached
                            window.dispatchEvent(
                              new CustomEvent("nols:toast", {
                                detail: { type: "error", title: "Error", message: "Failed to send message. Please check your connection and try again.", duration: 5000 },
                              })
                            );
                          }
                        }
                      }

                      setSendingMessage(false);
                    }}
                    disabled={sendingMessage || !messageText.trim() || messageText.trim().length > MAX_MESSAGE_LENGTH}
                    className="w-full sm:w-auto px-6 py-3 bg-brand hover:bg-brand-700 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 min-w-0"
                  >
                    {sendingMessage ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin flex-shrink-0" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 flex-shrink-0" />
                        <span>Send Message</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-6">
        <Link
          href="/owner/group-stays"
          className="inline-flex items-center justify-center h-10 w-10 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-brand transition-all duration-300 shadow-sm hover:shadow-md hover:scale-110"
          title="Back to Group Stays"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </div>

      {/* Passengers Modal */}
      {showPassengersModal && groupStay?.passengers && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => {
            setShowPassengersModal(false);
            setPassengerSearch("");
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div 
            ref={setModalRef}
            tabIndex={-1}
            className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300 focus:outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-brand-600 to-brand-700 px-4 sm:px-6 py-4 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h2 id="modal-title" className="text-base sm:text-lg font-semibold text-white truncate">Group Members</h2>
                  <p className="text-xs text-white/80 mt-0.5">
                    {filteredPassengers.length} of {groupStay.passengers.length} {groupStay.passengers.length === 1 ? 'person' : 'people'}
                    {passengerSearch && filteredPassengers.length !== groupStay.passengers.length && (
                      <span className="ml-1">(filtered)</span>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowPassengersModal(false);
                  setPassengerSearch("");
                }}
                className="h-8 w-8 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-all duration-200 flex items-center justify-center hover:scale-110 flex-shrink-0 ml-3"
                title="Close (Esc)"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Search Bar */}
            {groupStay.passengers.length > 5 && (
              <div className="px-4 sm:px-6 py-3 border-b border-slate-200 flex-shrink-0 flex items-center justify-center">
                <div className="relative w-full max-w-md">
                  <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by name, phone, or nationality..."
                    value={passengerSearch}
                    onChange={(e) => setPassengerSearch(e.target.value)}
                    className="w-full pl-8 pr-8 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none transition-all duration-200 text-sm"
                    aria-label="Search passengers"
                  />
                  {passengerSearch && (
                    <button
                      onClick={() => setPassengerSearch("")}
                      className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      aria-label="Clear search"
                      title="Clear search"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0">
              {filteredPassengers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                    <Search className="h-8 w-8 text-slate-400" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 mb-2">No passengers found</h3>
                  <p className="text-sm text-slate-600 max-w-sm">
                    {passengerSearch 
                      ? `No passengers match "${passengerSearch}". Try a different search term.`
                      : "No passenger details are available for this group stay."
                    }
                  </p>
                  {passengerSearch && (
                    <button
                      onClick={() => setPassengerSearch("")}
                      className="mt-4 inline-flex items-center justify-center h-10 w-10 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-brand transition-all duration-200 shadow-sm hover:shadow-md hover:scale-110"
                      title="Clear search"
                      aria-label="Clear search"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  {filteredPassengers
                    .sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0))
                    .map((passenger, index) => (
                      <div
                        key={passenger.id || index}
                        className="p-3 sm:p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-brand/30 transition-all duration-200 hover:shadow-md"
                      >
                        <div className="flex items-start gap-3">
                          <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-brand/10 flex items-center justify-center flex-shrink-0">
                            <User className="h-4 w-4 sm:h-5 sm:w-5 text-brand" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-xs font-semibold text-slate-500">#{passenger.sequenceNumber || index + 1}</span>
                              <h3 className="text-sm font-semibold text-slate-900 truncate">
                                {passenger.firstName} {passenger.lastName}
                              </h3>
                            </div>
                            <div className="space-y-1 mt-2">
                              {passenger.age && (
                                <div className="text-xs text-slate-600">
                                  <span className="font-medium">Age:</span> {passenger.age}
                                </div>
                              )}
                              {passenger.gender && (
                                <div className="text-xs text-slate-600">
                                  <span className="font-medium">Gender:</span> {passenger.gender}
                                </div>
                              )}
                              {passenger.nationality && (
                                <div className="text-xs text-slate-600">
                                  <span className="font-medium">Nationality:</span> {passenger.nationality}
                                </div>
                              )}
                              {passenger.phone && (
                                <div className="text-xs text-slate-600 flex items-center gap-1">
                                  <Phone className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">{passenger.phone}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string | React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      {icon && <div className="mt-0.5 flex-shrink-0">{icon}</div>}
      <div className="flex-1 min-w-0">
        <div className="text-xs text-slate-500 mb-1">{label}</div>
        <div className="text-sm font-medium text-slate-900 break-words">{value}</div>
      </div>
    </div>
  );
}

