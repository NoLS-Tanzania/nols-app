"use client";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { Users, Search, X, Calendar, MapPin, Clock, User, BarChart3, UsersRound, CheckCircle, AlertCircle, Loader2, XCircle, Mail, Phone, FileText, Truck, Bus, Coffee, Wrench, Send, MessageSquare, Edit, CheckCircle2, Building2, Plus, Trash2, Tag, ChevronDown, Globe, DollarSign, Sparkles, Gift, ArrowRight } from "lucide-react";
import DatePicker from "@/components/ui/DatePicker";
import axios from "axios";
import Chart from "@/components/Chart";
import type { ChartData } from "chart.js";
import Image from "next/image";
import { useSearchParams } from "next/navigation";

// Use same-origin for HTTP calls so Next.js rewrites proxy to the API
const api = axios.create({ baseURL: "", withCredentials: true });

function authify() {
  if (typeof window === "undefined") return;

  // Most of the app uses a Bearer token (often stored in localStorage).
  // The API endpoints are protected by requireAuth, so we must attach it.
  const lsToken =
    window.localStorage.getItem("token") ||
    window.localStorage.getItem("nolsaf_token") ||
    window.localStorage.getItem("__Host-nolsaf_token");

  if (lsToken) {
    api.defaults.headers.common["Authorization"] = `Bearer ${lsToken}`;
    return;
  }

  // Fallback: non-httpOnly cookie (if present)
  const m = String(document.cookie || "").match(/(?:^|;\s*)(?:nolsaf_token|__Host-nolsaf_token)=([^;]+)/);
  const cookieToken = m?.[1] ? decodeURIComponent(m[1]) : "";
  if (cookieToken) {
    api.defaults.headers.common["Authorization"] = `Bearer ${cookieToken}`;
  }
}

type GroupBookingRow = {
  id: number;
  groupType: string;
  accommodationType: string;
  headcount: number;
  maleCount?: number | null;
  femaleCount?: number | null;
  otherCount?: number | null;
  roomsNeeded: number;
  toRegion: string;
  toDistrict: string | null;
  toLocation: string | null;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  user: { id: number; name: string; email: string; phone: string | null } | null;
  createdAt: string;
  updatedAt?: string | null;
  arrPickup: boolean;
  arrTransport: boolean;
  arrMeals: boolean;
  arrGuide: boolean;
  arrEquipment: boolean;
  pickupLocation?: string | null;
  pickupTime?: string | null;
  arrangementNotes?: string | null;
  notes?: string | null;
  isOpenForClaims?: boolean; // Whether booking is open for owner claims/offers
  openedForClaimsAt?: string | null; // When booking was opened for claims
};

function badgeClasses(v: string) {
  switch (v) {
    case "PENDING":
      return "bg-gray-100 text-gray-700";
    case "REVIEWING":
      return "bg-purple-100 text-purple-700";
    case "CONFIRMED":
      return "bg-blue-100 text-blue-700";
    case "PROCESSING":
      return "bg-yellow-100 text-yellow-700";
    case "COMPLETED":
      return "bg-green-100 text-green-700";
    case "CANCELED":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

type BookingStats = {
  date: string;
  count: number;
  confirmed: number;
  totalHeadcount: number;
};

type BookingStatsResponse = {
  stats: BookingStats[];
  period: string;
  startDate: string;
  endDate: string;
};

type SummaryData = {
  totalBookings?: number;
  pendingBookings?: number;
  confirmedBookings?: number;
  processingBookings?: number;
  completedBookings?: number;
  canceledBookings?: number;
};

export default function AdminGroupStaysBookingsPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<string>("");
  const [groupType, setGroupType] = useState<string>("");
  const [date, setDate] = useState<string | string[]>("");
  const [q, setQ] = useState("");
  const [list, setList] = useState<GroupBookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 30;
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [pickerAnim, setPickerAnim] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Histogram state
  const [histogramPeriod, setHistogramPeriod] = useState<string>("30d");
  const [histogramData, setHistogramData] = useState<BookingStatsResponse | null>(null);
  const [histogramLoading, setHistogramLoading] = useState(false);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});

  // Modal state for booking details
  const [bookingDetails, setBookingDetails] = useState<GroupBookingRow | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Admin action state
  const [quickMessage, setQuickMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [auditHistory, setAuditHistory] = useState<any[]>([]);
  const [loadingAuditHistory, setLoadingAuditHistory] = useState(false);
  const [showPassengers, setShowPassengers] = useState(false);
  const [passengers, setPassengers] = useState<any[]>([]);
  const [loadingPassengers, setLoadingPassengers] = useState(false);
  const [conversationMessages, setConversationMessages] = useState<any[]>([]);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [showConversation, setShowConversation] = useState(false);
  const [adminSuggestions, setAdminSuggestions] = useState({
    accommodationOptions: "",
    pricing: "",
    recommendations: "",
    nextSteps: "",
  });
  const [pricingDetails, setPricingDetails] = useState({
    pricePerNight: "",
    totalNights: "",
    totalAmount: "",
    currency: "TZS",
    notes: "",
    headcount: "",
    roomsNeeded: "",
    privateRoomCount: "",
  });
  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [discountDetails, setDiscountDetails] = useState({
    type: "percentage", // "percentage" or "amount"
    value: "",
    criteria: "nights", // "nights", "headcount", "both"
    minNights: "",
    minHeadcount: "",
  });
  const [submittingSuggestions, setSubmittingSuggestions] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Property recommendation state
  const [showPropertySearch, setShowPropertySearch] = useState(false);
  const [propertySearchLoading, setPropertySearchLoading] = useState(false);
  const [propertySearchResults, setPropertySearchResults] = useState<any[]>([]);
  const [selectedProperties, setSelectedProperties] = useState<any[]>([]);
  const [attachingProperties, setAttachingProperties] = useState(false);
  const [recommendedPropertyIds, setRecommendedPropertyIds] = useState<number[]>([]);

  // Claims review state - Premium admin interface for reviewing owner offers
  const [claimsData, setClaimsData] = useState<any>(null);
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [selectedClaimIds, setSelectedClaimIds] = useState<number[]>([]); // Selected claims for recommendation (max 3)
  const [recommendingClaims, setRecommendingClaims] = useState(false);
  const [startingClaimsReview, setStartingClaimsReview] = useState(false);
  const [comparisonView, setComparisonView] = useState<"grid" | "list">("grid");
  const [claimsFilter, setClaimsFilter] = useState<"all" | "pending" | "accepted" | "rejected">("all");
  const [showShortlistOnly, setShowShortlistOnly] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const params: any = {
        page,
        pageSize,
      };
      // Only include filters if they have values (not empty strings) - matching Plan with Us pattern
      if (status && status.trim()) params.status = status.trim();
      if (groupType && groupType.trim()) params.groupType = groupType.trim();
      if (date) {
        if (Array.isArray(date) && date.length > 0) {
          if (date[0]) params.start = date[0];
          if (date[1]) params.end = date[1];
        } else if (date && !Array.isArray(date)) {
          params.date = date;
        }
      }
      if (q && q.trim()) params.q = q.trim();

      console.log('Loading group bookings with params:', params);
      const r = await api.get<{ items: GroupBookingRow[]; total: number }>("/api/admin/group-stays/bookings", { params });
      console.log('Group bookings response:', { 
        itemsCount: Array.isArray(r.data?.items) ? r.data.items.length : 0, 
        total: r.data?.total || 0, 
        items: r.data?.items,
        fullResponse: r.data
      });
      setList(Array.isArray(r.data?.items) ? r.data.items : []);
      setTotal(r.data?.total ?? 0);
    } catch (err: any) {
      console.error("Failed to load group bookings", err);
      console.error("Error details:", err?.response?.data || err?.message);
      // Show error to user
      if (err?.response?.data?.error) {
        alert(`Error loading bookings: ${err.response.data.error}`);
      }
      setList([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  async function loadStatusCounts() {
    try {
      const r = await api.get<SummaryData>("/api/admin/group-stays/summary");
      if (r?.data) {
        setStatusCounts({
          "": r.data.totalBookings || 0,
          "PENDING": r.data.pendingBookings || 0,
          "CONFIRMED": r.data.confirmedBookings || 0,
          "PROCESSING": r.data.processingBookings || 0,
          "COMPLETED": r.data.completedBookings || 0,
          "CANCELED": r.data.canceledBookings || 0,
        });
      }
    } catch (err) {
      console.error("Failed to load status counts", err);
    }
  }

  const loadHistogram = useCallback(async () => {
    setHistogramLoading(true);
    try {
      const r = await api.get<BookingStatsResponse>("/api/admin/group-stays/bookings/stats", {
        params: { period: histogramPeriod },
      });
      setHistogramData(r.data);
    } catch (err) {
      console.error("Failed to load booking statistics", err);
      setHistogramData(null);
    } finally {
      setHistogramLoading(false);
    }
  }, [histogramPeriod]);

  // Load booking details
  const loadBookingDetails = async (bookingId: number) => {
    setDetailsLoading(true);
    try {
      const r = await api.get<GroupBookingRow & { recommendedPropertyIds?: number[] | null; needsPrivateRoom?: boolean; privateRoomCount?: number; roomSize?: number; adminNotes?: string | null }>(`/api/admin/group-stays/bookings/${bookingId}`);
      setBookingDetails(r.data);
      if (r.data.recommendedPropertyIds && Array.isArray(r.data.recommendedPropertyIds)) {
        setRecommendedPropertyIds(r.data.recommendedPropertyIds);
      } else {
        setRecommendedPropertyIds([]);
      }
      
      // Parse adminNotes if available
      if (r.data.adminNotes) {
        try {
          const parsed = typeof r.data.adminNotes === 'string' ? JSON.parse(r.data.adminNotes) : r.data.adminNotes;
          setAdminSuggestions({
            accommodationOptions: parsed.accommodationOptions || "",
            pricing: parsed.pricing || "",
            recommendations: parsed.recommendations || "",
            nextSteps: parsed.nextSteps || "",
          });
        } catch (e) {
          console.error("Failed to parse adminNotes:", e);
        }
      }
      
      // Auto-fill pricing details from booking data
      if (r.data) {
        // Calculate total nights from checkIn and checkOut
        let calculatedNights = "";
        if (r.data.checkIn && r.data.checkOut) {
          const checkInDate = new Date(r.data.checkIn);
          const checkOutDate = new Date(r.data.checkOut);
          const diffTime = Math.abs(checkOutDate.getTime() - checkInDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          calculatedNights = diffDays > 0 ? diffDays.toString() : "";
        }
        
        setPricingDetails({
          pricePerNight: "",
          totalNights: calculatedNights,
          totalAmount: "",
          currency: "TZS",
          notes: "",
          headcount: r.data.headcount?.toString() || "",
          roomsNeeded: r.data.roomsNeeded?.toString() || "",
          privateRoomCount: (r.data as any).needsPrivateRoom ? ((r.data as any).privateRoomCount?.toString() || "0") : "",
        });
      }
      
      setShowDetailsModal(true);
      // Load audit history
      await loadAuditHistory(bookingId);
      // Load passengers
      await loadPassengers(bookingId);
      // Load conversation messages
      await loadConversationMessages(bookingId);
      // Load submitted claims if booking is open for claims
      if ((r.data as any).isOpenForClaims === true) {
        await loadClaims(bookingId);
      }
    } catch (err) {
      console.error("Failed to load booking details", err);
      alert("Failed to load booking details");
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleViewBooking = (booking: GroupBookingRow) => {
    loadBookingDetails(booking.id);
  };

  // Message templates
  const messageTemplates = {
    reviewing: "Thank you for your interest in using NoLSaf for your group stay! We have received your booking request and our team is currently reviewing it. We will get back to you soon with accommodation options and pricing tailored to your group's needs. We appreciate your patience!",
    processing: "Great news! We're now processing your group stay booking. Our team is working on finding the best accommodation options for your group. We'll contact you shortly with recommendations and pricing details.",
    confirmed: "Excellent! Your group stay booking has been confirmed. We've found suitable accommodation options for your group. Please review the recommendations we've sent and let us know if you'd like to proceed.",
    propertiesRecommended: "We've found some great accommodation options that match your requirements! Please review the recommended properties and let us know which one you prefer. We're here to help make your group stay memorable.",
  };

  // Auto-fill message template
  const handleFillTemplate = (templateKey: keyof typeof messageTemplates) => {
    setQuickMessage(messageTemplates[templateKey]);
  };

  // Parse and format admin suggestions text (handles markdown-like formatting)
  const formatAdminText = (text: string) => {
    if (!text) return null;
    
    const lines = text.split('\n');
    const sections: Array<{ type: 'heading' | 'bullet' | 'text' | 'discount' | 'savings' | 'finalPrice'; content: string; value?: string }> = [];
    
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      
      // Check for bold headings (e.g., **Pricing Details:**)
      if (trimmed.startsWith('**') && trimmed.endsWith(':**')) {
        const heading = trimmed.replace(/\*\*/g, '').replace(':', '');
        sections.push({ type: 'heading', content: heading });
      }
      // Check for discount section (🎉 Special Discount)
      else if (trimmed.includes('🎉') || trimmed.includes('Special Discount')) {
        sections.push({ type: 'discount', content: trimmed.replace(/\*\*/g, '').replace('🎉', '').trim() });
      }
      // Check for savings line (💰 You Save)
      else if (trimmed.includes('💰') || trimmed.includes('You Save')) {
        const savingsMatch = trimmed.match(/(\d[\d,]*)\s*TZS/);
        sections.push({ 
          type: 'savings', 
          content: trimmed.replace(/\*\*/g, '').replace('💰', '').trim(),
          value: savingsMatch ? savingsMatch[1] : undefined
        });
      }
      // Check for Final Price (bolded)
      else if (trimmed.includes('Final Price') && trimmed.includes('**')) {
        const priceMatch = trimmed.match(/(\d[\d,]*)\s*TZS/);
        sections.push({ 
          type: 'finalPrice', 
          content: trimmed.replace(/\*\*/g, '').trim(),
          value: priceMatch ? priceMatch[1] : undefined
        });
      }
      // Check for bold text (e.g., **Final Price:**)
      else if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
        sections.push({ type: 'heading', content: trimmed.replace(/\*\*/g, '') });
      }
      // Check for bullet points
      else if (trimmed.startsWith('•')) {
        sections.push({ type: 'bullet', content: trimmed.substring(1).trim() });
      }
      // Regular text
      else {
        sections.push({ type: 'text', content: trimmed });
      }
    });
    
    return sections;
  };

  // Load audit history
  // Load conversation messages
  const loadConversationMessages = async (bookingId: number) => {
    setLoadingConversation(true);
    try {
      // Get all messages for this booking (including internal admin notes for admin view)
      const messages = await api.get(`/api/admin/group-stays/bookings/${bookingId}/messages`);
      if (messages.data.success && messages.data.messages) {
        const formattedMessages = messages.data.messages.map((m: any) => ({
          id: m.id,
          messageType: m.messageType || 'General',
          message: m.message || m.body,
          senderRole: m.senderRole,
          senderName: m.senderName || 'Unknown',
          createdAt: m.createdAt,
          formattedDate: m.formattedDate || new Date(m.createdAt).toLocaleString(),
        }));
        setConversationMessages(formattedMessages);
      } else {
        setConversationMessages([]);
      }
    } catch (err) {
      console.error("Failed to load conversation messages", err);
      setConversationMessages([]);
    } finally {
      setLoadingConversation(false);
    }
  };

  // Load audit history
  const loadAuditHistory = async (bookingId: number) => {
    setLoadingAuditHistory(true);
    try {
      const r = await api.get(`/api/admin/group-stays/bookings/${bookingId}/audit`);
      // Also get booking details to access adminNotes for SUGGESTIONS_PROVIDED entries
      const bookingR = await api.get(`/api/admin/group-stays/bookings/${bookingId}`);
      const adminNotes = bookingR.data.adminNotes;
      
      // Filter out message-related audit entries (they'll be shown in conversation)
      // Keep only non-message actions like STATUS_CHANGED, SUGGESTIONS_PROVIDED, etc.
      const filteredAudits = (r.data.items || []).filter((audit: any) => {
        return audit.action !== 'MESSAGE_SENT' && 
               audit.action !== 'CUSTOMER_MESSAGE_SENT' &&
               audit.action !== 'STATUS_CHANGED_TO_REVIEWING' &&
               audit.action !== 'STATUS_CHANGED_TO_PROCESSING';
      });
      
      // Enrich audit entries with adminNotes for SUGGESTIONS_PROVIDED
      const enrichedAudits = filteredAudits.map((audit: any) => {
        if (audit.action === 'SUGGESTIONS_PROVIDED' && adminNotes) {
          try {
            const parsed = typeof adminNotes === 'string' ? JSON.parse(adminNotes) : adminNotes;
            return {
              ...audit,
              adminSuggestions: parsed,
            };
          } catch (e) {
            return audit;
          }
        }
        return audit;
      });
      
      setAuditHistory(enrichedAudits);
    } catch (err) {
      console.error("Failed to load audit history", err);
      setAuditHistory([]);
    } finally {
      setLoadingAuditHistory(false);
    }
  };

  // Load passengers
  const loadPassengers = async (bookingId: number) => {
    setLoadingPassengers(true);
    try {
      const r = await api.get(`/api/admin/group-stays/passengers?bookingId=${bookingId}&pageSize=100`);
      setPassengers(r.data.items || []);
    } catch (err) {
      console.error("Failed to load passengers", err);
      setPassengers([]);
    } finally {
      setLoadingPassengers(false);
    }
  };

  // Load submitted claims for a group booking
  const loadClaims = async (bookingId: number) => {
    setClaimsLoading(true);
    try {
      const response = await api.get(`/api/admin/group-stays/claims/${bookingId}`);
      setClaimsData(response.data);

      const serverRecommendedIds = Array.isArray(response.data?.recommendedClaimIds)
        ? response.data.recommendedClaimIds
        : [];
      setSelectedClaimIds(serverRecommendedIds);

      const shortlistIds = [
        response.data?.shortlist?.high?.id,
        response.data?.shortlist?.mid?.id,
        response.data?.shortlist?.low?.id,
      ].filter(Boolean);
      setShowShortlistOnly(shortlistIds.length > 0);
    } catch (err: any) {
      console.error("Failed to load claims:", err);
      setClaimsData(null);
    } finally {
      setClaimsLoading(false);
    }
  };

  // Toggle claim selection for recommendation (max 3)
  const toggleClaimSelection = (claimId: number) => {
    setSelectedClaimIds((prev) => {
      if (prev.includes(claimId)) {
        // Deselect
        return prev.filter((id) => id !== claimId);
      } else {
        // Select (max 3)
        if (prev.length >= 3) {
          alert("You can only select up to 3 claims for recommendation");
          return prev;
        }
        return [...prev, claimId];
      }
    });
  };

  // Submit selected claims as recommendations
  const handleRecommendClaims = async () => {
    if (!bookingDetails || selectedClaimIds.length === 0) return;
    
    setRecommendingClaims(true);
    try {
      const response = await api.post(`/api/admin/group-stays/claims/${bookingDetails.id}/recommendations`, {
        claimIds: selectedClaimIds,
      });

      if (response.data.success) {
        // Reload claims to update status
        await loadClaims(bookingDetails.id);
        // Reload booking details
        await loadBookingDetails(bookingDetails.id);
        alert(`Successfully recommended ${selectedClaimIds.length} claim(s) to customer`);
      }
    } catch (err: any) {
      console.error("Failed to recommend claims:", err);
      alert(err?.response?.data?.error || "Failed to recommend claims");
    } finally {
      setRecommendingClaims(false);
    }
  };

  const handleStartClaimsReview = async () => {
    if (!bookingDetails) return;
    setStartingClaimsReview(true);
    try {
      const r = await api.post(`/api/admin/group-stays/claims/${bookingDetails.id}/start-review`);
      if (r.data?.success) {
        await loadClaims(bookingDetails.id);
        await loadBookingDetails(bookingDetails.id);
        alert("Claims marked as REVIEWING");
      }
    } catch (err: any) {
      console.error("Failed to start claims review:", err);
      alert(err?.response?.data?.error || "Failed to start review");
    } finally {
      setStartingClaimsReview(false);
    }
  };

  // Update individual claim status
  const handleUpdateClaimStatus = async (claimId: number, status: string) => {
    if (!bookingDetails) return;
    
    try {
      const response = await api.patch(`/api/admin/group-stays/claims/${claimId}/status`, {
        status,
      });

      if (response.data.success) {
        // Reload claims to update
        await loadClaims(bookingDetails.id);
      }
    } catch (err: any) {
      console.error("Failed to update claim status:", err);
      alert(err?.response?.data?.error || "Failed to update claim status");
    }
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setBookingDetails(null);
    setQuickMessage("");
    setShowPassengers(false);
    setPassengers([]);
    setClaimsData(null);
    setSelectedClaimIds([]);
    setClaimsFilter("all");
    setComparisonView("grid");
    setShowShortlistOnly(true);
    setAdminSuggestions({
      accommodationOptions: "",
      pricing: "",
      recommendations: "",
      nextSteps: "",
    });
    setPricingDetails({
      pricePerNight: "",
      totalNights: "",
      totalAmount: "",
      currency: "TZS",
      notes: "",
      headcount: "",
      roomsNeeded: "",
      privateRoomCount: "",
    });
    setDiscountEnabled(false);
    setDiscountDetails({
      type: "percentage",
      value: "",
      criteria: "nights",
      minNights: "",
      minHeadcount: "",
    });
  };

  // Handle sending quick message to customer
  const handleSendQuickMessage = async () => {
    if (!bookingDetails || !quickMessage.trim()) return;
    
    setSendingMessage(true);
    try {
      const response = await api.post(`/api/admin/group-stays/bookings/${bookingDetails.id}/message`, {
        message: quickMessage.trim(),
      });
      
      // Reload audit history and conversation
      await loadAuditHistory(bookingDetails.id);
      await loadConversationMessages(bookingDetails.id);
      
      // Reload booking details if status changed
      if (response.data.statusChanged && response.data.newStatus) {
        await loadBookingDetails(bookingDetails.id);
        // Reload list to reflect status change
        load();
      }
      
      window.dispatchEvent(
        new CustomEvent("nols:toast", {
          detail: { 
            type: "success", 
            title: "Message Sent", 
            message: response.data.statusChanged 
              ? `Message sent and status updated to ${response.data.newStatus}. Customer has been notified.`
              : "Your message has been sent to the customer and logged in audit history.", 
            duration: 3000 
          },
        })
      );
      setQuickMessage("");
    } catch (err: any) {
      console.error("Failed to send message", err);
      alert(err?.response?.data?.error || "Failed to send message. Please try again.");
    } finally {
      setSendingMessage(false);
    }
  };

  // Handle submitting admin suggestions
  const handleSubmitSuggestions = async () => {
    if (!bookingDetails) return;
    
    setSubmittingSuggestions(true);
    try {
      // Format pricing details into a structured text
      let pricingText = "";
      if (pricingDetails.pricePerNight || pricingDetails.totalAmount) {
        pricingText = `**Pricing Details:**\n`;
        if (pricingDetails.pricePerNight && pricingDetails.totalNights) {
          pricingText += `• Price per Night: ${pricingDetails.pricePerNight} ${pricingDetails.currency}\n`;
          pricingText += `• Total Nights: ${pricingDetails.totalNights}\n`;
        }
        
        const subtotal = Number(pricingDetails.totalAmount) || (Number(pricingDetails.pricePerNight) * Number(pricingDetails.roomsNeeded || 1) * Number(pricingDetails.totalNights));
        let finalAmount = subtotal;
        let discountInfo = "";
        
        // Calculate discount if enabled
        if (discountEnabled && discountDetails.value) {
          let discountAmount = 0;
          if (discountDetails.type === "percentage") {
            discountAmount = (subtotal * Number(discountDetails.value)) / 100;
          } else {
            discountAmount = Number(discountDetails.value);
          }
          finalAmount = Math.max(0, subtotal - discountAmount);
          
          discountInfo = `\n**🎉 Special Discount:**\n`;
          discountInfo += `• Original Price: ${subtotal.toLocaleString()} ${pricingDetails.currency}\n`;
          discountInfo += `• Discount: ${discountDetails.type === "percentage" ? discountDetails.value + "%" : discountDetails.value + " " + pricingDetails.currency}\n`;
          discountInfo += `• Discount Amount: ${discountAmount.toLocaleString()} ${pricingDetails.currency}\n`;
          discountInfo += `• **Final Price: ${finalAmount.toLocaleString()} ${pricingDetails.currency}**\n`;
          discountInfo += `• **💰 You Save: ${discountAmount.toLocaleString()} ${pricingDetails.currency}!**\n`;
          
          if (discountDetails.criteria !== "nights") {
            if (discountDetails.criteria === "headcount" && discountDetails.minHeadcount) {
              discountInfo += `• Minimum Headcount: ${discountDetails.minHeadcount} people\n`;
            } else if (discountDetails.criteria === "both") {
              if (discountDetails.minNights) discountInfo += `• Minimum Nights: ${discountDetails.minNights}\n`;
              if (discountDetails.minHeadcount) discountInfo += `• Minimum Headcount: ${discountDetails.minHeadcount} people\n`;
            }
          } else if (discountDetails.minNights) {
            discountInfo += `• Minimum Nights: ${discountDetails.minNights}\n`;
          }
        } else {
          pricingText += `• Total Amount: ${subtotal.toLocaleString()} ${pricingDetails.currency}\n`;
        }
        
        pricingText += discountInfo;
        
        if (pricingDetails.notes) {
          pricingText += `\n**Additional Notes:**\n${pricingDetails.notes}`;
        }
      }
      
      // Combine with existing pricing field if it has content
      const finalPricing = pricingText || adminSuggestions.pricing;
      
      await api.patch(`/api/admin/group-stays/bookings/${bookingDetails.id}`, {
        adminSuggestions: {
          ...adminSuggestions,
          pricing: finalPricing,
        },
        status: bookingDetails.status === "PENDING" || bookingDetails.status === "REVIEWING" ? "PROCESSING" : bookingDetails.status, // Update status when suggestions are provided
      });
      
      // Reload audit history and conversation
      await loadAuditHistory(bookingDetails.id);
      await loadConversationMessages(bookingDetails.id);
      
      window.dispatchEvent(
        new CustomEvent("nols:toast", {
          detail: { 
            type: "success", 
            title: "Suggestions Submitted", 
            message: "Your suggestions have been saved and sent to the customer.", 
            duration: 3000 
          },
        })
      );
      
      // Reload booking details
      if (bookingDetails.id) {
        loadBookingDetails(bookingDetails.id);
      }
    } catch (err) {
      console.error("Failed to submit suggestions", err);
      alert("Failed to submit suggestions. Please try again.");
    } finally {
      setSubmittingSuggestions(false);
    }
  };

  // Handle status update
  const handleUpdateStatus = async (newStatus: string) => {
    if (!bookingDetails) return;
    
    setUpdatingStatus(true);
    try {
      await api.patch(`/api/admin/group-stays/bookings/${bookingDetails.id}`, {
        status: newStatus,
      });
      
      // Reload audit history and conversation
      await loadAuditHistory(bookingDetails.id);
      await loadConversationMessages(bookingDetails.id);
      
      window.dispatchEvent(
        new CustomEvent("nols:toast", {
          detail: { 
            type: "success", 
            title: "Status Updated", 
            message: `Booking status updated to ${newStatus}.`, 
            duration: 3000 
          },
        })
      );
      
      // Reload booking details
      if (bookingDetails.id) {
        loadBookingDetails(bookingDetails.id);
      }
      // Reload list
      load();
    } catch (err: any) {
      console.error("Failed to update status", err);
      alert(err?.response?.data?.error || "Failed to update status. Please try again.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Search properties for recommendation
  const handleSearchProperties = async () => {
    if (!bookingDetails) return;
    
    setPropertySearchLoading(true);
    try {
      const params: any = {
        region: bookingDetails.toRegion,
        page: 1,
        pageSize: 20,
      };
      
      if (bookingDetails.toDistrict) {
        params.district = bookingDetails.toDistrict;
      }
      
      if (bookingDetails.accommodationType) {
        params.accommodationType = bookingDetails.accommodationType;
      }
      
      if (bookingDetails.roomsNeeded) {
        params.minRooms = bookingDetails.roomsNeeded;
      }
      
      if (bookingDetails.headcount) {
        params.headcount = bookingDetails.headcount;
      }
      
      const r = await api.get("/api/admin/group-stays/recommendations/search", { params });
      setPropertySearchResults(r.data.items || []);
      setShowPropertySearch(true);
    } catch (err: any) {
      console.error("Failed to search properties", err);
      alert("Failed to search properties. Please try again.");
    } finally {
      setPropertySearchLoading(false);
    }
  };

  // Add property to selection
  const handleAddProperty = (property: any) => {
    if (selectedProperties.length >= 2) {
      alert("You can only select up to 2 properties");
      return;
    }
    if (selectedProperties.find(p => p.id === property.id)) {
      alert("Property already selected");
      return;
    }
    setSelectedProperties([...selectedProperties, property]);
  };

  // Remove property from selection
  const handleRemoveProperty = (propertyId: number) => {
    setSelectedProperties(selectedProperties.filter(p => p.id !== propertyId));
  };

  // Attach recommended properties to booking
  const handleAttachProperties = async () => {
    if (!bookingDetails || selectedProperties.length === 0) return;
    
    setAttachingProperties(true);
    try {
      const propertyIds = selectedProperties.map(p => p.id);
      await api.patch(`/api/admin/group-stays/recommendations/bookings/${bookingDetails.id}/recommendations`, {
        propertyIds,
      });
      
      setRecommendedPropertyIds(propertyIds);
      setShowPropertySearch(false);
      
      window.dispatchEvent(
        new CustomEvent("nols:toast", {
          detail: { 
            type: "success", 
            title: "Properties Attached", 
            message: `${selectedProperties.length} propert${selectedProperties.length > 1 ? 'ies' : 'y'} attached to booking. Customer will be notified.`, 
            duration: 3000 
          },
        })
      );
      
      // Reload booking details
      if (bookingDetails.id) {
        loadBookingDetails(bookingDetails.id);
      }
      load();
    } catch (err: any) {
      console.error("Failed to attach properties", err);
      alert(err?.response?.data?.error || "Failed to attach properties. Please try again.");
    } finally {
      setAttachingProperties(false);
    }
  };

  // Normalize date to string for stable dependency array
  const dateKey = useMemo(() => {
    if (Array.isArray(date)) {
      return `${date[0] || ''}-${date[1] || ''}`;
    }
    return String(date || '');
  }, [date]);

  // Check for bookingId in URL params and open modal when list is loaded
  useEffect(() => {
    const bookingIdParam = searchParams?.get("bookingId");
    if (bookingIdParam && !isNaN(Number(bookingIdParam)) && !loading && list.length > 0) {
      const bookingId = Number(bookingIdParam);
      const existingBooking = list.find((b) => b.id === bookingId);
      if (existingBooking) {
        loadBookingDetails(bookingId);
        // Clean up URL without reloading
        window.history.replaceState({}, "", "/admin/group-stays/bookings");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, list, searchParams]);

  useEffect(() => {
    authify();
    load();
    loadStatusCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status, groupType, dateKey, q]);

  useEffect(() => {
    authify();
    loadHistogram();
  }, [loadHistogram]);

  const pages = Math.max(1, Math.ceil(total / pageSize));

  const recommendedClaimIds = Array.isArray(claimsData?.recommendedClaimIds) ? claimsData.recommendedClaimIds : [];
  const shortlistClaimIds = [
    claimsData?.shortlist?.high?.id,
    claimsData?.shortlist?.mid?.id,
    claimsData?.shortlist?.low?.id,
  ].filter(Boolean) as number[];

  // Prepare histogram chart data
  const histogramChartData = useMemo<ChartData<"bar">>(() => {
    if (!histogramData || histogramData.stats.length === 0) {
      return {
        labels: [],
        datasets: [],
      };
    }

    const labels = histogramData.stats.map((s) => {
      const d = new Date(s.date);
      return histogramPeriod === "year"
        ? d.toLocaleDateString("en-US", { month: "short" })
        : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    });

    return {
      labels,
      datasets: [
        {
          label: "Total Bookings",
          data: histogramData.stats.map((s) => s.count),
          backgroundColor: "rgba(139, 92, 246, 0.8)", // Purple
          borderColor: "rgba(139, 92, 246, 1)",
          borderWidth: 1,
        },
        {
          label: "Confirmed",
          data: histogramData.stats.map((s) => s.confirmed),
          backgroundColor: "rgba(59, 130, 246, 0.8)", // Blue
          borderColor: "rgba(59, 130, 246, 1)",
          borderWidth: 1,
        },
      ],
    };
  }, [histogramData, histogramPeriod]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center mb-4">
            <UsersRound className="h-8 w-8 text-purple-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Group Stay Bookings</h1>
          <p className="text-sm text-gray-500 mt-1">View and manage all group accommodation bookings</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm overflow-hidden box-border">
        <div className="flex flex-col gap-4 w-full">
          {/* Top Row: Search and Date Picker */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
            {/* Search Box */}
            <div className="relative w-full sm:flex-1 min-w-0">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  ref={searchRef}
                  type="text"
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-sm box-border"
                  placeholder="Search bookings..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  aria-label="Search bookings"
                  title="Search bookings"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      setPage(1);
                      load();
                    }
                  }}
                  style={{ width: '100%', maxWidth: '100%' }}
                />
                {q && (
                  <button
                    type="button"
                    onClick={() => {
                      setQ("");
                      setPage(1);
                      load();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Date Picker */}
            <div className="relative w-full sm:w-auto sm:flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  setPickerAnim(true);
                  setTimeout(() => setPickerAnim(false), 350);
                  setPickerOpen((v) => !v);
                }}
                className={`w-full px-3 py-2 rounded-lg border border-gray-300 text-sm flex items-center justify-center gap-2 text-gray-700 bg-white transition-all ${
                  pickerAnim ? "ring-2 ring-purple-100" : "hover:bg-gray-50"
                } box-border`}
                style={{ width: '100%', maxWidth: '100%' }}
              >
                <Calendar className="h-4 w-4" />
                <span>Date</span>
              </button>
              {pickerOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setPickerOpen(false)} />
                  <div className="fixed z-50 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <DatePicker
                      selected={date || undefined}
                      onSelectAction={(s) => {
                        setDate(s as string | string[]);
                        setPage(1);
                      }}
                      onCloseAction={() => setPickerOpen(false)}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Status Cards - Clean Modern Design */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { 
                label: "All Bookings", 
                value: "", 
                icon: UsersRound, 
                iconBg: "bg-purple-100",
                iconColor: "text-purple-600",
                activeBg: "bg-purple-50",
                activeBorder: "border-purple-500",
                activeText: "text-purple-700",
                hoverBg: "hover:bg-purple-50",
                hoverBorder: "hover:border-purple-300"
              },
              { 
                label: "Pending", 
                value: "PENDING", 
                icon: Clock, 
                iconBg: "bg-gray-100",
                iconColor: "text-gray-600",
                activeBg: "bg-gray-50",
                activeBorder: "border-gray-500",
                activeText: "text-gray-700",
                hoverBg: "hover:bg-gray-50",
                hoverBorder: "hover:border-gray-300"
              },
              { 
                label: "Confirmed", 
                value: "CONFIRMED", 
                icon: CheckCircle, 
                iconBg: "bg-blue-100",
                iconColor: "text-blue-600",
                activeBg: "bg-blue-50",
                activeBorder: "border-blue-500",
                activeText: "text-blue-700",
                hoverBg: "hover:bg-blue-50",
                hoverBorder: "hover:border-blue-300"
              },
              { 
                label: "Processing", 
                value: "PROCESSING", 
                icon: Loader2, 
                iconBg: "bg-amber-100",
                iconColor: "text-amber-600",
                activeBg: "bg-amber-50",
                activeBorder: "border-amber-500",
                activeText: "text-amber-700",
                hoverBg: "hover:bg-amber-50",
                hoverBorder: "hover:border-amber-300"
              },
              { 
                label: "Completed", 
                value: "COMPLETED", 
                icon: CheckCircle, 
                iconBg: "bg-green-100",
                iconColor: "text-green-600",
                activeBg: "bg-green-50",
                activeBorder: "border-green-500",
                activeText: "text-green-700",
                hoverBg: "hover:bg-green-50",
                hoverBorder: "hover:border-green-300"
              },
              { 
                label: "Canceled", 
                value: "CANCELED", 
                icon: XCircle, 
                iconBg: "bg-red-100",
                iconColor: "text-red-600",
                activeBg: "bg-red-50",
                activeBorder: "border-red-500",
                activeText: "text-red-700",
                hoverBg: "hover:bg-red-50",
                hoverBorder: "hover:border-red-300"
              },
            ].map((s) => {
              const Icon = s.icon;
              const isActive = status === s.value;
              const count = statusCounts[s.value] || 0;
              
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => {
                    setStatus(s.value);
                    // Clear groupType filter when clicking "All Bookings" to show all types
                    if (s.value === "") {
                      setGroupType("");
                    }
                    setPage(1);
                    setTimeout(() => load(), 0);
                  }}
                  className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 ${
                    isActive
                      ? `${s.activeBg} ${s.activeBorder} border-2 shadow-lg scale-105`
                      : `bg-white border-gray-200 ${s.hoverBg} ${s.hoverBorder} hover:shadow-md hover:scale-[1.02]`
                  }`}
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2.5">
                      <div className={`w-10 h-10 rounded-lg ${isActive ? s.iconBg : "bg-gray-100"} flex items-center justify-center transition-colors duration-300`}>
                        <Icon className={`h-5 w-5 ${isActive ? s.iconColor : "text-gray-500"} ${s.value === "PROCESSING" && isActive ? "animate-spin" : ""} transition-colors duration-300`} />
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <p className={`text-[10px] font-semibold uppercase tracking-wider ${isActive ? s.activeText : "text-gray-500"} transition-colors duration-300`}>
                        {s.label}
                      </p>
                      <p className={`text-2xl font-bold ${isActive ? s.activeText : "text-gray-900"} transition-colors duration-300`}>
                        {loading && !statusCounts[s.value] ? "..." : count.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {isActive && (
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-white/20 rounded-full -mr-10 -mt-10 blur-xl"></div>
                      <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/10 rounded-full -ml-8 -mb-8 blur-lg"></div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Group Type Filters */}
          <div className="flex gap-2 items-center justify-center w-full overflow-x-auto pb-1 scrollbar-hide">

            {[
              { label: "All Types", value: "" },
              { label: "Family", value: "family" },
              { label: "Workers", value: "workers" },
              { label: "Event", value: "event" },
              { label: "Students", value: "students" },
              { label: "Team", value: "team" },
              { label: "Other", value: "other" },
            ].map((gt) => (
              <button
                key={gt.value}
                type="button"
                onClick={() => {
                  setGroupType(gt.value);
                  setPage(1);
                  setTimeout(() => load(), 0);
                }}
                className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all duration-300 whitespace-nowrap flex-shrink-0 ${
                  groupType === gt.value
                    ? "bg-purple-50 border-purple-300 text-purple-700 scale-105 shadow-md"
                    : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:scale-105 hover:shadow-sm"
                }`}
              >
                {gt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <>
            {/* Skeleton Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Group Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destination</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Headcount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-In</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {[...Array(5)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-12"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-20"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-32"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-28"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-20"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="h-8 bg-gray-200 rounded w-16 ml-auto"></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : list.length === 0 ? (
          <>
            <div className="px-6 py-12 text-center">
              <UsersRound className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No bookings found.</p>
              <p className="text-xs text-gray-400 mt-1">Try adjusting your filters or search query.</p>
            </div>

            {/* Booking Statistics Histogram */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm group transition-all duration-300 hover:shadow-lg hover:border-purple-300 hover:-translate-y-1">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 group-hover:text-purple-600 transition-colors duration-300">
                    <BarChart3 className="h-5 w-5 text-purple-600 group-hover:scale-110 transition-transform duration-300" />
                    Booking Statistics
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">Visualize booking data over time</p>
                </div>

                {/* Period Filter */}
                <div className="flex gap-2 flex-wrap">
                  {[
                    { label: "7 Days", value: "7d" },
                    { label: "30 Days", value: "30d" },
                    { label: "This Month", value: "month" },
                    { label: "This Year", value: "year" },
                  ].map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setHistogramPeriod(p.value)}
                      className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                        histogramPeriod === p.value
                          ? "bg-purple-50 border-purple-300 text-purple-700 scale-105 shadow-md"
                          : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:scale-105 hover:shadow-sm"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {histogramLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-purple-600"></div>
                </div>
              ) : histogramData?.stats && histogramData.stats.length > 0 ? (
                <div className="h-64 w-full transform transition-all duration-500 group-hover:scale-[1.02]">
                  <Chart
                    type="bar"
                    data={histogramChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: true,
                          position: "top",
                          labels: {
                            padding: 15,
                            font: {
                              size: 12,
                            },
                            usePointStyle: true,
                          },
                        },
                        tooltip: {
                          callbacks: {
                            label: (context: any) => {
                              const label = context.dataset.label || "";
                              const value = context.parsed.y || 0;
                              return `${label}: ${value} bookings`;
                            },
                          },
                        },
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: {
                            stepSize: 1,
                            font: {
                              size: 11,
                            },
                          },
                          grid: {
                            color: "rgba(0, 0, 0, 0.1)",
                          },
                          title: {
                            display: true,
                            text: "Number of Bookings",
                            font: {
                              size: 12,
                            },
                          },
                        },
                        x: {
                          grid: {
                            display: false,
                          },
                          ticks: {
                            font: {
                              size: 11,
                            },
                            maxRotation: 45,
                            minRotation: 45,
                          },
                        },
                      },
                    }}
                  />
                </div>
              ) : (
                <div className="h-64 w-full flex flex-col justify-end p-4">
                  {/* Skeleton Chart */}
                  <div className="relative h-full w-full">
                    {/* Y-axis skeleton */}
                    <div className="absolute left-0 top-0 bottom-8 w-8 flex flex-col justify-between">
                      <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                    </div>

                    {/* Chart area skeleton */}
                    <div className="ml-10 h-full relative">
                      {/* Grid lines */}
                      <div className="absolute inset-0 flex flex-col justify-between">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="h-px bg-gray-200"></div>
                        ))}
                      </div>

                      {/* Skeleton bars */}
                      <div className="absolute bottom-0 left-0 right-0 h-full flex items-end justify-around px-2">
                        {[...Array(7)].map((_, i) => (
                          <div
                            key={i}
                            className="w-8 bg-gray-200 rounded-t animate-pulse"
                            style={{ height: `${Math.random() * 70 + 30}%` }}
                          ></div>
                        ))}
                      </div>

                      {/* X-axis labels skeleton */}
                      <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2">
                        {[...Array(7)].map((_, i) => (
                          <div key={i} className="h-3 w-10 bg-gray-200 rounded animate-pulse"></div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Group Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destination</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Headcount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-In</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {list.map((booking) => (
                    <tr key={booking.id} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#{booking.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{booking.groupType}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {booking.user ? (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span>{booking.user.name}</span>
                          </div>
                        ) : (
                          "N/A"
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span>{booking.toRegion}{booking.toDistrict ? `, ${booking.toDistrict}` : ""}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span>{booking.headcount} ({booking.roomsNeeded} rooms)</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {booking.checkIn ? (
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span>{new Date(booking.checkIn).toLocaleDateString()}</span>
                          </div>
                        ) : (
                          "Flexible"
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${badgeClasses(booking.status)}`}>
                          {booking.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button 
                          onClick={() => handleViewBooking(booking)}
                          className="text-purple-600 hover:text-purple-900 transition-colors"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-gray-200">
              {list.map((booking) => (
                <div key={booking.id} className="p-4 bg-white hover:bg-gray-50 transition-colors duration-150">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-900">#{booking.id}</span>
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${badgeClasses(booking.status)}`}>
                      {booking.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span>Customer: {booking.user?.name || "N/A"}</span>
                  </div>
                  <div className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-400" />
                    <span>Type: {booking.groupType} • {booking.headcount} people ({booking.roomsNeeded} rooms)</span>
                  </div>
                  <div className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span>Destination: {booking.toRegion}{booking.toDistrict ? `, ${booking.toDistrict}` : ""}</span>
                  </div>
                  <div className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span>Check-In: {booking.checkIn ? new Date(booking.checkIn).toLocaleDateString() : "Flexible"}</span>
                  </div>
                  <div className="mt-3 text-right">
                    <button 
                      onClick={() => handleViewBooking(booking)}
                      className="text-purple-600 hover:text-purple-900 text-sm transition-colors"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {list.length > 0 && (
        <div className="flex justify-center py-4">
          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
              Page {page} of {pages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page === pages}
              className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </nav>
        </div>
      )}

      {/* Booking Details Modal - Modernized */}
      {showDetailsModal && (
        <>
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-300 animate-in fade-in"
            onClick={closeDetailsModal}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full my-8 max-h-[90vh] flex flex-col overflow-hidden transform transition-all duration-300 scale-100 opacity-100 animate-in zoom-in-95 slide-in-from-bottom-4">
              {/* Header with gradient */}
              <div className="sticky top-0 bg-gradient-to-r from-purple-50 via-purple-50 to-indigo-50 border-b border-gray-200 px-6 py-5 flex items-center justify-between z-10 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
                    <UsersRound className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Booking Details</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Complete booking information</p>
                  </div>
                </div>
                <button
                  onClick={closeDetailsModal}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white/80 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95"
                  aria-label="Close modal"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Content with smooth scroll */}
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                {detailsLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="text-center">
                      <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
                      <p className="text-sm text-gray-500">Loading booking details...</p>
                    </div>
                  </div>
                ) : bookingDetails ? (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {/* Status and ID Header Card */}
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl p-5 border border-gray-200/50 shadow-sm">
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-4">
                          <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
                            <span className="text-white font-bold text-lg">#{bookingDetails.id}</span>
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-gray-900">Booking #{bookingDetails.id}</h3>
                            <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                              <Clock className="h-3 w-3" />
                              Created {new Date(bookingDetails.createdAt).toLocaleDateString('en-US', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                        <span className={`px-4 py-2 inline-flex text-sm font-semibold rounded-full shadow-sm ${badgeClasses(bookingDetails.status)}`}>
                          {bookingDetails.status.replace(/_/g, " ")}
                        </span>
                      </div>
                    </div>

                    {/* Customer Information - Enhanced */}
                    {bookingDetails.user && (
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100/50 shadow-sm transition-all duration-300 hover:shadow-md">
                        <h4 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-blue-500 flex items-center justify-center">
                            <User className="h-4 w-4 text-white" />
                          </div>
                          Customer Information
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-white/60 rounded-lg p-3 border border-blue-100/50">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Name</p>
                            <p className="text-sm font-semibold text-gray-900">{bookingDetails.user.name}</p>
                          </div>
                          <div className="bg-white/60 rounded-lg p-3 border border-blue-100/50">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Email</p>
                            <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                              <Mail className="h-4 w-4 text-blue-600" />
                              <a href={`mailto:${bookingDetails.user.email}`} className="hover:text-blue-600 transition-colors">
                                {bookingDetails.user.email}
                              </a>
                            </p>
                          </div>
                          {bookingDetails.user.phone && (
                            <div className="bg-white/60 rounded-lg p-3 border border-blue-100/50">
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Phone</p>
                              <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                <Phone className="h-4 w-4 text-blue-600" />
                                <a href={`tel:${bookingDetails.user.phone}`} className="hover:text-blue-600 transition-colors">
                                  {bookingDetails.user.phone}
                                </a>
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Booking Details - Enhanced Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Group Details Card */}
                      <div className="bg-white border-2 border-gray-200 rounded-xl p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:border-purple-200">
                        <h4 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center">
                            <UsersRound className="h-4 w-4 text-purple-600" />
                          </div>
                          Group Details
                        </h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Group Type</span>
                            <span className="text-sm font-semibold text-purple-700 capitalize px-3 py-1 bg-purple-100 rounded-full">
                              {bookingDetails.groupType}
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Accommodation</span>
                            <span className="text-sm font-semibold text-gray-900 capitalize">{bookingDetails.accommodationType}</span>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Headcount</span>
                              <span className="text-sm font-semibold text-gray-900 flex items-center gap-1">
                                <Users className="h-4 w-4 text-purple-600" />
                                {bookingDetails.headcount} people
                              </span>
                            </div>
                            {/* Gender Breakdown */}
                            {(bookingDetails.maleCount || bookingDetails.femaleCount || bookingDetails.otherCount) && (
                              <div className="pt-2 border-t border-gray-200 space-y-1.5">
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Gender Breakdown</p>
                                {bookingDetails.maleCount && bookingDetails.maleCount > 0 && (
                                  <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                                    <span className="text-xs font-medium text-gray-600">Male</span>
                                    <span className="text-sm font-semibold text-blue-700">{bookingDetails.maleCount}</span>
                                  </div>
                                )}
                                {bookingDetails.femaleCount && bookingDetails.femaleCount > 0 && (
                                  <div className="flex items-center justify-between p-2 bg-pink-50 rounded-lg">
                                    <span className="text-xs font-medium text-gray-600">Female</span>
                                    <span className="text-sm font-semibold text-pink-700">{bookingDetails.femaleCount}</span>
                                  </div>
                                )}
                                {bookingDetails.otherCount && bookingDetails.otherCount > 0 && (
                                  <div className="flex items-center justify-between p-2 bg-purple-50 rounded-lg">
                                    <span className="text-xs font-medium text-gray-600">Other</span>
                                    <span className="text-sm font-semibold text-purple-700">{bookingDetails.otherCount}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Rooms Needed</span>
                            <span className="text-sm font-semibold text-gray-900">{bookingDetails.roomsNeeded} rooms</span>
                          </div>
                        </div>
                      </div>

                      {/* Destination Card */}
                      <div className="bg-white border-2 border-gray-200 rounded-xl p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:border-green-200">
                        <h4 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center">
                            <MapPin className="h-4 w-4 text-green-600" />
                          </div>
                          Destination
                        </h4>
                        <div className="space-y-3">
                          <div className="p-2 bg-gray-50 rounded-lg">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Region</p>
                            <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-green-600" />
                              {bookingDetails.toRegion}
                            </p>
                          </div>
                          {bookingDetails.toDistrict && (
                            <div className="p-2 bg-gray-50 rounded-lg">
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">District</p>
                              <p className="text-sm font-semibold text-gray-900">{bookingDetails.toDistrict}</p>
                            </div>
                          )}
                          {bookingDetails.toLocation && (
                            <div className="p-2 bg-gray-50 rounded-lg">
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Location</p>
                              <p className="text-sm font-semibold text-gray-900">{bookingDetails.toLocation}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Dates - Enhanced */}
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-5 shadow-sm">
                      <h4 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-amber-500 flex items-center justify-center">
                          <Calendar className="h-4 w-4 text-white" />
                        </div>
                        Travel Dates
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white/80 rounded-lg p-4 border border-amber-100">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Check-In</p>
                          <p className="text-base font-bold text-gray-900">
                            {bookingDetails.checkIn 
                              ? new Date(bookingDetails.checkIn).toLocaleDateString('en-US', { 
                                  weekday: 'long', 
                                  year: 'numeric', 
                                  month: 'long', 
                                  day: 'numeric' 
                                })
                              : <span className="text-amber-600 italic">Flexible</span>}
                          </p>
                        </div>
                        <div className="bg-white/80 rounded-lg p-4 border border-amber-100">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Check-Out</p>
                          <p className="text-base font-bold text-gray-900">
                            {bookingDetails.checkOut 
                              ? new Date(bookingDetails.checkOut).toLocaleDateString('en-US', { 
                                  weekday: 'long', 
                                  year: 'numeric', 
                                  month: 'long', 
                                  day: 'numeric' 
                                })
                              : <span className="text-amber-600 italic">Flexible</span>}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Arrangements - Enhanced */}
                    {(bookingDetails.arrPickup || bookingDetails.arrTransport || bookingDetails.arrMeals || bookingDetails.arrGuide || bookingDetails.arrEquipment) && (
                      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl p-5 shadow-sm">
                        <h4 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-indigo-500 flex items-center justify-center">
                            <FileText className="h-4 w-4 text-white" />
                          </div>
                          Additional Arrangements
                        </h4>
                        <div className="flex flex-wrap gap-2 mb-4">
                          {bookingDetails.arrPickup && (
                            <span className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg font-semibold shadow-sm flex items-center gap-2">
                              <Truck className="h-4 w-4" />
                              Pickup
                            </span>
                          )}
                          {bookingDetails.arrTransport && (
                            <span className="px-4 py-2 text-sm bg-green-500 text-white rounded-lg font-semibold shadow-sm flex items-center gap-2">
                              <Bus className="h-4 w-4" />
                              Transport
                            </span>
                          )}
                          {bookingDetails.arrMeals && (
                            <span className="px-4 py-2 text-sm bg-purple-500 text-white rounded-lg font-semibold shadow-sm flex items-center gap-2">
                              <Coffee className="h-4 w-4" />
                              Meals
                            </span>
                          )}
                          {bookingDetails.arrGuide && (
                            <span className="px-4 py-2 text-sm bg-amber-500 text-white rounded-lg font-semibold shadow-sm flex items-center gap-2">
                              <User className="h-4 w-4" />
                              Guide
                            </span>
                          )}
                          {bookingDetails.arrEquipment && (
                            <span className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg font-semibold shadow-sm flex items-center gap-2">
                              <Wrench className="h-4 w-4" />
                              Equipment
                            </span>
                          )}
                        </div>
                        <div className="space-y-3">
                          {(bookingDetails as any).pickupLocation && (
                            <div className="bg-white/80 rounded-lg p-3 border border-indigo-100">
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Pickup Location</p>
                              <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-indigo-600" />
                                {(bookingDetails as any).pickupLocation}
                              </p>
                            </div>
                          )}
                          {(bookingDetails as any).pickupTime && (
                            <div className="bg-white/80 rounded-lg p-3 border border-indigo-100">
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Pickup Time</p>
                              <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                <Clock className="h-4 w-4 text-indigo-600" />
                                {(bookingDetails as any).pickupTime}
                              </p>
                            </div>
                          )}
                          {(bookingDetails as any).arrangementNotes && (
                            <div className="bg-white/80 rounded-lg p-4 border border-indigo-100">
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Arrangement Notes</p>
                              <p className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">{(bookingDetails as any).arrangementNotes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Passengers List - Collapsible */}
                    {passengers.length > 0 && (
                      <div className="border border-gray-200 rounded-lg bg-white overflow-hidden transition-all duration-200">
                        <button
                          onClick={() => setShowPassengers(!showPassengers)}
                          className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors duration-200"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-teal-500 flex items-center justify-center">
                              <Users className="h-4 w-4 text-white" />
                            </div>
                            <div className="text-left">
                              <h4 className="text-sm font-medium text-gray-900">Passengers</h4>
                              <p className="text-xs text-gray-600 mt-0.5">{passengers.length} passenger{passengers.length !== 1 ? 's' : ''} registered</p>
                            </div>
                          </div>
                          <div className="transition-transform duration-200" style={{ transform: showPassengers ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                            <ChevronDown className="h-4 w-4 text-gray-600" />
                          </div>
                        </button>
                        <div 
                          className={`overflow-hidden transition-all duration-300 ease-in-out ${
                            showPassengers ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                          }`}
                        >
                          <div className="p-4 pt-0">
                            {loadingPassengers ? (
                              <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 gap-2">
                                {passengers.map((passenger) => (
                                  <div
                                    key={passenger.id}
                                    className="bg-gray-50 rounded-lg border border-gray-200 p-2.5 flex items-start gap-2.5 transition-shadow duration-200 hover:shadow-sm"
                                  >
                                    <div className="h-8 w-8 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                                      <User className="h-3.5 w-3.5 text-teal-600" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="text-sm font-medium text-gray-900">
                                        {passenger.firstName} {passenger.lastName}
                                      </div>
                                      <div className="flex flex-col gap-1 mt-1">
                                        {passenger.nationality && (
                                          <div className="flex items-center gap-1 text-xs text-gray-600">
                                            <Globe className="h-3 w-3" />
                                            {passenger.nationality}
                                          </div>
                                        )}
                                        {passenger.phone && (
                                          <div className="flex items-center gap-1 text-xs text-gray-600">
                                            <Phone className="h-3 w-3" />
                                            <a href={`tel:${passenger.phone}`} className="hover:text-teal-600 transition-colors">
                                              {passenger.phone}
                                            </a>
                                          </div>
                                        )}
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

                    {/* Additional Notes - Enhanced */}
                    {(bookingDetails as any).notes && (
                      <div className="bg-gradient-to-br from-slate-50 to-gray-50 border-2 border-slate-200 rounded-xl p-5 shadow-sm">
                        <h4 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-slate-500 flex items-center justify-center">
                            <FileText className="h-4 w-4 text-white" />
                          </div>
                          Additional Notes
                        </h4>
                        <div className="bg-white/80 rounded-lg p-4 border border-slate-100">
                          <p className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">{(bookingDetails as any).notes}</p>
                        </div>
                      </div>
                    )}

                    {/* Conversation Messages Section - Collapsible */}
                    {(conversationMessages.length > 0 || loadingConversation) && (
                      <div className="bg-gradient-to-br from-slate-50 to-gray-50 border-2 border-slate-200 rounded-xl p-5 shadow-sm">
                        <button
                          onClick={() => setShowConversation(!showConversation)}
                          className="w-full flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200 hover:bg-slate-50 transition-all duration-200"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-blue-500 flex items-center justify-center">
                              <MessageSquare className="h-4 w-4 text-white" />
                            </div>
                            <div className="text-left">
                              <h4 className="text-sm font-medium text-gray-900">Conversation</h4>
                              <p className="text-xs text-gray-600 mt-0.5">{conversationMessages.length} message{conversationMessages.length !== 1 ? 's' : ''}</p>
                            </div>
                          </div>
                          <div className="transition-transform duration-200" style={{ transform: showConversation ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                            <ChevronDown className="h-4 w-4 text-gray-600" />
                          </div>
                        </button>
                        <div 
                          className={`overflow-hidden transition-all duration-300 ease-in-out ${
                            showConversation ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                          }`}
                        >
                          <div className="mt-4 space-y-3">
                            {loadingConversation ? (
                              <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-slate-600" />
                              </div>
                            ) : conversationMessages.length === 0 ? (
                              <div className="text-center py-8">
                                <p className="text-sm text-gray-500">No messages yet.</p>
                              </div>
                            ) : (
                              conversationMessages.map((msg: any) => (
                                <div key={msg.id} className={`bg-white rounded-lg p-4 border border-slate-200 shadow-sm ${
                                  msg.senderRole === 'ADMIN' ? 'border-l-4 border-l-blue-500' : 'border-l-4 border-l-green-500'
                                }`}>
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded ${
                                          msg.senderRole === 'ADMIN' 
                                            ? 'bg-blue-100 text-blue-700' 
                                            : 'bg-green-100 text-green-700'
                                        }`}>
                                          {msg.senderRole === 'ADMIN' ? 'Admin' : 'Customer'}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                          {msg.senderName}
                                        </span>
                                        {msg.messageType && msg.messageType !== 'General' && (
                                          <span className="text-xs text-gray-400">
                                            • {msg.messageType}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{msg.message}</p>
                                    </div>
                                    <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                                      {msg.formattedDate}
                                    </span>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Suggestions & Recommendations - Independent Cards */}
                    {auditHistory.filter((a: any) => a.action === 'SUGGESTIONS_PROVIDED' && a.adminSuggestions).length > 0 && (
                      <div className="bg-gradient-to-br from-slate-50 to-gray-50 border-2 border-slate-200 rounded-xl p-5 shadow-sm">
                        <h4 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-[#02665e] flex items-center justify-center">
                            <Sparkles className="h-4 w-4 text-white" />
                          </div>
                          Recommendations & Suggestions
                        </h4>
                        <div className="space-y-4">
                          {auditHistory
                            .filter((a: any) => a.action === 'SUGGESTIONS_PROVIDED' && a.adminSuggestions)
                            .map((audit: any) => (
                              <div key={audit.id} className="space-y-4">
                                  {/* Pricing & Budget - Sidebar Style */}
                                  {audit.adminSuggestions.pricing && (() => {
                                    const formatted = formatAdminText(audit.adminSuggestions.pricing);
                                    return (
                                      <div className="bg-white rounded-2xl border-l-4 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden" style={{ borderLeftColor: '#02665e' }}>
                                        <div className="flex flex-col sm:flex-row">
                                          <div className="w-full sm:w-48 px-4 sm:px-5 py-4 sm:py-5 flex sm:flex-col items-center sm:items-start justify-center sm:justify-start gap-3" style={{ backgroundColor: '#02665e' }}>
                                            <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center">
                                              <DollarSign className="h-5 w-5" style={{ color: '#02665e' }} />
                                            </div>
                                            <div className="text-center sm:text-left">
                                              <h5 className="text-xs font-bold text-white uppercase tracking-wider mb-1">Pricing & Budget</h5>
                                              <div className="h-0.5 w-12 bg-white/30 mx-auto sm:mx-0"></div>
                                            </div>
                                          </div>
                                          <div className="flex-1 p-4 sm:p-5">
                                            {formatted ? (
                                              <div className="space-y-3">
                                                {formatted.map((item, idx) => {
                                                  if (item.type === 'heading') {
                                                    return (
                                                      <div key={idx} className="font-bold text-gray-900 text-sm sm:text-base mt-4 first:mt-0 flex items-center gap-2">
                                                        <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: '#02665e' }}></div>
                                                        {item.content}
                                                      </div>
                                                    );
                                                  } else if (item.type === 'discount') {
                                                    return (
                                                      <div key={idx} className="mt-4 pt-4 border-t-2 border-gray-200">
                                                        <div className="flex items-center gap-2.5 mb-3">
                                                          <div className="h-8 w-8 rounded-lg flex items-center justify-center shadow-sm" style={{ backgroundColor: '#02665e' }}>
                                                            <Gift className="h-4 w-4 text-white" />
                                                          </div>
                                                          <span className="font-bold text-gray-900 text-sm sm:text-base">{item.content}</span>
                                                        </div>
                                                      </div>
                                                    );
                                                  } else if (item.type === 'finalPrice') {
                                                    return (
                                                      <div key={idx} className="mt-3 p-3 sm:p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                                          <span className="font-semibold text-gray-700 text-sm sm:text-base">Final Price:</span>
                                                          <span className="font-bold text-lg sm:text-xl" style={{ color: '#02665e' }}>
                                                            {item.value ? `${item.value.replace(/,/g, ',')} TZS` : item.content.match(/(\d[\d,]*)\s*TZS/)?.[0] || item.content}
                                                          </span>
                                                        </div>
                                                      </div>
                                                    );
                                                  } else if (item.type === 'savings') {
                                                    return (
                                                      <div key={idx} className="mt-3 p-3 sm:p-4 bg-gray-100 rounded-lg border-2 border-gray-300 shadow-sm">
                                                        <div className="flex items-center gap-2.5">
                                                          <div className="h-8 w-8 rounded-lg flex items-center justify-center shadow-sm" style={{ backgroundColor: '#02665e' }}>
                                                            <Tag className="h-4 w-4 text-white" />
                                                          </div>
                                                          <div className="flex-1">
                                                            <span className="font-bold text-sm sm:text-base block" style={{ color: '#02665e' }}>
                                                              {item.content}
                                                            </span>
                                                          </div>
                                                        </div>
                                                      </div>
                                                    );
                                                  } else if (item.type === 'bullet') {
                                                    const isDiscountInfo = item.content.includes('Discount:') || item.content.includes('Original Price:') || item.content.includes('Discount Amount:');
                                                    const isPriceInfo = item.content.includes('Price per Night:') || item.content.includes('Total Nights:') || item.content.includes('Total Amount:');
                                                    
                                                    return (
                                                      <div key={idx} className={`flex items-start gap-3 text-sm sm:text-base ${isDiscountInfo ? 'text-gray-900 font-semibold' : isPriceInfo ? 'text-gray-800' : 'text-gray-700'}`}>
                                                        <span className="mt-1.5 flex-shrink-0 font-bold" style={{ color: '#02665e' }}>•</span>
                                                        <span className="flex-1 leading-relaxed">{item.content}</span>
                                                      </div>
                                                    );
                                                  } else {
                                                    return (
                                                      <div key={idx} className="text-sm sm:text-base text-gray-700 leading-relaxed">
                                                        {item.content}
                                                      </div>
                                                    );
                                                  }
                                                })}
                                              </div>
                                            ) : (
                                              <div className="text-sm sm:text-base text-gray-800 whitespace-pre-wrap leading-relaxed">
                                                {audit.adminSuggestions.pricing}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })()}

                                  {/* Accommodation Options - Top Bar Style */}
                                  {audit.adminSuggestions.accommodationOptions && (
                                    <div className="bg-white rounded-2xl border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
                                      <div className="border-b-2 px-4 sm:px-5 py-3.5 bg-gray-50" style={{ borderBottomColor: '#02665e' }}>
                                        <div className="flex items-center gap-3">
                                          <div className="h-10 w-10 rounded-xl border-2 bg-white flex items-center justify-center" style={{ borderColor: '#02665e' }}>
                                            <Building2 className="h-5 w-5" style={{ color: '#02665e' }} />
                                          </div>
                                          <div>
                                            <span className="text-sm sm:text-base font-bold text-gray-900 uppercase tracking-wider block">Accommodation Options</span>
                                            <div className="h-0.5 w-16 mt-1" style={{ backgroundColor: '#02665e' }}></div>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="p-4 sm:p-5">
                                        <div className="text-sm sm:text-base text-gray-800 whitespace-pre-wrap leading-relaxed">
                                          {audit.adminSuggestions.accommodationOptions}
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Recommendations - Icon Badge Style */}
                                  {audit.adminSuggestions.recommendations && (
                                    <div className="bg-white rounded-2xl border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
                                      <div className="p-4 sm:p-5">
                                        <div className="flex items-start gap-4 mb-4">
                                          <div className="h-14 w-14 rounded-2xl border-2 bg-gray-50 flex items-center justify-center flex-shrink-0" style={{ borderColor: '#02665e' }}>
                                            <Sparkles className="h-7 w-7" style={{ color: '#02665e' }} />
                                          </div>
                                          <div className="flex-1 pt-1">
                                            <h5 className="text-sm sm:text-base font-bold text-gray-900 uppercase tracking-wider mb-1">Recommendations</h5>
                                            <div className="h-1 w-20 rounded-full" style={{ backgroundColor: '#02665e' }}></div>
                                          </div>
                                        </div>
                                        <div className="text-sm sm:text-base text-gray-800 whitespace-pre-wrap leading-relaxed pl-0 sm:pl-18">
                                          {audit.adminSuggestions.recommendations}
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Next Steps - Bottom Accent Style */}
                                  {audit.adminSuggestions.nextSteps && (
                                    <div className="bg-white rounded-2xl border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
                                      <div className="p-4 sm:p-5 pb-6">
                                        <div className="flex items-center gap-3 mb-4">
                                          <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#02665e' }}>
                                            <ArrowRight className="h-5 w-5 text-white" />
                                          </div>
                                          <div>
                                            <h5 className="text-sm sm:text-base font-bold text-gray-900 uppercase tracking-wider">Next Steps</h5>
                                            <div className="flex items-center gap-1 mt-1">
                                              <div className="h-1 w-8 rounded-full" style={{ backgroundColor: '#02665e' }}></div>
                                              <div className="h-1 w-1 bg-gray-400 rounded-full"></div>
                                              <div className="h-1 w-1 bg-gray-400 rounded-full"></div>
                                            </div>
                                          </div>
                                        </div>
                                        <div className="text-sm sm:text-base text-gray-800 whitespace-pre-wrap leading-relaxed">
                                          {audit.adminSuggestions.nextSteps}
                                        </div>
                                      </div>
                                      <div className="h-1" style={{ backgroundColor: '#02665e' }}></div>
                                    </div>
                                  )}
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Other Audit History (Status Changes, etc.) */}
                    {loadingAuditHistory ? (
                      <div className="bg-gradient-to-br from-slate-50 to-gray-50 border-2 border-slate-200 rounded-xl p-5 shadow-sm">
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 text-slate-600 animate-spin" />
                          <span className="ml-2 text-sm text-gray-600">Loading audit history...</span>
                        </div>
                      </div>
                    ) : auditHistory.filter((a: any) => a.action !== 'SUGGESTIONS_PROVIDED').length > 0 && (
                      <div className="bg-gradient-to-br from-slate-50 to-gray-50 border-2 border-slate-200 rounded-xl p-5 shadow-sm">
                        <h4 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-slate-500 flex items-center justify-center">
                            <FileText className="h-4 w-4 text-white" />
                          </div>
                          Audit History
                        </h4>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {auditHistory
                            .filter((a: any) => a.action !== 'SUGGESTIONS_PROVIDED')
                            .map((audit: any) => (
                              <div key={audit.id} className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-700 rounded">
                                        {audit.action.replace(/_/g, " ")}
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        by {audit.admin?.name || `Admin #${audit.adminId}`}
                                      </span>
                                    </div>
                                    {audit.description && (
                                      <p className="text-sm text-gray-700 mt-2">{audit.description}</p>
                                    )}
                                  </div>
                                  <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                                    {new Date(audit.createdAt).toLocaleString()}
                                  </span>
                                </div>
                                {audit.metadata && Object.keys(audit.metadata).length > 0 && (
                                  <div className="mt-2 pt-2 border-t border-slate-100">
                                    <details className="text-xs">
                                      <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                                        View Details
                                      </summary>
                                      <pre className="mt-2 p-2 bg-slate-50 rounded text-xs overflow-x-auto">
                                        {JSON.stringify(audit.metadata, null, 2)}
                                      </pre>
                                    </details>
                                  </div>
                                )}
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Admin Actions Section */}
                    {bookingDetails.status !== "COMPLETED" && bookingDetails.status !== "CANCELED" && (
                      <div className="space-y-6 pt-6 border-t-2 border-gray-200">
                        {/* Direct Contact Section */}
                        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-5 shadow-sm">
                          <h4 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-blue-500 flex items-center justify-center">
                              <MessageSquare className="h-4 w-4 text-white" />
                            </div>
                            Direct Contact with Customer
                          </h4>
                          
                          {/* Quick Message */}
                          <div className="bg-white/80 rounded-lg p-4 border border-blue-100">
                            <div className="flex items-center justify-between mb-2">
                              <label className="block text-xs font-medium text-gray-600">
                                Send Quick Message
                              </label>
                              <div className="flex gap-1 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => handleFillTemplate("reviewing")}
                                  className="px-2 py-1 text-xs bg-purple-50 text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
                                  title="Auto-fill reviewing message"
                                >
                                  Reviewing
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleFillTemplate("processing")}
                                  className="px-2 py-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                                  title="Auto-fill processing message"
                                >
                                  Processing
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleFillTemplate("propertiesRecommended")}
                                  className="px-2 py-1 text-xs bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                                  title="Auto-fill properties recommended message"
                                >
                                  Properties Ready
                                </button>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <textarea
                                value={quickMessage}
                                onChange={(e) => setQuickMessage(e.target.value)}
                                placeholder="Type a message to the customer... or click a template above to auto-fill"
                                rows={4}
                                aria-label="Message to customer"
                                title="Type a message to the customer"
                                className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition-all resize-none"
                              />
                              <button
                                onClick={handleSendQuickMessage}
                                disabled={sendingMessage || !quickMessage.trim()}
                                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all h-fit"
                              >
                                {sendingMessage ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Send className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Contact Information */}
                          {bookingDetails.user && (
                            <div className="mt-4 grid grid-cols-2 gap-3">
                              <a
                                href={`mailto:${bookingDetails.user.email}?subject=Group Stay Booking #${bookingDetails.id}`}
                                className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-blue-200 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 ease-in-out no-underline"
                              >
                                <Mail className="h-4 w-4 text-blue-600" />
                                <span className="text-sm font-medium text-gray-900">Email Customer</span>
                              </a>
                              {bookingDetails.user.phone && (
                                <a
                                  href={`tel:${bookingDetails.user.phone}`}
                                  className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-blue-200 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 ease-in-out no-underline"
                                >
                                  <Phone className="h-4 w-4 text-blue-600" />
                                  <span className="text-sm font-medium text-gray-900">Call Customer</span>
                                </a>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Property Recommendations Section */}
                        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border-2 border-indigo-200 rounded-xl p-5 shadow-sm">
                          <h4 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-indigo-500 flex items-center justify-center">
                              <Building2 className="h-4 w-4 text-white" />
                            </div>
                            Property Recommendations
                          </h4>
                          
                          {recommendedPropertyIds.length > 0 ? (
                            <div className="bg-white/80 rounded-lg p-4 border border-indigo-100 mb-4">
                              <p className="text-sm font-medium text-gray-700 mb-2">
                                {recommendedPropertyIds.length} propert{recommendedPropertyIds.length > 1 ? 'ies' : 'y'} recommended
                              </p>
                              <p className="text-xs text-gray-500">
                                Customer has been notified and can view the recommended properties.
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {!showPropertySearch ? (
                                <button
                                  onClick={handleSearchProperties}
                                  disabled={propertySearchLoading}
                                  className="w-full px-4 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-sm"
                                >
                                  {propertySearchLoading ? (
                                    <>
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                      Searching...
                                    </>
                                  ) : (
                                    <>
                                      <Search className="h-4 w-4" />
                                      Search Matching Properties
                                    </>
                                  )}
                                </button>
                              ) : (
                                <div className="space-y-4">
                                  {/* Selected Properties */}
                                  {selectedProperties.length > 0 && (
                                    <div className="bg-white/80 rounded-lg p-4 border border-indigo-100">
                                      <p className="text-xs font-semibold text-gray-700 mb-3">
                                        Selected Properties ({selectedProperties.length}/2)
                                      </p>
                                      <div className="space-y-2">
                                        {selectedProperties.map((prop) => (
                                          <div key={prop.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                                            <div className="flex-1">
                                              <p className="text-sm font-medium text-gray-900">{prop.title}</p>
                                              <p className="text-xs text-gray-500">{prop.regionName} {prop.district ? `• ${prop.district}` : ''}</p>
                                            </div>
                                            <button
                                              onClick={() => handleRemoveProperty(prop.id)}
                                              aria-label="Remove property"
                                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                      <button
                                        onClick={handleAttachProperties}
                                        disabled={attachingProperties || selectedProperties.length === 0}
                                        className="w-full mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
                                      >
                                        {attachingProperties ? (
                                          <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Attaching...
                                          </>
                                        ) : (
                                          <>
                                            <CheckCircle className="h-4 w-4" />
                                            Attach {selectedProperties.length} Propert{selectedProperties.length > 1 ? 'ies' : 'y'} to Booking
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  )}

                                  {/* Search Results */}
                                  <div className="bg-white/80 rounded-lg p-4 border border-indigo-100 max-h-96 overflow-y-auto">
                                    <div className="flex items-center justify-between mb-3">
                                      <p className="text-xs font-semibold text-gray-700">
                                        Matching Properties ({propertySearchResults.length})
                                      </p>
                                      <button
                                        onClick={() => {
                                          setShowPropertySearch(false);
                                          setPropertySearchResults([]);
                                        }}
                                        className="text-xs text-gray-500 hover:text-gray-700"
                                      >
                                        Close
                                      </button>
                                    </div>
                                    {propertySearchResults.length === 0 ? (
                                      <p className="text-sm text-gray-500 text-center py-4">
                                        No matching properties found. Try adjusting the filters.
                                      </p>
                                    ) : (
                                      <div className="space-y-3">
                                        {propertySearchResults.map((prop) => {
                                          const isSelected = selectedProperties.find(p => p.id === prop.id);
                                          const canAdd = selectedProperties.length < 2;
                                          
                                          return (
                                            <div key={prop.id} className="flex gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-indigo-300 transition-colors">
                                              {prop.imageUrl && (
                                                <Image
                                                  src={prop.imageUrl}
                                                  alt={prop.title}
                                                  width={80}
                                                  height={80}
                                                  className="w-20 h-20 object-cover rounded-lg"
                                                />
                                              )}
                                              <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">{prop.title}</p>
                                                <p className="text-xs text-gray-500 mt-1">
                                                  {prop.type} • {prop.regionName} {prop.district ? `• ${prop.district}` : ''}
                                                </p>
                                                {prop.basePrice && (
                                                  <p className="text-xs font-semibold text-indigo-600 mt-1">
                                                    {prop.currency} {Number(prop.basePrice).toLocaleString()}/night
                                                  </p>
                                                )}
                                              </div>
                                              <button
                                                onClick={() => isSelected ? handleRemoveProperty(prop.id) : handleAddProperty(prop)}
                                                disabled={!isSelected && !canAdd}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                                  isSelected
                                                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                                    : canAdd
                                                    ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                }`}
                                              >
                                                {isSelected ? (
                                                  <>
                                                    <X className="h-3 w-3 inline mr-1" />
                                                    Remove
                                                  </>
                                                ) : (
                                                  <>
                                                    <Plus className="h-3 w-3 inline mr-1" />
                                                    Add
                                                  </>
                                                )}
                                              </button>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Submitted Claims Review Section - Premium Admin Interface */}
                        {(bookingDetails as any).isOpenForClaims && (
                          <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 border-2 border-emerald-200 rounded-xl p-5 sm:p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                            <div className="flex items-center justify-between mb-5">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                                  <Gift className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                  <h4 className="text-lg font-bold text-gray-900">Submitted Claims & Offers</h4>
                                  <p className="text-xs text-gray-600 mt-0.5">Review and select top 3 recommendations for customer</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {shortlistClaimIds.length > 0 && (
                                  <button
                                    onClick={() => setShowShortlistOnly((v) => !v)}
                                    className="px-3 py-1.5 text-xs font-semibold bg-white/80 border border-emerald-200 rounded-lg hover:bg-white hover:border-emerald-300 transition-all text-gray-700"
                                    title={showShortlistOnly ? "Showing auto-picked shortlist" : "Showing all claims"}
                                  >
                                    {showShortlistOnly ? "⭐ Shortlist" : "📦 All"}
                                  </button>
                                )}
                                <button
                                  onClick={handleStartClaimsReview}
                                  disabled={startingClaimsReview}
                                  className="px-3 py-1.5 text-xs font-semibold bg-white/80 border border-emerald-200 rounded-lg hover:bg-white hover:border-emerald-300 transition-all text-gray-700 disabled:opacity-60 disabled:cursor-not-allowed"
                                  title="Mark all pending claims as REVIEWING"
                                >
                                  {startingClaimsReview ? "Starting..." : "Mark Reviewing"}
                                </button>
                                <button
                                  onClick={() => setComparisonView(comparisonView === "grid" ? "list" : "grid")}
                                  className="px-3 py-1.5 text-xs font-semibold bg-white/80 border border-emerald-200 rounded-lg hover:bg-white hover:border-emerald-300 transition-all text-gray-700"
                                  title={`Switch to ${comparisonView === "grid" ? "list" : "grid"} view`}
                                >
                                  {comparisonView === "grid" ? "📋 List" : "🔲 Grid"}
                                </button>
                              </div>
                            </div>

                            {/* Claims Summary Stats */}
                            {claimsData && claimsData.summary && (
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                                <div className="bg-white/90 rounded-lg p-3 border border-emerald-100 shadow-sm">
                                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total</div>
                                  <div className="text-xl font-bold text-emerald-700 mt-1">{claimsData.summary.total}</div>
                                </div>
                                <div className="bg-white/90 rounded-lg p-3 border border-blue-100 shadow-sm">
                                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Pending</div>
                                  <div className="text-xl font-bold text-blue-700 mt-1">{claimsData.summary.pending}</div>
                                </div>
                                <div className="bg-white/90 rounded-lg p-3 border border-green-100 shadow-sm">
                                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Recommended</div>
                                  <div className="text-xl font-bold text-green-700 mt-1">{recommendedClaimIds.length}</div>
                                </div>
                                <div className="bg-white/90 rounded-lg p-3 border border-gray-100 shadow-sm">
                                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Selected</div>
                                  <div className="text-xl font-bold text-teal-700 mt-1">{selectedClaimIds.length}/3</div>
                                </div>
                              </div>
                            )}

                            {/* Claims Loading State */}
                            {claimsLoading ? (
                              <div className="bg-white/90 rounded-xl p-8 border border-emerald-200 text-center">
                                <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mx-auto mb-3" />
                                <p className="text-sm text-gray-600">Loading submitted claims...</p>
                              </div>
                            ) : claimsData && claimsData.claims && claimsData.claims.length > 0 ? (
                              <>
                                {/* Filter Tabs */}
                                <div className="flex items-center gap-2 mb-4 flex-wrap">
                                  <button
                                    onClick={() => setClaimsFilter("all")}
                                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                                      claimsFilter === "all"
                                        ? "bg-emerald-600 text-white shadow-md"
                                        : "bg-white/80 text-gray-700 border border-emerald-200 hover:bg-emerald-50"
                                    }`}
                                  >
                                    All ({claimsData.summary?.total || 0})
                                  </button>
                                  <button
                                    onClick={() => setClaimsFilter("pending")}
                                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                                      claimsFilter === "pending"
                                        ? "bg-blue-600 text-white shadow-md"
                                        : "bg-white/80 text-gray-700 border border-blue-200 hover:bg-blue-50"
                                    }`}
                                  >
                                    Pending ({claimsData.summary?.pending || 0})
                                  </button>
                                  <button
                                    onClick={() => setClaimsFilter("accepted")}
                                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                                      claimsFilter === "accepted"
                                        ? "bg-green-600 text-white shadow-md"
                                        : "bg-white/80 text-gray-700 border border-green-200 hover:bg-green-50"
                                    }`}
                                  >
                                    Recommended ({recommendedClaimIds.length})
                                  </button>
                                  <button
                                    onClick={() => setClaimsFilter("rejected")}
                                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                                      claimsFilter === "rejected"
                                        ? "bg-red-600 text-white shadow-md"
                                        : "bg-white/80 text-gray-700 border border-red-200 hover:bg-red-50"
                                    }`}
                                  >
                                    Rejected ({claimsData.summary?.rejected || 0})
                                  </button>
                                </div>

                                {/* Claims Display - Grid or List View */}
                                <div className={`${comparisonView === "grid" ? "grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4" : "space-y-4"} mb-5`}>
                                  {claimsData.claims
                                    .filter((claim: any) => {
                                      if (showShortlistOnly && shortlistClaimIds.length > 0 && !shortlistClaimIds.includes(claim.id)) {
                                        return false;
                                      }
                                      if (claimsFilter === "all") return true;
                                      if (claimsFilter === "pending") return ["PENDING", "REVIEWING"].includes(claim.status);
                                      if (claimsFilter === "accepted") return recommendedClaimIds.includes(claim.id);
                                      if (claimsFilter === "rejected") return claim.status === "REJECTED";
                                      return true;
                                    })
                                    .map((claim: any) => {
                                      const isSelected = selectedClaimIds.includes(claim.id);
                                      const canSelect = selectedClaimIds.length < 3 && ["PENDING", "REVIEWING"].includes(claim.status);
                                      const isRecommended = recommendedClaimIds.includes(claim.id);
                                      const isShortlistHigh = claimsData?.shortlist?.high?.id === claim.id;
                                      const isShortlistMid = claimsData?.shortlist?.mid?.id === claim.id;
                                      const isShortlistLow = claimsData?.shortlist?.low?.id === claim.id;

                                      return (
                                        <div
                                          key={claim.id}
                                          className={`bg-white rounded-xl border-2 p-5 shadow-md hover:shadow-xl transition-all duration-300 ${
                                            isSelected
                                              ? "border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-200"
                                              : isRecommended
                                              ? "border-green-400 bg-green-50/30"
                                              : "border-gray-200 hover:border-emerald-300"
                                          }`}
                                        >
                                          {/* Claim Header */}
                                          <div className="flex items-start justify-between mb-4">
                                            <div className="flex-1">
                                              <div className="flex items-center gap-2 mb-2">
                                                {isSelected && (
                                                  <div className="h-6 w-6 rounded-full bg-emerald-600 flex items-center justify-center">
                                                    <CheckCircle2 className="h-4 w-4 text-white" />
                                                  </div>
                                                )}
                                                {isRecommended && !isSelected && (
                                                  <div className="h-6 w-6 rounded-full bg-green-600 flex items-center justify-center">
                                                    <Sparkles className="h-4 w-4 text-white" />
                                                  </div>
                                                )}
                                                <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${
                                                  claim.status === "PENDING" ? "bg-blue-100 text-blue-700" :
                                                  claim.status === "REVIEWING" ? "bg-purple-100 text-purple-700" :
                                                  claim.status === "ACCEPTED" ? "bg-green-100 text-green-700" :
                                                  claim.status === "REJECTED" ? "bg-red-100 text-red-700" :
                                                  "bg-gray-100 text-gray-700"
                                                }`}>
                                                  {claim.status}
                                                </span>
                                                {(isShortlistHigh || isShortlistMid || isShortlistLow) && (
                                                  <span
                                                    className={`px-2 py-1 text-[10px] font-bold rounded-lg border ${
                                                      isShortlistHigh
                                                        ? "bg-amber-50 text-amber-800 border-amber-200"
                                                        : isShortlistMid
                                                        ? "bg-slate-50 text-slate-800 border-slate-200"
                                                        : "bg-indigo-50 text-indigo-800 border-indigo-200"
                                                    }`}
                                                    title="Auto-picked shortlist"
                                                  >
                                                    {isShortlistHigh ? "HIGH" : isShortlistMid ? "MID" : "LOW"}
                                                  </span>
                                                )}
                                              </div>
                                              {claim.property && (
                                                <h5 className="text-sm font-bold text-gray-900 leading-tight mb-1">
                                                  {claim.property.title}
                                                </h5>
                                              )}
                                              {claim.owner && (
                                                <p className="text-xs text-gray-600">
                                                  Owner: <span className="font-semibold">{claim.owner.name}</span>
                                                </p>
                                              )}
                                            </div>
                                          </div>

                                          {/* Property Image */}
                                          {claim.property?.primaryImage && (
                                            <div className="mb-4 rounded-lg overflow-hidden border border-gray-200">
                                              <Image
                                                src={claim.property.primaryImage}
                                                alt={claim.property.title || "Property"}
                                                width={300}
                                                height={200}
                                                className="w-full h-32 object-cover"
                                              />
                                            </div>
                                          )}

                                          {/* Pricing Details */}
                                          <div className="space-y-2 mb-4">
                                            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-3 border border-emerald-200">
                                              <div className="flex items-baseline justify-between mb-1">
                                                <span className="text-xs font-medium text-gray-600">Price/Night</span>
                                                <span className="text-lg font-bold text-emerald-700">
                                                  {claim.currency} {claim.offeredPricePerNight.toLocaleString()}
                                                </span>
                                              </div>
                                              {claim.discountPercent && claim.discountPercent > 0 && (
                                                <div className="flex items-center justify-between text-xs">
                                                  <span className="text-gray-600">Discount</span>
                                                  <span className="font-semibold text-green-600">
                                                    -{claim.discountPercent}%
                                                  </span>
                                                </div>
                                              )}
                                              {claim.savingsAmount && (
                                                <div className="flex items-center justify-between text-xs mt-1 pt-1 border-t border-emerald-200">
                                                  <span className="text-gray-600">You Save</span>
                                                  <span className="font-bold text-green-700">
                                                    {claim.currency} {claim.savingsAmount.toLocaleString()}
                                                  </span>
                                                </div>
                                              )}
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                              <div className="bg-gray-50 rounded-lg p-2">
                                                <div className="text-gray-500">Total Amount</div>
                                                <div className="font-bold text-gray-900 mt-0.5">
                                                  {claim.currency} {claim.totalAmount.toLocaleString()}
                                                </div>
                                              </div>
                                              {claim.pricePerGuest && (
                                                <div className="bg-gray-50 rounded-lg p-2">
                                                  <div className="text-gray-500">Per Guest</div>
                                                  <div className="font-bold text-gray-900 mt-0.5">
                                                    {claim.currency} {claim.pricePerGuest.toFixed(0)}
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          </div>

                                          {/* Special Offers */}
                                          {claim.specialOffers && (
                                            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                              <div className="flex items-center gap-2 mb-1">
                                                <Tag className="h-3.5 w-3.5 text-amber-600" />
                                                <span className="text-xs font-semibold text-amber-800">Special Offers</span>
                                              </div>
                                              <p className="text-xs text-amber-900 leading-relaxed">{claim.specialOffers}</p>
                                            </div>
                                          )}

                                          {/* Notes */}
                                          {claim.notes && (
                                            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                              <div className="flex items-center gap-2 mb-1">
                                                <FileText className="h-3.5 w-3.5 text-blue-600" />
                                                <span className="text-xs font-semibold text-blue-800">Owner Notes</span>
                                              </div>
                                              <p className="text-xs text-blue-900 leading-relaxed">{claim.notes}</p>
                                            </div>
                                          )}

                                          {/* Location Info */}
                                          {claim.property && (
                                            <div className="mb-4 flex items-center gap-2 text-xs text-gray-600">
                                              <MapPin className="h-3.5 w-3.5" />
                                              <span className="truncate">
                                                {[claim.property.regionName, claim.property.district, claim.property.city].filter(Boolean).join(", ")}
                                              </span>
                                            </div>
                                          )}

                                          {/* Action Buttons */}
                                          <div className="flex flex-col gap-2 pt-3 border-t border-gray-200">
                                            {canSelect && (
                                              <button
                                                onClick={() => toggleClaimSelection(claim.id)}
                                                className={`w-full px-4 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                                                  isSelected
                                                    ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-md"
                                                    : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-300"
                                                }`}
                                              >
                                                {isSelected ? (
                                                  <>
                                                    <CheckCircle2 className="h-4 w-4 inline mr-1.5" />
                                                    Selected for Recommendation
                                                  </>
                                                ) : (
                                                  <>
                                                    <Plus className="h-4 w-4 inline mr-1.5" />
                                                    Select for Recommendation
                                                  </>
                                                )}
                                              </button>
                                            )}
                                            {isRecommended && (
                                              <div className="text-center py-2 px-3 bg-green-100 border border-green-300 rounded-lg">
                                                <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-green-700">
                                                  <Sparkles className="h-3.5 w-3.5" />
                                                  Already Recommended
                                                </div>
                                              </div>
                                            )}
                                            {["PENDING", "REVIEWING"].includes(claim.status) && !canSelect && !isSelected && (
                                              <div className="text-center py-2 px-3 bg-amber-100 border border-amber-300 rounded-lg">
                                                <p className="text-xs font-semibold text-amber-700">
                                                  Max 3 selections reached
                                                </p>
                                              </div>
                                            )}
                                            {["PENDING", "REVIEWING"].includes(claim.status) && (
                                              <div className="grid grid-cols-2 gap-2">
                                                <button
                                                  onClick={() => handleUpdateClaimStatus(claim.id, "REJECTED")}
                                                  className="px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-all"
                                                >
                                                  Reject
                                                </button>
                                                <button
                                                  onClick={() => {
                                                    if (bookingDetails && claim.property) {
                                                      window.open(`/admin/properties/${claim.propertyId}`, "_blank");
                                                    }
                                                  }}
                                                  className="px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-all"
                                                >
                                                  View Property
                                                </button>
                                              </div>
                                            )}
                                          </div>

                                          {/* Submitted Time */}
                                          <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500 text-center">
                                            Submitted {new Date(claim.createdAt).toLocaleDateString("en-US", {
                                              month: "short",
                                              day: "numeric",
                                              hour: "2-digit",
                                              minute: "2-digit",
                                            })}
                                          </div>
                                        </div>
                                      );
                                    })}
                                </div>

                                {/* Selection Summary & Submit */}
                                {selectedClaimIds.length > 0 && (
                                  <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-5 border-2 border-emerald-400 shadow-xl">
                                    <div className="flex items-center justify-between mb-4">
                                      <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                          <Sparkles className="h-5 w-5 text-white" />
                                        </div>
                                        <div>
                                          <h5 className="text-base font-bold text-white">
                                            {selectedClaimIds.length} Claim{selectedClaimIds.length > 1 ? 's' : ''} Selected
                                          </h5>
                                          <p className="text-xs text-emerald-100 mt-0.5">
                                            Ready to recommend to customer
                                          </p>
                                        </div>
                                      </div>
                                      <button
                                        onClick={handleRecommendClaims}
                                        disabled={recommendingClaims || selectedClaimIds.length === 0}
                                        className="px-6 py-3 bg-white text-emerald-700 rounded-xl text-sm font-bold hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all shadow-lg hover:shadow-xl"
                                      >
                                        {recommendingClaims ? (
                                          <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Recommending...
                                          </>
                                        ) : (
                                          <>
                                            <CheckCircle2 className="h-4 w-4" />
                                            Recommend {selectedClaimIds.length} to Customer
                                          </>
                                        )}
                                      </button>
                                    </div>
                                    <div className="text-xs text-emerald-100 bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                                      💡 <strong>Premium Service:</strong> These recommendations will be presented to the customer for their final selection. Choose the best offers that provide value and meet their requirements.
                                    </div>
                                  </div>
                                )}

                                {/* Empty State for Filter */}
                                {claimsData.claims.filter((c: any) => {
                                  if (claimsFilter === "all") return true;
                                  return c.status === claimsFilter.toUpperCase();
                                }).length === 0 && (
                                  <div className="bg-white/90 rounded-xl p-8 border border-emerald-200 text-center">
                                    <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                                    <p className="text-sm text-gray-600 font-medium">
                                      No {claimsFilter === "all" ? "" : claimsFilter} claims found
                                    </p>
                                  </div>
                                )}
                              </>
                            ) : claimsData && claimsData.claims && claimsData.claims.length === 0 ? (
                              <div className="bg-white/90 rounded-xl p-8 border border-emerald-200 text-center">
                                <Gift className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                                <p className="text-sm text-gray-600 font-medium mb-1">No Claims Submitted Yet</p>
                                <p className="text-xs text-gray-500">
                                  Owners can submit competitive offers when this booking is open for claims.
                                </p>
                              </div>
                            ) : (
                              <div className="bg-white/90 rounded-xl p-6 border border-emerald-200 text-center">
                                <button
                                  onClick={() => bookingDetails && loadClaims(bookingDetails.id)}
                                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-all"
                                >
                                  Load Submitted Claims
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Admin Suggestions Section */}
                        <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-5 shadow-sm">
                          <h4 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-purple-500 flex items-center justify-center">
                              <Edit className="h-4 w-4 text-white" />
                            </div>
                            Provide Suggestions & Recommendations
                          </h4>
                          
                          <div className="space-y-4">
                            <div className="bg-white/80 rounded-lg p-4 border border-purple-100">
                              <label className="block text-xs font-semibold text-gray-700 mb-2">
                                Accommodation Options <span className="text-red-500">*</span>
                              </label>
                              <textarea
                                value={adminSuggestions.accommodationOptions}
                                onChange={(e) => setAdminSuggestions({ ...adminSuggestions, accommodationOptions: e.target.value })}
                                placeholder="Suggest suitable accommodation options based on group size and requirements..."
                                rows={4}
                                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-sm transition-all resize-none"
                              />
                            </div>

                            <div className="bg-white/80 rounded-lg p-4 border border-purple-100">
                              <label className="block text-xs font-semibold text-gray-700 mb-3">
                                Pricing & Budget
                              </label>
                              <div className="space-y-3">
                                {/* Currency selector - full width on mobile */}
                                <div className="sm:hidden">
                                  <label className="block text-xs text-gray-600 mb-1.5">Currency</label>
                                  <select
                                    value={pricingDetails.currency}
                                    onChange={(e) => setPricingDetails({ ...pricingDetails, currency: e.target.value })}
                                    aria-label="Select currency"
                                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm font-medium bg-gray-50 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                                  >
                                    <option value="TZS">TZS</option>
                                    <option value="USD">USD</option>
                                    <option value="EUR">EUR</option>
                                  </select>
                                </div>
                                
                                {/* Headcount and Rooms - auto-filled from booking */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-xs text-gray-600 mb-1.5">Headcount</label>
                                    <div className="flex items-center gap-2">
                                      <span className="px-2.5 py-2 bg-gray-50 border-2 border-gray-200 rounded-lg text-xs font-medium text-gray-600 whitespace-nowrap">
                                        People
                                      </span>
                                      <input
                                        type="number"
                                        value={pricingDetails.headcount}
                                        readOnly
                                        aria-label="Headcount (read-only)"
                                        title="Headcount (read-only)"
                                        className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg bg-gray-50 text-sm transition-all cursor-not-allowed"
                                      />
                                    </div>
                                  </div>
                                  <div>
                                    <label className="block text-xs text-gray-600 mb-1.5">Rooms Needed</label>
                                    <div className="flex items-center gap-2">
                                      <span className="px-2.5 py-2 bg-gray-50 border-2 border-gray-200 rounded-lg text-xs font-medium text-gray-600 whitespace-nowrap">
                                        Rooms
                                      </span>
                                      <input
                                        type="number"
                                        value={pricingDetails.roomsNeeded}
                                        readOnly
                                        aria-label="Rooms needed (read-only)"
                                        title="Rooms needed (read-only)"
                                        className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg bg-gray-50 text-sm transition-all cursor-not-allowed"
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* Private Rooms - only shown if needsPrivateRoom is true */}
                                {(bookingDetails as any)?.needsPrivateRoom && (
                                  <div>
                                    <label className="block text-xs text-gray-600 mb-1.5">Private Rooms</label>
                                    <div className="flex items-center gap-2">
                                      <span className="px-2.5 py-2 bg-gray-50 border-2 border-gray-200 rounded-lg text-xs font-medium text-gray-600 whitespace-nowrap">
                                        Rooms
                                      </span>
                                      <input
                                        type="number"
                                        value={pricingDetails.privateRoomCount}
                                        readOnly
                                        aria-label="Private rooms count (read-only)"
                                        title="Private rooms count (read-only)"
                                        className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg bg-gray-50 text-sm transition-all cursor-not-allowed"
                                      />
                                    </div>
                                  </div>
                                )}

                                {/* Price per Night (per room) and Total Nights - responsive grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-xs text-gray-600 mb-1.5">Price per Night (per room)</label>
                                    <div className="flex items-center gap-2">
                                      <select
                                        value={pricingDetails.currency}
                                        onChange={(e) => setPricingDetails({ ...pricingDetails, currency: e.target.value })}
                                        aria-label="Select currency"
                                        className="hidden sm:block px-2.5 py-2 border-2 border-gray-200 rounded-lg text-xs font-medium bg-gray-50 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                                      >
                                        <option value="TZS">TZS</option>
                                        <option value="USD">USD</option>
                                        <option value="EUR">EUR</option>
                                      </select>
                                      <input
                                        type="number"
                                        value={pricingDetails.pricePerNight}
                                        onChange={(e) => {
                                          const value = e.target.value;
                                          setPricingDetails({ ...pricingDetails, pricePerNight: value });
                                          // Auto-calculate total: pricePerNight × roomsNeeded × totalNights
                                          if (pricingDetails.totalNights && pricingDetails.roomsNeeded && value) {
                                            const total = Number(value) * Number(pricingDetails.roomsNeeded) * Number(pricingDetails.totalNights);
                                            setPricingDetails(prev => ({ ...prev, totalAmount: total.toString() }));
                                          }
                                        }}
                                        placeholder="0.00"
                                        aria-label="Price per night per room"
                                        title="Price per night per room"
                                        className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-sm transition-all"
                                      />
                                    </div>
                                  </div>
                                  <div>
                                    <label className="block text-xs text-gray-600 mb-1.5">Total Nights</label>
                                    <div className="flex items-center gap-2">
                                      <span className="px-2.5 py-2 bg-gray-50 border-2 border-gray-200 rounded-lg text-xs font-medium text-gray-600 whitespace-nowrap">
                                        Nights
                                      </span>
                                      <input
                                        type="number"
                                        value={pricingDetails.totalNights}
                                        onChange={(e) => {
                                          const value = e.target.value;
                                          setPricingDetails({ ...pricingDetails, totalNights: value });
                                          // Auto-calculate total: pricePerNight × roomsNeeded × totalNights
                                          if (pricingDetails.pricePerNight && pricingDetails.roomsNeeded && value) {
                                            const total = Number(pricingDetails.pricePerNight) * Number(pricingDetails.roomsNeeded) * Number(value);
                                            setPricingDetails(prev => ({ ...prev, totalAmount: total.toString() }));
                                          }
                                        }}
                                        placeholder="0"
                                        min="1"
                                        aria-label="Total nights"
                                        title="Total nights"
                                        className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-sm transition-all"
                                      />
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Total Amount - full width */}
                                <div>
                                  <label className="block text-xs text-gray-600 mb-1.5">Total Amount</label>
                                  <div className="flex items-center gap-2">
                                    <span className="px-3 py-2 bg-purple-50 border-2 border-purple-200 rounded-lg text-xs font-semibold text-purple-700 whitespace-nowrap">
                                      {pricingDetails.currency}
                                    </span>
                                    <input
                                      type="number"
                                      value={pricingDetails.totalAmount}
                                      onChange={(e) => setPricingDetails({ ...pricingDetails, totalAmount: e.target.value })}
                                      placeholder="0.00"
                                      aria-label="Total amount"
                                      title="Total amount"
                                      className="flex-1 px-3 py-2 border-2 border-purple-200 bg-purple-50 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-sm font-semibold text-purple-900 transition-all"
                                    />
                                  </div>
                                </div>
                                
                                {/* Additional Notes - full width */}
                                <div>
                                  <label className="block text-xs text-gray-600 mb-1.5">Additional Notes</label>
                                  <textarea
                                    value={pricingDetails.notes}
                                    onChange={(e) => setPricingDetails({ ...pricingDetails, notes: e.target.value })}
                                    placeholder="Payment terms, cancellation policy, special offers, etc."
                                    rows={2}
                                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-sm transition-all resize-none"
                                  />
                                </div>
                                
                                {/* Discount Section */}
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                      <Tag className="h-4 w-4 text-purple-600" />
                                      <label className="text-xs font-semibold text-gray-700">Offer Discount</label>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setDiscountEnabled(!discountEnabled);
                                        if (discountEnabled) {
                                          // Reset discount when disabling
                                          setDiscountDetails({
                                            type: "percentage",
                                            value: "",
                                            criteria: "nights",
                                            minNights: "",
                                            minHeadcount: "",
                                          });
                                        }
                                      }}
                                      aria-label={discountEnabled ? "Disable discount" : "Enable discount"}
                                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                                        discountEnabled ? "bg-purple-600" : "bg-gray-300"
                                      }`}
                                    >
                                      <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                          discountEnabled ? "translate-x-6" : "translate-x-1"
                                        }`}
                                      />
                                    </button>
                                  </div>
                                  
                                  {discountEnabled && (
                                    <div className="space-y-3 p-3 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-lg">
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                          <label className="block text-xs text-gray-600 mb-1.5">Discount Type</label>
                                          <select
                                            value={discountDetails.type}
                                            onChange={(e) => setDiscountDetails({ ...discountDetails, type: e.target.value as "percentage" | "amount" })}
                                            aria-label="Select discount type"
                                            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm font-medium bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                                          >
                                            <option value="percentage">Percentage (%)</option>
                                            <option value="amount">Fixed Amount</option>
                                          </select>
                                        </div>
                                        <div>
                                          <label className="block text-xs text-gray-600 mb-1.5">
                                            Discount {discountDetails.type === "percentage" ? "Percentage" : "Amount"}
                                          </label>
                                          <div className="flex items-center gap-2">
                                            {discountDetails.type === "percentage" ? (
                                              <span className="px-2.5 py-2 bg-gray-50 border-2 border-gray-200 rounded-lg text-xs font-medium text-gray-600 whitespace-nowrap">
                                                %
                                              </span>
                                            ) : (
                                              <span className="px-2.5 py-2 bg-gray-50 border-2 border-gray-200 rounded-lg text-xs font-medium text-gray-600 whitespace-nowrap">
                                                {pricingDetails.currency}
                                              </span>
                                            )}
                                            <input
                                              type="number"
                                              value={discountDetails.value}
                                              onChange={(e) => setDiscountDetails({ ...discountDetails, value: e.target.value })}
                                              placeholder={discountDetails.type === "percentage" ? "0" : "0.00"}
                                              min="0"
                                              max={discountDetails.type === "percentage" ? "100" : undefined}
                                              aria-label={`Discount ${discountDetails.type === "percentage" ? "percentage" : "amount"}`}
                                              title={`Discount ${discountDetails.type === "percentage" ? "percentage" : "amount"}`}
                                              className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-sm transition-all"
                                            />
                                          </div>
                                        </div>
                                      </div>
                                      
                                      <div>
                                        <label className="block text-xs text-gray-600 mb-1.5">Discount Criteria (Optional)</label>
                                        <select
                                          value={discountDetails.criteria}
                                          onChange={(e) => setDiscountDetails({ ...discountDetails, criteria: e.target.value as "nights" | "headcount" | "both" })}
                                          aria-label="Select discount criteria"
                                          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm font-medium bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                                        >
                                          <option value="nights">Based on Total Nights</option>
                                          <option value="headcount">Based on Headcount</option>
                                          <option value="both">Both (Nights & Headcount)</option>
                                        </select>
                                      </div>
                                      
                                      {(discountDetails.criteria === "nights" || discountDetails.criteria === "both") && (
                                        <div>
                                          <label className="block text-xs text-gray-600 mb-1.5">Minimum Nights Required</label>
                                          <input
                                            type="number"
                                            value={discountDetails.minNights}
                                            onChange={(e) => setDiscountDetails({ ...discountDetails, minNights: e.target.value })}
                                            placeholder="e.g., 5 nights"
                                            min="1"
                                            aria-label="Minimum nights required for discount"
                                            title="Minimum nights required for discount"
                                            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-sm transition-all"
                                          />
                                        </div>
                                      )}
                                      
                                      {(discountDetails.criteria === "headcount" || discountDetails.criteria === "both") && (
                                        <div>
                                          <label className="block text-xs text-gray-600 mb-1.5">Minimum Headcount Required</label>
                                          <input
                                            type="number"
                                            value={discountDetails.minHeadcount}
                                            onChange={(e) => setDiscountDetails({ ...discountDetails, minHeadcount: e.target.value })}
                                            placeholder="e.g., 10 people"
                                            aria-label="Minimum headcount required for discount"
                                            title="Minimum headcount required for discount"
                                            min="1"
                                            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-sm transition-all"
                                          />
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                                
                                {/* Auto-generated pricing summary with discount */}
                                {(pricingDetails.pricePerNight || pricingDetails.totalAmount) && (
                                  <div className="mt-2 p-3 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg">
                                    <p className="text-xs font-semibold text-gray-700 mb-2">Pricing Summary:</p>
                                    <div className="text-xs text-gray-600 space-y-1.5">
                                      {pricingDetails.pricePerNight && pricingDetails.totalNights && pricingDetails.roomsNeeded && (
                                        <div>
                                          <p className="text-gray-700">
                                            {Number(pricingDetails.pricePerNight).toLocaleString()} {pricingDetails.currency} × {pricingDetails.roomsNeeded} room{pricingDetails.roomsNeeded !== "1" ? "s" : ""} × {pricingDetails.totalNights} night{pricingDetails.totalNights !== "1" ? "s" : ""}
                                          </p>
                                          <p className="font-semibold text-gray-900">
                                            Subtotal: {pricingDetails.totalAmount || (Number(pricingDetails.pricePerNight) * Number(pricingDetails.roomsNeeded || 1) * Number(pricingDetails.totalNights)).toLocaleString()} {pricingDetails.currency}
                                          </p>
                                        </div>
                                      )}
                                      
                                      {/* Discount Calculation */}
                                      {discountEnabled && discountDetails.value && pricingDetails.totalAmount && (
                                        <>
                                          {(() => {
                                            const subtotal = Number(pricingDetails.totalAmount) || (Number(pricingDetails.pricePerNight) * Number(pricingDetails.roomsNeeded || 1) * Number(pricingDetails.totalNights));
                                            let discountAmount = 0;
                                            
                                            if (discountDetails.type === "percentage") {
                                              discountAmount = (subtotal * Number(discountDetails.value)) / 100;
                                            } else {
                                              discountAmount = Number(discountDetails.value);
                                            }
                                            
                                            const finalAmount = Math.max(0, subtotal - discountAmount);
                                            const savings = discountAmount;
                                            
                                            return (
                                              <>
                                                <div className="pt-2 border-t border-purple-200">
                                                  <div className="flex items-center justify-between mb-1">
                                                    <span className="text-gray-600">Original Price:</span>
                                                    <span className="line-through text-gray-500">{subtotal.toLocaleString()} {pricingDetails.currency}</span>
                                                  </div>
                                                  <div className="flex items-center justify-between mb-1">
                                                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                                                      <Tag className="h-3 w-3" />
                                                      Discount:
                                                    </span>
                                                    <span className="text-emerald-700 font-semibold">-{savings.toLocaleString()} {pricingDetails.currency}</span>
                                                  </div>
                                                  <div className="flex items-center justify-between pt-1 border-t border-purple-200">
                                                    <span className="font-bold text-purple-900">Final Price:</span>
                                                    <span className="font-bold text-lg text-purple-900">{finalAmount.toLocaleString()} {pricingDetails.currency}</span>
                                                  </div>
                                                  <div className="mt-1.5 p-2 bg-emerald-100 rounded text-emerald-800 font-semibold">
                                                    💰 You Save: {savings.toLocaleString()} {pricingDetails.currency}!
                                                  </div>
                                                </div>
                                              </>
                                            );
                                          })()}
                                        </>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="bg-white/80 rounded-lg p-4 border border-purple-100">
                              <label className="block text-xs font-semibold text-gray-700 mb-2">
                                Recommendations & Tips
                              </label>
                              <textarea
                                value={adminSuggestions.recommendations}
                                onChange={(e) => setAdminSuggestions({ ...adminSuggestions, recommendations: e.target.value })}
                                placeholder="Provide recommendations for activities, locations, or services..."
                                rows={3}
                                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-sm transition-all resize-none"
                              />
                            </div>

                            <div className="bg-white/80 rounded-lg p-4 border border-purple-100">
                              <label className="block text-xs font-semibold text-gray-700 mb-2">
                                Next Steps
                              </label>
                              <textarea
                                value={adminSuggestions.nextSteps}
                                onChange={(e) => setAdminSuggestions({ ...adminSuggestions, nextSteps: e.target.value })}
                                placeholder="Outline the next steps for the customer to proceed..."
                                rows={3}
                                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-sm transition-all resize-none"
                              />
                            </div>

                            <button
                              onClick={handleSubmitSuggestions}
                              disabled={submittingSuggestions || !adminSuggestions.accommodationOptions.trim()}
                              className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl text-sm font-semibold hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg"
                            >
                              {submittingSuggestions ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Submitting...
                                </>
                              ) : (
                                <>
                                  <Send className="h-4 w-4" />
                                  Submit Suggestions to Customer
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Quick Status Actions */}
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-5 shadow-sm">
                          <h4 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-green-500 flex items-center justify-center">
                              <CheckCircle2 className="h-4 w-4 text-white" />
                            </div>
                            Quick Actions
                          </h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {bookingDetails.status === "PENDING" && (
                              <button
                                onClick={() => handleUpdateStatus("REVIEWING")}
                                disabled={updatingStatus}
                                className="px-4 py-3 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-sm"
                              >
                                <Loader2 className={`h-4 w-4 ${updatingStatus ? 'animate-spin' : ''}`} />
                                Start Reviewing
                              </button>
                            )}
                            {bookingDetails.status === "REVIEWING" && (
                              <button
                                onClick={() => handleUpdateStatus("PROCESSING")}
                                disabled={updatingStatus}
                                className="px-4 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-sm"
                              >
                                <Loader2 className={`h-4 w-4 ${updatingStatus ? 'animate-spin' : ''}`} />
                                Start Processing
                              </button>
                            )}
                            {bookingDetails.status === "PROCESSING" && (
                              <>
                                <button
                                  onClick={() => handleUpdateStatus("CONFIRMED")}
                                  disabled={updatingStatus}
                                  className="px-4 py-3 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-sm"
                                >
                                  <CheckCircle className={`h-4 w-4 ${updatingStatus ? 'animate-spin' : ''}`} />
                                  Confirm Booking
                                </button>
                                <button
                                  onClick={() => handleUpdateStatus("COMPLETED")}
                                  disabled={updatingStatus}
                                  className="px-4 py-3 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-sm"
                                >
                                  <CheckCircle2 className={`h-4 w-4 ${updatingStatus ? 'animate-spin' : ''}`} />
                                  Mark Completed
                                </button>
                              </>
                            )}
                            {bookingDetails.status !== "CANCELED" && (
                              <button
                                onClick={() => {
                                  if (confirm("Are you sure you want to cancel this booking?")) {
                                    handleUpdateStatus("CANCELED");
                                  }
                                }}
                                disabled={updatingStatus}
                                className="px-4 py-3 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-sm"
                              >
                                <XCircle className={`h-4 w-4 ${updatingStatus ? 'animate-spin' : ''}`} />
                                Cancel Booking
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">Failed to load booking details</p>
                  </div>
                )}
              </div>

              {/* Footer with action buttons */}
              <div className="sticky bottom-0 bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200 px-6 py-4 flex justify-end gap-3 backdrop-blur-sm">
                <button
                  onClick={closeDetailsModal}
                  className="px-6 py-2.5 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 active:scale-95 shadow-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

