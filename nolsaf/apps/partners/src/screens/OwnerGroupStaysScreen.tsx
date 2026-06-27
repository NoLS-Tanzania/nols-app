import {
  AppButton,
  AppCard,
  AppInput,
  AppText,
  StateView,
  StatusBadge,
  colors,
  radius,
  spacing
} from "@nolsaf/native-ui";
import { Building2, CalendarDays, CalendarX, CheckCircle2, ChevronRight, ClipboardList, DollarSign, FileText, Gavel, Gift, HeartHandshake, MapPin, MessageSquare, Percent, Phone, Plus, RefreshCw, Search, Send, Shield, SlidersHorizontal, Tag, TrendingUp, UserRound, Users, Wallet, X } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";

import { useAuth } from "../auth";
import {
  OwnerGroupStay,
  OwnerGroupStayClaim,
  OwnerGroupStayProperty,
  OwnerGroupStaySegment,
  fetchAvailableGroupStayClaims,
  fetchAssignedGroupStays,
  fetchOwnerGroupStayClaims,
  fetchOwnerGroupStayProperties,
  formatGroupStayDate,
  formatGroupStayMoney,
  groupStayDates,
  groupStayLocation,
  groupStayTitle,
  fetchGroupStayRoster,
  markGroupStayCheckedIn,
  sendOwnerGroupStayMessage,
  submitOwnerGroupStayClaim
} from "../ownerGroupStays";

type OwnerGroupStaysScreenProps = {
  initialSegment?: OwnerGroupStaySegment;
};

const SEGMENTS: Array<{ key: OwnerGroupStaySegment; label: string; helper: string }> = [
  { key: "assigned", label: "Assigned", helper: "Assigned to me" },
  { key: "available", label: "Available", helper: "Open for bids" },
  { key: "myBids", label: "My Bids", helper: "Submitted offers" }
];

const CLAIM_FILTERS = ["", "PENDING", "ACCEPTED", "REJECTED", "WITHDRAWN"];
const BID_SERVICE_CATEGORIES = [
  {
    label: "Meals & Dining",
    icon: "🍽",
    services: ["Free breakfast", "Complimentary dinner", "Welcome drinks", "Lunch included", "BBQ evening"],
  },
  {
    label: "Transport",
    icon: "🚐",
    services: ["Airport pickup", "Airport drop-off", "Free parking", "Shuttle transfer", "Boat transfer"],
  },
  {
    label: "Room & Stay",
    icon: "🛏",
    services: ["Room upgrade", "Early check-in", "Late checkout", "Free Wi-Fi", "Mini bar included"],
  },
  {
    label: "Activities",
    icon: "🏞",
    services: ["Tour guide assistance", "Safari game drive", "Snorkeling trip", "Cultural tour", "City sightseeing"],
  },
  {
    label: "Business & Events",
    icon: "💼",
    services: ["Conference room", "Projector & screen", "Team building package", "Event photography", "Live band / DJ"],
  },
  {
    label: "Wellness & Extras",
    icon: "💆",
    services: ["Spa discount", "Laundry service", "24-hr room service", "Welcome gift basket", "Bonfire night"],
  },
];
const BID_SERVICES = BID_SERVICE_CATEGORIES.flatMap((c) => c.services);
const MAX_SPECIAL_OFFERS = 500;
const MAX_BID_NOTES = 1000;

function normalizeText(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeKey(value: unknown) {
  return normalizeText(value).replace(/[\s-]+/g, "_");
}

function normalizeDistrictName(value: unknown) {
  return normalizeText(value).replace(/\s+/g, " ");
}

function getServicesTags(services: unknown): string[] {
  if (!services) return [];
  if (Array.isArray(services)) return services.filter((item): item is string => typeof item === "string");
  if (typeof services === "object" && services !== null) {
    const tags = (services as { tags?: unknown }).tags;
    if (Array.isArray(tags)) return tags.filter((item): item is string => typeof item === "string");
  }
  return [];
}

function propertyAllowsGroupStay(property: OwnerGroupStayProperty) {
  return getServicesTags(property.services).some((tag) => normalizeText(tag) === "group stay");
}

function propertySuggestedNightlyPrice(property: OwnerGroupStayProperty | null | undefined): number | null {
  if (!property) return null;
  const basePrice = Number(property.basePrice);
  if (Number.isFinite(basePrice) && basePrice > 0) return Math.round(basePrice);

  const rooms = Array.isArray(property.roomsSpec) ? property.roomsSpec : [];
  const prices = rooms
    .map((room: any) => Number(room?.pricePerNight ?? room?.price))
    .filter((value) => Number.isFinite(value) && value > 0);
  return prices.length ? Math.round(Math.min(...prices)) : null;
}

function propertyTypeToAccommodationKey(propertyType: unknown) {
  const key = normalizeKey(propertyType);
  if (key === "guest_house" || key === "guesthouse") return "guest_house";
  if (key === "camp" || key === "campsite") return "camp";
  return key;
}

function bookingAccommodationKey(accommodationType: unknown) {
  const key = normalizeKey(accommodationType);
  if (key === "guest_house" || key === "guesthouse") return "guesthouse";
  return key;
}

function isAccommodationCompatible(requestedAccommodationType: unknown, propertyType: unknown) {
  const requested = bookingAccommodationKey(requestedAccommodationType);
  const propertyKey = propertyTypeToAccommodationKey(propertyType);
  if (!requested || !propertyKey) return true;
  if (requested === propertyKey) return true;
  if (requested === "hostel") return propertyKey === "hotel" || propertyKey === "guest_house";
  return false;
}

function hotelStarLabelToNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const key = normalizeKey(value);
  const map: Record<string, number> = { basic: 1, simple: 2, moderate: 3, high: 4, luxury: 5 };
  if (map[key]) return map[key];
  const num = Number(key);
  return Number.isFinite(num) && num > 0 ? num : null;
}

function groupStayBidEligibilityReasons(property: OwnerGroupStayProperty, target: OwnerGroupStay | null) {
  const reasons: string[] = [];
  if (!target) return reasons;
  if (!propertyAllowsGroupStay(property)) reasons.push("Group stay not enabled");
  if (!isAccommodationCompatible(target.accommodationType, property.type)) {
    reasons.push(`Type mismatch (needs ${String(target.accommodationType || "requested type").replace(/_/g, " ")})`);
  }
  const bookingRegion = normalizeText(target.toRegion);
  const bookingDistrict = normalizeDistrictName(target.toDistrict);
  if (bookingRegion && normalizeText(property.regionName) !== bookingRegion) reasons.push("Wrong region");
  if (bookingDistrict) {
    const propertyDistrict = normalizeDistrictName(property.district);
    if (!propertyDistrict) reasons.push("Missing district");
    else if (propertyDistrict !== bookingDistrict) reasons.push("Wrong district");
  }
  if (typeof target.minHotelStar === "number") {
    const propertyStar = hotelStarLabelToNumber(property.hotelStar);
    if (!propertyStar) reasons.push(`Missing hotel star (needs ${target.minHotelStar}+)`);
    else if (propertyStar < target.minHotelStar) reasons.push(`Hotel star too low (needs ${target.minHotelStar}+)`);
  }
  return reasons;
}

function eligibleForGroupStayBid(property: OwnerGroupStayProperty, target: OwnerGroupStay | null) {
  return groupStayBidEligibilityReasons(property, target).length === 0;
}

export function OwnerGroupStaysScreen({ initialSegment = "assigned" }: OwnerGroupStaysScreenProps) {
  const { token } = useAuth();
  const [segment, setSegment] = useState<OwnerGroupStaySegment>(initialSegment);
  const [assigned, setAssigned] = useState<OwnerGroupStay[]>([]);
  const [available, setAvailable] = useState<OwnerGroupStay[]>([]);
  const [claims, setClaims] = useState<OwnerGroupStayClaim[]>([]);
  const [properties, setProperties] = useState<OwnerGroupStayProperty[]>([]);
  const [query, setQuery] = useState("");
  const [claimStatus, setClaimStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimTarget, setClaimTarget] = useState<OwnerGroupStay | null>(null);
  const [selectedClaim, setSelectedClaim] = useState<OwnerGroupStayClaim | null>(null);
  const [selectedAssigned, setSelectedAssigned] = useState<OwnerGroupStay | null>(null);

  useEffect(() => {
    setSegment(initialSegment);
  }, [initialSegment]);

  const load = async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [nextAssigned, nextAvailable, nextClaims, nextProperties] = await Promise.all([
        fetchAssignedGroupStays({ token }),
        fetchAvailableGroupStayClaims({ token }),
        fetchOwnerGroupStayClaims({ token }),
        fetchOwnerGroupStayProperties({ token }).catch(() => [])
      ]);
      setAssigned(nextAssigned);
      setAvailable(nextAvailable);
      setClaims(nextClaims);
      setProperties(nextProperties);
    } catch (err) {
      setAssigned([]);
      setAvailable([]);
      setClaims([]);
      setError(err instanceof Error ? err.message : "Could not load group stays.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const counts = {
    assigned: assigned.length,
    available: available.length,
    myBids: claims.length
  };

  const filteredAssigned = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assigned.filter((item) => !q || JSON.stringify(item).toLowerCase().includes(q));
  }, [assigned, query]);

  const filteredAvailable = useMemo(() => {
    const q = query.trim().toLowerCase();
    return available.filter((item) => !q || JSON.stringify(item).toLowerCase().includes(q));
  }, [available, query]);

  const filteredClaims = useMemo(() => {
    const q = query.trim().toLowerCase();
    return claims.filter((claim) => {
      const statusOk = !claimStatus || String(claim.status || "").toUpperCase() === claimStatus;
      const qOk = !q || JSON.stringify(claim).toLowerCase().includes(q);
      return statusOk && qOk;
    });
  }, [claims, claimStatus, query]);

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Dark hero ── */}
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.heroIconWrap}>
              <Users size={22} color={colors.white} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="caption" weight="bold" style={styles.heroEyebrow}>GROUP STAYS</AppText>
              <AppText variant="titleSm" weight="bold" tone="inverse">Stay opportunities</AppText>
            </View>
            <Pressable onPress={() => load(true)} style={styles.refreshButton}>
              <RefreshCw size={16} color={colors.onHeroSoft} />
            </Pressable>
          </View>
          <AppText variant="bodySmall" style={styles.heroSub}>
            Manage assigned stays, open bid opportunities and submitted offers in one place.
          </AppText>
          <View style={styles.summaryRail}>
            {[
              { label: "Assigned",    value: counts.assigned,  color: "#34d399" },
              { label: "Open bids",   value: counts.available, color: "#fbbf24" },
              { label: "Offers sent", value: counts.myBids,    color: "#a78bfa" },
            ].map((s, i, arr) => (
              <View key={s.label} style={styles.summaryItem}>
                <AppText variant="titleSm" weight="bold" style={{ color: s.color }}>{s.value}</AppText>
                <AppText variant="caption" style={styles.summaryLabel}>{s.label}</AppText>
                {i < arr.length - 1 ? <View style={styles.summaryDividerLine} /> : null}
              </View>
            ))}
          </View>
        </View>

        {/* ── Light segment control ── */}
        <View style={styles.segmentWrap}>
          <View style={styles.segmentControl}>
            {SEGMENTS.map((item) => {
              const active = segment === item.key;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => setSegment(item.key)}
                  style={({ pressed }) => [styles.segmentChip, active && styles.segmentChipActive, pressed && styles.pressed]}
                >
                  <AppText variant="caption" weight="bold" style={active ? styles.segmentTextActive : styles.segmentText}>
                    {item.label}
                  </AppText>
                  {counts[item.key] > 0 && (
                    <View style={[styles.segmentBadge, active && styles.segmentBadgeActive]}>
                      <AppText variant="caption" weight="bold" style={active ? styles.segmentBadgeTextActive : styles.segmentBadgeText}>
                        {counts[item.key]}
                      </AppText>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
          <AppText variant="caption" tone="muted" style={styles.contextHint}>
            {counts[segment]} {SEGMENTS.find(s => s.key === segment)?.helper}
          </AppText>
        </View>

        {/* ── Search + filter ── */}
        <View style={styles.searchRow}>
          <Search size={15} color={colors.softText} style={{ flexShrink: 0 }} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search group stays…"
            placeholderTextColor={colors.softText}
            style={styles.searchInput}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} style={styles.searchClear}>
              <X size={14} color={colors.softText} />
            </Pressable>
          )}
          <View style={styles.searchDivider} />
          <Pressable style={styles.filterIconBtn} accessibilityRole="button" accessibilityLabel="Advanced filter">
            <SlidersHorizontal size={16} color={colors.primary} />
          </Pressable>
        </View>

        {/* ── My Bids status filter ── */}
        {segment === "myBids" ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {CLAIM_FILTERS.map((status) => {
              const active = claimStatus === status;
              const label = status ? status[0] + status.slice(1).toLowerCase() : "All";
              return (
                <Pressable
                  key={status || "all"}
                  onPress={() => setClaimStatus(status)}
                  style={({ pressed }) => [styles.filterChip, active && styles.filterChipActive, pressed && styles.pressed]}
                >
                  <AppText variant="caption" weight="bold" style={active ? styles.filterTextActive : styles.filterText}>
                    {label}
                  </AppText>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        {/* ── Error ── */}
        {error ? (
          <View style={styles.errorBox}>
            <AppText variant="bodySmall" tone="danger">{error}</AppText>
          </View>
        ) : null}

        {/* ── Content ── */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.primary} />
            <AppText variant="bodySmall" tone="muted">Loading group stays…</AppText>
          </View>
        ) : segment === "assigned" ? (
          filteredAssigned.length
            ? <View style={styles.list}>{filteredAssigned.map((item) => <StayCard key={item.id} item={item} onPress={() => setSelectedAssigned(item)} />)}</View>
            : <StateView title="No assigned group stays" message="Assigned group stays will appear here once admin links them to your owner account." actionLabel="Refresh" onAction={() => load(true)} />
        ) : segment === "available" ? (
          filteredAvailable.length
            ? <View style={styles.list}>{filteredAvailable.map((item) => <StayCard key={item.id} item={item} available onClaim={setClaimTarget} />)}</View>
            : <StateView title="No open bids" message="Open group stay bidding opportunities will appear here." actionLabel="Refresh" onAction={() => load(true)} />
        ) : filteredClaims.length
          ? <View style={styles.list}>{filteredClaims.map((claim) => <ClaimCard key={claim.id} claim={claim} onPress={() => setSelectedClaim(claim)} />)}</View>
          : <StateView title="No bids found" message="Submit offers from Available then track their review status here." actionLabel="Browse available" onAction={() => setSegment("available")} />
        }

        {refreshing ? <View style={styles.refreshingRow}><ActivityIndicator size="small" color={colors.primary} /></View> : null}
      </ScrollView>

      <AssignedStayDetailModal
        stay={selectedAssigned}
        token={token}
        onClose={() => setSelectedAssigned(null)}
        onCheckedIn={() => { setSelectedAssigned(null); void load(true); }}
      />
      <ClaimDetailModal claim={selectedClaim} onClose={() => setSelectedClaim(null)} />

      <ClaimModal
        visible={Boolean(claimTarget)}
        target={claimTarget}
        properties={properties}
        onClose={() => setClaimTarget(null)}
        onSubmitted={() => { setClaimTarget(null); setSegment("myBids"); void load(true); }}
      />
    </View>
  );
}

function AssignedStayDetailModal({ stay, token, onClose, onCheckedIn }: { stay: OwnerGroupStay | null; token: string | null; onClose: () => void; onCheckedIn: () => void }) {
  const [checkingIn, setCheckingIn] = useState(false);
  const [ciError, setCiError] = useState<string | null>(null);
  const [rosterOpen, setRosterOpen] = useState(false);
  const [roster, setRoster] = useState<any[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [messageOpen, setMessageOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [messageSending, setMessageSending] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [messageSent, setMessageSent] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [checkinConfirmOpen, setCheckinConfirmOpen] = useState(false);
  const [checkinTermsAccepted, setCheckinTermsAccepted] = useState(false);

  if (!stay) return null;

  const guest = stay.user?.name || "Guest";
  const phone = stay.user?.phone || stay.user?.email || "—";
  const property = stay.confirmedProperty?.title || "Your property";
  const destination = [stay.toDistrict, stay.toRegion].filter(Boolean).join(", ") || "—";
  const groupSize = `${Number(stay.headcount ?? 0)} people${stay.roomsNeeded ? ` · ${Number(stay.roomsNeeded)} rooms` : ""}`;
  const stayType = [stay.groupType, stay.accommodationType].filter(Boolean).join(" · ") || "—";

  const handleCheckin = async () => {
    setCheckingIn(true); setCiError(null);
    try {
      await markGroupStayCheckedIn({ token, groupStayId: stay.id });
      setCheckinConfirmOpen(false);
      setCheckinTermsAccepted(false);
      onCheckedIn();
    } catch (e) { setCiError(e instanceof Error ? e.message : "Could not mark as checked in."); }
    finally { setCheckingIn(false); }
  };

  const openCheckinConfirm = () => {
    setCiError(null);
    setCheckinTermsAccepted(false);
    setCheckinConfirmOpen(true);
  };

  const openMessage = () => {
    setMessageOpen(true);
    setMessageError(null);
    setMessageSent(false);
    if (!messageText.trim()) {
      setMessageText(`Hello ${guest.split(" ")[0] || "there"},\n\nWe are ready to welcome your group. Please share your arrival time and any check-in details we should prepare before you arrive.\n\nThank you.`);
    }
  };

  const sendMessage = async () => {
    const trimmed = messageText.trim();
    if (!trimmed) {
      setMessageError("Write a message before sending.");
      return;
    }
    setMessageSending(true);
    setMessageError(null);
    setMessageSent(false);
    try {
      await sendOwnerGroupStayMessage({
        token,
        groupStayId: stay.id,
        message: trimmed,
        messageType: "Check-in Instructions"
      });
      setMessageSent(true);
      setMessageText("");
    } catch (e) {
      setMessageError(e instanceof Error ? e.message : "Could not send message.");
    } finally {
      setMessageSending(false);
    }
  };

  const openRoster = async () => {
    setRosterOpen(true);
    setRosterLoading(true); setRosterError(null);
    try {
      const res = await fetchGroupStayRoster({ token, groupStayId: stay.id });
      setRoster(Array.isArray(res?.members) ? res.members : []);
    } catch (e) { setRosterError(e instanceof Error ? e.message : "Could not load group roster."); }
    finally { setRosterLoading(false); }
  };

  const INFO: { icon: React.ReactNode; label: string; value: string }[] = [
    { icon: <UserRound size={18} color={colors.primary} />, label: "GUEST",       value: guest },
    { icon: <Phone size={18} color={colors.primary} />,     label: "PHONE",       value: phone },
    { icon: <Building2 size={18} color={colors.primary} />, label: "PROPERTY",    value: property },
    { icon: <MapPin size={18} color={colors.primary} />,    label: "DESTINATION", value: destination },
    { icon: <CalendarDays size={18} color={colors.primary} />, label: "CHECK-IN",  value: formatGroupStayDate(stay.checkIn) },
    { icon: <CalendarDays size={18} color={colors.primary} />, label: "CHECK-OUT", value: formatGroupStayDate(stay.checkOut) },
    { icon: <Users size={18} color={colors.primary} />,     label: "GROUP SIZE",  value: groupSize },
    { icon: <CheckCircle2 size={18} color={colors.primary} />, label: "STAY TYPE", value: stayType },
  ];

  return (
    <Modal visible={Boolean(stay)} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { maxHeight: "95%" }]}>
          {/* Hero header */}
          <View style={styles.assignedHeader}>
            <View style={styles.assignedHeaderIcon}>
              <CheckCircle2 size={26} color="#ffffff" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.assignedTitleRow}>
                <AppText variant="titleSm" weight="bold">Offer Accepted 🎉</AppText>
                <View style={styles.depositBadge}>
                  <AppText variant="caption" weight="bold" style={styles.depositBadgeText}>DEPOSIT PAID</AppText>
                </View>
              </View>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}><X size={18} color={colors.mutedText} /></Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.assignedBody} showsVerticalScrollIndicator={false}>
            {/* Congratulations */}
            <View style={styles.assignedCongrats}>
              <AppText variant="bodySmall" style={styles.assignedCongratsText}>
                Congratulations! {guest.split(" ")[0]}'s deposit is confirmed and you're now hosting this group. Here's everything you need to welcome them.
              </AppText>
            </View>

            {/* Info grid */}
            <View style={styles.infoGrid}>
              {INFO.map((row) => (
                <View key={row.label} style={styles.infoCell}>
                  <View style={styles.infoCellIcon}>{row.icon}</View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <AppText variant="caption" weight="bold" style={styles.infoCellLabel}>{row.label}</AppText>
                    <AppText variant="bodySmall" weight="bold" style={styles.infoCellValue} numberOfLines={2}>{row.value}</AppText>
                  </View>
                </View>
              ))}
            </View>

            {/* Payment collect card */}
            {stay.totalAmount ? (
              <View style={styles.collectCard}>
                <View style={styles.collectCardIcon}><DollarSign size={20} color={colors.primary} /></View>
                <View style={{ flex: 1 }}>
                  <AppText variant="bodySmall" weight="bold">
                    You collect at the property  ·  {formatGroupStayMoney(stay.totalAmount, stay.currency || "TZS")}
                  </AppText>
                  <AppText variant="caption" tone="muted" style={{ marginTop: 4 }}>
                    The guest already paid the deposit (NoLSAF's commission) online. Collect your balance directly from the guest.
                  </AppText>
                </View>
              </View>
            ) : null}

            {/* Group Details */}
            <View style={styles.groupDetailsCard}>
              <View style={styles.groupDetailsHeader}>
                <View style={styles.groupDetailsHeaderIcon}>
                  <Users size={16} color={colors.white} />
                </View>
                <AppText variant="bodySmall" weight="bold" tone="inverse">Group Details</AppText>
              </View>
              <View style={styles.groupDetailsBody}>
                {/* Type row */}
                <View style={styles.groupDetailsRow}>
                  {stay.groupType ? (
                    <View style={styles.groupDetailCell}>
                      <AppText variant="caption" tone="muted">Group Type</AppText>
                      <AppText variant="bodySmall" weight="bold">{String(stay.groupType).replace(/_/g, " ")}</AppText>
                    </View>
                  ) : null}
                  {stay.accommodationType ? (
                    <View style={[styles.groupDetailCell, { borderLeftWidth: 1, borderLeftColor: colors.border, paddingLeft: spacing[3] }]}>
                      <AppText variant="caption" tone="muted">Accommodation</AppText>
                      <AppText variant="bodySmall" weight="bold">{String(stay.accommodationType).replace(/_/g, " ")}</AppText>
                    </View>
                  ) : null}
                </View>

                {/* Divider */}
                <View style={{ height: 1, backgroundColor: colors.border }} />

                {/* Headcount (tappable) + Rooms row */}
                <View style={styles.groupDetailsRow}>
                  {stay.headcount ? (
                    <Pressable onPress={openRoster} style={({ pressed }) => [styles.headcountCard, pressed && { opacity: 0.8 }]}>
                      <AppText variant="caption" tone="muted">Headcount</AppText>
                      <View style={styles.headcountRow}>
                        <Users size={15} color={colors.primary} />
                        <AppText variant="titleSm" weight="bold" style={{ color: colors.primary }}>
                          {Number(stay.headcount)} people
                        </AppText>
                      </View>
                      <View style={styles.headcountFooter}>
                        <AppText variant="caption" style={{ color: colors.primary, fontSize: 10 }}>View roster</AppText>
                        <ChevronRight size={12} color={colors.primary} />
                      </View>
                      <View style={styles.headcountBadge}>
                        <Users size={17} color={colors.primary} />
                      </View>
                    </Pressable>
                  ) : null}
                  {stay.roomsNeeded ? (
                    <View style={styles.groupDetailCell}>
                      <AppText variant="caption" tone="muted">Rooms Needed</AppText>
                      <AppText variant="titleSm" weight="bold">{Number(stay.roomsNeeded)} rooms</AppText>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>

            {stay.arrPickup && (stay.pickupLocation || stay.pickupTime) ? (
              <View style={styles.pickupDetailsCard}>
                <View style={styles.pickupDetailsHeader}>
                  <View style={styles.pickupDetailsIcon}>
                    <MapPin size={18} color={colors.primary} />
                  </View>
                  <AppText variant="bodySmall" weight="bold" style={styles.pickupDetailsTitle}>Pickup Details</AppText>
                </View>
                <View style={styles.pickupDetailsRows}>
                  {stay.pickupLocation ? (
                    <View style={styles.pickupDetailsRow}>
                      <AppText variant="caption" weight="bold" style={styles.pickupDetailsLabel}>Location:</AppText>
                      <AppText variant="bodySmall" style={styles.pickupDetailsValue}>{stay.pickupLocation}</AppText>
                    </View>
                  ) : null}
                  {stay.pickupTime ? (
                    <View style={styles.pickupDetailsRow}>
                      <AppText variant="caption" weight="bold" style={styles.pickupDetailsLabel}>Time:</AppText>
                      <AppText variant="bodySmall" style={styles.pickupDetailsValue}>{stay.pickupTime}</AppText>
                    </View>
                  ) : null}
                </View>
              </View>
            ) : null}

            {/* Roster sheet */}
            <Modal visible={rosterOpen} transparent animationType="slide" onRequestClose={() => setRosterOpen(false)}>
              <View style={styles.modalOverlay}>
                <View style={[styles.modalSheet, { maxHeight: "85%" }]}>
                  <View style={styles.modalHeader}>
                    <View>
                      <AppText variant="body" weight="bold">Group roster</AppText>
                      <AppText variant="caption" tone="muted">
                        {Number(stay.headcount ?? 0)} members · {stay.confirmedProperty?.title || "Your property"}
                      </AppText>
                    </View>
                    <Pressable onPress={() => setRosterOpen(false)} style={styles.closeButton}>
                      <X size={18} color={colors.mutedText} />
                    </Pressable>
                  </View>
                  <ScrollView contentContainerStyle={styles.rosterScroll} showsVerticalScrollIndicator={false}>
                    {rosterLoading ? (
                      <View style={styles.rosterCenter}>
                        <ActivityIndicator color={colors.primary} />
                        <AppText variant="caption" tone="muted">Loading roster…</AppText>
                      </View>
                    ) : rosterError ? (
                      <View style={styles.errorBox}>
                        <AppText variant="bodySmall" tone="danger">{rosterError}</AppText>
                      </View>
                    ) : roster.length === 0 ? (
                      <View style={styles.rosterCenter}>
                        <Users size={40} color={colors.softText} />
                        <AppText variant="bodySmall" tone="muted">No roster uploaded yet.</AppText>
                        <AppText variant="caption" tone="muted">The organiser hasn't uploaded the member list.</AppText>
                      </View>
                    ) : (
                      <View style={styles.rosterGrid}>
                        {roster.map((member: any, idx: number) => {
                          const firstName = String(member.firstName ?? member.firstname ?? "").trim();
                          const lastName = String(member.lastName ?? member.lastname ?? "").trim();
                          const name = String(member.name ?? member.fullName ?? [firstName, lastName].filter(Boolean).join(" ")).trim() || `Member ${idx + 1}`;
                          const age = member.age ?? member.dateOfBirth ?? null;
                          const gender = member.gender || member.sex || null;
                          const nationality = member.nationality || null;
                          const phone = member.phone || member.phoneNumber || null;
                          return (
                            <View key={member.id ?? idx} style={styles.rosterCard}>
                              {/* Member header */}
                              <View style={styles.rosterCardHead}>
                                <View style={styles.rosterCardIcon}>
                                  <UserRound size={20} color={colors.primary} />
                                </View>
                                <View style={{ flex: 1, minWidth: 0 }}>
                                  <AppText variant="caption" style={styles.rosterNum}>#{idx + 1}</AppText>
                                  <AppText variant="bodySmall" weight="bold" numberOfLines={1}>{name}</AppText>
                                </View>
                              </View>

                              {/* Core details */}
                              <View style={styles.rosterCardDetails}>
                                {age ? <AppText variant="caption" tone="muted">Age: {age}</AppText> : null}
                                {gender ? <AppText variant="caption" tone="muted">Gender: {gender}</AppText> : null}
                                {nationality ? <AppText variant="caption" tone="muted">Nationality: {nationality}</AppText> : null}
                                {phone ? (
                                  <View style={styles.rosterPhone}>
                                    <Phone size={11} color={colors.primary} />
                                    <AppText variant="caption" style={{ color: colors.primary }}>{phone}</AppText>
                                  </View>
                                ) : null}
                              </View>

                              {/* Added at */}
                              {(member.createdAt || member.addedAt) ? (
                                <AppText variant="caption" style={styles.rosterAddedAt}>
                                  Added {formatGroupStayDate(member.createdAt || member.addedAt)}
                                </AppText>
                              ) : null}
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </ScrollView>
                </View>
              </View>
            </Modal>

            {ciError ? (
              <View style={styles.errorBox}>
                <AppText variant="bodySmall" tone="danger">{ciError}</AppText>
              </View>
            ) : null}

            {/* Actions */}
            <View style={styles.assignedActions}>
              <AppButton
                title="Mark group checked in"
                onPress={openCheckinConfirm}
                icon={<Users size={18} color={colors.white} />}
              />
              <AppText variant="caption" tone="muted" style={{ textAlign: "center" }}>
                Mark the group as checked in when they arrive.
              </AppText>
              <View style={styles.assignedSecondaryRow}>
                <Pressable accessibilityRole="button" onPress={openMessage} style={styles.assignedSecondaryBtn}>
                  <MessageSquare size={15} color={colors.primary} />
                  <AppText variant="caption" weight="bold" style={{ color: colors.primary }}>Message your guest</AppText>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={() => setPolicyOpen(true)} style={[styles.assignedSecondaryBtn, styles.assignedSecondaryBtnOutline]}>
                  <Shield size={15} color={colors.primary} />
                  <AppText variant="caption" weight="bold" style={{ color: colors.primary }}>View policy</AppText>
                </Pressable>
              </View>
            </View>

            <Modal visible={checkinConfirmOpen} transparent animationType="slide" onRequestClose={() => setCheckinConfirmOpen(false)}>
              <View style={styles.modalOverlay}>
                <View style={[styles.modalSheet, { maxHeight: "86%" }]}>
                  <View style={styles.checkinConfirmHeader}>
                    <View style={styles.checkinConfirmIcon}>
                      <Users size={22} color={colors.white} />
                    </View>
                    <View style={styles.modalHeaderTitle}>
                      <AppText variant="body" weight="bold" tone="inverse">Confirm group check-in</AppText>
                      <AppText variant="caption" style={styles.checkinConfirmSub}>This records the group arrival for the confirmed stay.</AppText>
                    </View>
                    <Pressable accessibilityRole="button" onPress={() => setCheckinConfirmOpen(false)} style={styles.policyCloseButton}>
                      <X size={18} color={colors.white} />
                    </Pressable>
                  </View>
                  <ScrollView contentContainerStyle={styles.checkinConfirmBody} showsVerticalScrollIndicator={false}>
                    <View style={styles.checkinSummaryCard}>
                      <AppText variant="bodySmall" weight="bold">{property}</AppText>
                      <AppText variant="caption" tone="muted">{groupSize} - {guest}</AppText>
                      {stay.pickupLocation || stay.pickupTime ? (
                        <AppText variant="caption" tone="muted">
                          Pickup: {[stay.pickupLocation, stay.pickupTime].filter(Boolean).join(" - ")}
                        </AppText>
                      ) : null}
                    </View>

                    <View style={styles.checkinTermsList}>
                      <CheckinTerm text="The group has physically arrived at the property." />
                      <CheckinTerm text="The guest identity and group roster have been reviewed where provided." />
                      <CheckinTerm text="Rooms and agreed services are ready for the confirmed stay." />
                      <CheckinTerm text="Any remaining owner balance will be collected directly from the guest at the property." />
                    </View>

                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: checkinTermsAccepted }}
                      onPress={() => setCheckinTermsAccepted((value) => !value)}
                      style={({ pressed }) => [styles.checkinAgreeRow, checkinTermsAccepted && styles.checkinAgreeRowActive, pressed && styles.pressed]}
                    >
                      <View style={[styles.checkinCheckbox, checkinTermsAccepted && styles.checkinCheckboxActive]}>
                        {checkinTermsAccepted ? <CheckCircle2 size={15} color={colors.white} /> : null}
                      </View>
                      <AppText variant="bodySmall" weight="semiBold" style={styles.checkinAgreeText}>
                        I agree to the check-in terms and confirm this action is accurate.
                      </AppText>
                    </Pressable>

                    {ciError ? (
                      <View style={styles.errorBox}>
                        <AppText variant="bodySmall" tone="danger">{ciError}</AppText>
                      </View>
                    ) : null}

                    <View style={styles.checkinConfirmActions}>
                      <AppButton
                        title="Cancel"
                        variant="secondary"
                        onPress={() => setCheckinConfirmOpen(false)}
                      />
                      <AppButton
                        title="Confirm check-in"
                        loading={checkingIn}
                        disabled={!checkinTermsAccepted}
                        onPress={handleCheckin}
                        icon={<CheckCircle2 size={17} color={colors.white} />}
                      />
                    </View>
                  </ScrollView>
                </View>
              </View>
            </Modal>

            <Modal visible={messageOpen} transparent animationType="slide" onRequestClose={() => setMessageOpen(false)}>
              <View style={styles.modalOverlay}>
                <View style={[styles.modalSheet, { maxHeight: "82%" }]}>
                  <View style={styles.modalHeader}>
                    <View style={styles.modalHeaderTitle}>
                      <AppText variant="body" weight="bold">Message your guest</AppText>
                      <AppText variant="caption" tone="muted">{guest} - Group Stay #{stay.id}</AppText>
                    </View>
                    <Pressable accessibilityRole="button" onPress={() => setMessageOpen(false)} style={styles.closeButton}>
                      <X size={18} color={colors.mutedText} />
                    </Pressable>
                  </View>
                  <View style={styles.messageBody}>
                    <TextInput
                      value={messageText}
                      onChangeText={(value) => {
                        setMessageText(value);
                        setMessageError(null);
                        setMessageSent(false);
                      }}
                      multiline
                      textAlignVertical="top"
                      placeholder="Share arrival and check-in details..."
                      placeholderTextColor={colors.softText}
                      maxLength={5000}
                      style={styles.messageInput}
                    />
                    <AppText variant="caption" tone="muted">{messageText.length}/5000</AppText>
                    {messageError ? (
                      <View style={styles.errorBox}>
                        <AppText variant="bodySmall" tone="danger">{messageError}</AppText>
                      </View>
                    ) : null}
                    {messageSent ? (
                      <View style={styles.successBox}>
                        <AppText variant="bodySmall" style={styles.successText}>Message sent successfully.</AppText>
                      </View>
                    ) : null}
                    <AppButton
                      title="Send message"
                      loading={messageSending}
                      onPress={sendMessage}
                      icon={<Send size={17} color={colors.white} />}
                    />
                  </View>
                </View>
              </View>
            </Modal>

            <Modal visible={policyOpen} transparent animationType="slide" onRequestClose={() => setPolicyOpen(false)}>
              <View style={styles.modalOverlay}>
                <View style={[styles.modalSheet, { maxHeight: "86%" }]}>
                  <View style={styles.policyHeader}>
                    <View style={styles.policyHeaderIcon}>
                      <Shield size={20} color={colors.white} />
                    </View>
                    <View style={styles.modalHeaderTitle}>
                      <AppText variant="body" weight="bold" tone="inverse">Hosting policy</AppText>
                      <AppText variant="caption" style={styles.policyHeaderSub}>Please follow these for a confirmed group stay</AppText>
                    </View>
                    <Pressable accessibilityRole="button" onPress={() => setPolicyOpen(false)} style={styles.policyCloseButton}>
                      <X size={18} color={colors.white} />
                    </Pressable>
                  </View>
                  <ScrollView contentContainerStyle={styles.policyBody} showsVerticalScrollIndicator={false}>
                    <PolicyRow
                      icon={<Wallet size={20} color={colors.primary} />}
                      title="How you get paid"
                      body="The deposit the guest pays online is NoLSAF's commission. You collect your full balance directly from the guest at the property. NoLSAF takes nothing further from your balance."
                    />
                    <PolicyRow
                      icon={<CalendarX size={20} color="#e11d48" />}
                      title="Block the selected dates"
                      body={`Do not accept other guests for these rooms on the booked stay dates (${formatGroupStayDate(stay.checkIn)} to ${formatGroupStayDate(stay.checkOut)}). Keep them reserved for this group.`}
                    />
                    <PolicyRow
                      icon={<TrendingUp size={20} color="#d97706" />}
                      title="An opportunity that counts"
                      body="NoLSAF reviews hosting trends across every group stay. Treat this booking as a chance to stand out and earn more group placements in the future."
                    />
                    <PolicyRow
                      icon={<MessageSquare size={20} color="#2563eb" />}
                      title="Stay in close communication"
                      body="Reach out to your guest early, share arrival and check in details, and reply to their questions promptly throughout the stay."
                    />
                    <PolicyRow
                      icon={<HeartHandshake size={20} color="#059669" />}
                      title="Treat travellers well"
                      body="Welcome the group warmly and make sure every traveller is cared for and comfortable from arrival to checkout."
                    />
                    <AppButton title="Got it" onPress={() => setPolicyOpen(false)} icon={<CheckCircle2 size={17} color={colors.white} />} />
                  </ScrollView>
                </View>
              </View>
            </Modal>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function PolicyRow({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <View style={styles.policyRow}>
      <View style={styles.policyRowIcon}>{icon}</View>
      <View style={styles.policyRowText}>
        <AppText variant="bodySmall" weight="bold">{title}</AppText>
        <AppText variant="caption" tone="muted" style={styles.policyRowBody}>{body}</AppText>
      </View>
    </View>
  );
}

function CheckinTerm({ text }: { text: string }) {
  return (
    <View style={styles.checkinTermRow}>
      <CheckCircle2 size={15} color={colors.primary} />
      <AppText variant="caption" tone="muted" style={styles.checkinTermText}>{text}</AppText>
    </View>
  );
}

function BidSection({ step, title, subtitle, icon, accent, headerRight, children }: { step: string; title: string; subtitle?: string; icon: React.ReactNode; accent?: string; headerRight?: React.ReactNode; children: React.ReactNode }) {
  const accentColor = accent || colors.primaryDeep;
  return (
    <View style={styles.bidSection}>
      <View style={styles.bidSectionHeader}>
        <View style={[styles.bidStepBadge, { backgroundColor: accentColor }]}>
          <AppText variant="caption" weight="bold" style={styles.bidStepText}>{step}</AppText>
        </View>
        <View style={styles.bidSectionIcon}>{icon}</View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText variant="bodySmall" weight="bold" style={styles.bidSectionTitle} numberOfLines={1}>{title}</AppText>
          {subtitle ? <AppText variant="caption" tone="muted" style={styles.bidSectionSubtitle} numberOfLines={1}>{subtitle}</AppText> : null}
        </View>
        {headerRight}
      </View>
      <View style={styles.bidSectionBody}>{children}</View>
    </View>
  );
}

function BidFact({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <View style={styles.bidFact}>
      {icon}
      <AppText variant="caption" weight="semiBold" style={styles.bidFactText} numberOfLines={1}>{label}</AppText>
    </View>
  );
}

function PreviewRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.previewRow}>
      <AppText variant="caption" tone="muted" style={styles.previewLabel}>{label}</AppText>
      <AppText variant="bodySmall" weight={strong ? "bold" : "semiBold"} style={strong ? styles.previewValueStrong : styles.previewValue}>{value}</AppText>
    </View>
  );
}

function DiscountSummaryRow({
  label,
  value,
  valueStyle,
  tinted,
  danger,
  success,
  total,
  strong
}: {
  label: string;
  value: string;
  valueStyle?: object;
  tinted?: boolean;
  danger?: boolean;
  success?: boolean;
  total?: boolean;
  strong?: boolean;
}) {
  return (
    <View style={[
      styles.discountSummaryRow,
      tinted && styles.discountSummaryRowTinted,
      danger && styles.discountSummaryRowDanger,
      success && styles.discountSummaryRowSuccess,
      total && styles.discountSummaryRowTotal
    ]}>
      <AppText variant="caption" weight={strong ? "bold" : "medium"} style={total ? styles.discountSummaryTotalLabel : styles.discountSummaryLabel}>{label}</AppText>
      <AppText variant={total ? "titleSm" : "bodySmall"} weight="bold" style={[styles.discountSummaryValue, valueStyle]}>{value}</AppText>
    </View>
  );
}

function formatNumber(value: number) {
  if (!Number.isFinite(value)) return "0";
  return Math.round(value).toLocaleString("en-US");
}

function WebField({
  label,
  prefix,
  value,
  onChangeText,
  placeholder,
  readOnly,
  highlight,
  helper,
  keyboardType
}: {
  label: string;
  prefix?: string;
  value: string;
  onChangeText?: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  highlight?: boolean;
  helper?: string;
  keyboardType?: "default" | "numeric";
}) {
  return (
    <View style={styles.webFieldWrap}>
      <AppText variant="bodySmall" style={styles.webFieldLabel}>{label}</AppText>
      <View style={[styles.webInputBox, highlight && styles.webInputBoxHighlight]}>
        {prefix ? (
          <View style={[styles.webInputPrefix, highlight && styles.webInputPrefixHighlight]}>
            <AppText variant="caption" weight="semiBold" style={highlight ? styles.webInputPrefixTextHighlight : styles.webInputPrefixText}>{prefix}</AppText>
          </View>
        ) : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.softText}
          editable={!readOnly}
          keyboardType={keyboardType}
          style={[styles.webInput, readOnly && styles.webInputReadOnly]}
        />
      </View>
      {helper ? <AppText variant="caption" tone="muted" style={styles.webFieldHelper}>{helper}</AppText> : null}
    </View>
  );
}

function WebSelectField({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <View style={styles.webFieldWrap}>
      <AppText variant="bodySmall" style={styles.webFieldLabel}>{label}</AppText>
      <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.webInputBox, styles.webSelectBox, pressed && styles.pressed]}>
        <AppText variant="bodySmall" style={styles.webSelectValue}>{value}</AppText>
        <ChevronRight size={18} color={colors.softText} />
      </Pressable>
    </View>
  );
}

function StayCard({ item, available, onClaim, onPress }: { item: OwnerGroupStay; available?: boolean; onClaim?: (item: OwnerGroupStay) => void; onPress?: () => void }) {
  const title = available
    ? `${String(item.accommodationType || "Accommodation").replace(/_/g, " ")} request`
    : item.confirmedProperty?.title || groupStayTitle(item);
  const subtitle = [item.user?.name || "Customer", groupStayLocation(item)].filter(Boolean).join("  ·  ");
  const accent = available ? colors.accent.amberDark : colors.primary;
  const markBg  = available ? colors.accent.amberSoft : colors.brand[50];

  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [!onPress && { opacity: 1 }, onPress && pressed && styles.pressed]}>
    <AppCard style={[styles.card, available ? styles.cardAvailable : styles.cardAssigned]}>
      <View style={[styles.cardAccentBar, { backgroundColor: accent }]} />
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <View style={[styles.mark, { backgroundColor: markBg }]}>
            {available ? <Gavel size={18} color={accent} /> : <Users size={18} color={accent} />}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText variant="body" weight="bold" numberOfLines={1}>{title}</AppText>
            <AppText variant="caption" tone="muted" numberOfLines={1}>{subtitle}</AppText>
          </View>
          <StatusBadge status={stayBadge(item.status)} label={String(item.status || "OPEN")} />
        </View>

        <View style={styles.metaPills}>
          <MetaPill icon={<Users size={13} color={colors.primary} />} value={`${Number(item.headcount ?? 0)} guests`} />
          <MetaPill icon={<Building2 size={13} color={colors.primary} />} value={`${Number(item.roomsNeeded ?? 0)} rooms`} />
          <MetaPill icon={<CalendarDays size={13} color={colors.primary} />} value={groupStayDates(item)} />
        </View>

        {available ? (
          <View style={styles.bidFooter}>
            <View>
              <AppText variant="caption" tone="muted">
                {Number(item.existingClaimsCount ?? 0)} competing offer{Number(item.existingClaimsCount ?? 0) === 1 ? "" : "s"}
              </AppText>
              {item.submissionDeadline ? (
                <AppText variant="caption" style={styles.deadlineText}>Due {formatGroupStayDate(item.submissionDeadline)}</AppText>
              ) : null}
            </View>
            <AppButton title="Place bid" onPress={() => onClaim?.(item)} icon={<Gavel size={16} color={colors.white} />} />
          </View>
        ) : null}
        {!available && onPress ? (
          <View style={styles.detailTapHint}>
            <AppText variant="caption" tone="muted">Tap to view full details</AppText>
          </View>
        ) : null}
      </View>
    </AppCard>
    </Pressable>
  );
}

function ClaimDetailModal({ claim, onClose }: { claim: OwnerGroupStayClaim | null; onClose: () => void }) {
  if (!claim) return null;
  const stay = claim.groupBooking;
  const s = String(claim.status || "PENDING").toUpperCase();
  const isAccepted = s === "ACCEPTED";
  const accent = isAccepted ? colors.primary : s === "REJECTED" || s === "WITHDRAWN" ? "#ef4444" : "#6366f1";
  const accentBg = isAccepted ? colors.brand[50] : s === "REJECTED" || s === "WITHDRAWN" ? "#fef2f2" : "#f5f3ff";
  const accentBorder = isAccepted ? colors.brand[100] : s === "REJECTED" || s === "WITHDRAWN" ? "#fecaca" : "#ddd6fe";

  return (
    <Modal visible={Boolean(claim)} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { maxHeight: "92%" }]}>
          {/* Header */}
          <View style={styles.detailHeader}>
            <View style={[styles.mark, { backgroundColor: accentBg }]}>
              <ClipboardList size={20} color={accent} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <AppText variant="body" weight="bold" numberOfLines={1}>
                {claim.property?.title || "Submitted offer"}
              </AppText>
              <AppText variant="caption" tone="muted" numberOfLines={1}>
                {stay?.toRegion || "Destination"}  ·  {formatGroupStayDate(claim.createdAt)}
              </AppText>
            </View>
            <StatusBadge status={claimBadge(claim.status)} label={s} />
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X size={18} color={colors.mutedText} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.detailBody} showsVerticalScrollIndicator={false}>
            {/* Offer amounts — prominent */}
            <View style={[styles.detailOfferPanel, { backgroundColor: accentBg, borderColor: accentBorder }]}>
              <View style={styles.detailOfferCell}>
                <AppText variant="caption" tone="muted">Nightly offer</AppText>
                <AppText variant="titleSm" weight="bold" style={{ color: accent }}>
                  {formatGroupStayMoney(claim.offeredPricePerNight, claim.currency || "TZS")}
                </AppText>
              </View>
              <View style={styles.detailOfferDivider} />
              <View style={styles.detailOfferCell}>
                <AppText variant="caption" tone="muted">Total</AppText>
                <AppText variant="titleSm" weight="bold" style={{ color: colors.primaryDeep }}>
                  {formatGroupStayMoney(claim.totalAmount, claim.currency || "TZS")}
                </AppText>
              </View>
            </View>

            {/* Meta pills */}
            <View style={styles.metaPills}>
              <MetaPill icon={<Users size={13} color={colors.primary} />} value={`${Number(stay?.headcount ?? 0)} guests`} />
              <MetaPill icon={<CalendarDays size={13} color={colors.primary} />} value={groupStayDates(stay)} />
              {claim.discountPercent ? (
                <MetaPill icon={<DollarSign size={13} color={colors.primary} />} value={`${claim.discountPercent}% discount`} />
              ) : null}
            </View>

            {/* Property detail */}
            {claim.property?.type || claim.property?.regionName ? (
              <View style={styles.detailSection}>
                <AppText variant="caption" weight="bold" style={styles.detailSectionLabel}>PROPERTY</AppText>
                <AppText variant="bodySmall">
                  {[claim.property.type, claim.property.regionName].filter(Boolean).join("  ·  ")}
                </AppText>
              </View>
            ) : null}

            {/* Special offers */}
            {claim.specialOffers ? (
              <View style={styles.detailSection}>
                <AppText variant="caption" weight="bold" style={[styles.detailSectionLabel, { color: accent }]}>
                  Special offers
                </AppText>
                <AppText variant="bodySmall" style={{ lineHeight: 22 }}>{claim.specialOffers}</AppText>
              </View>
            ) : null}

            {/* Notes */}
            {claim.notes ? (
              <View style={styles.detailSection}>
                <AppText variant="caption" weight="bold" style={styles.detailSectionLabel}>NOTES</AppText>
                <AppText variant="bodySmall" tone="muted">{claim.notes}</AppText>
              </View>
            ) : null}

            {/* Review date */}
            {claim.reviewedAt ? (
              <View style={styles.detailSection}>
                <AppText variant="caption" weight="bold" style={styles.detailSectionLabel}>
                  {isAccepted ? "ACCEPTED ON" : "REVIEWED ON"}
                </AppText>
                <AppText variant="bodySmall">{formatGroupStayDate(claim.reviewedAt)}</AppText>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function ClaimCard({ claim, onPress }: { claim: OwnerGroupStayClaim; onPress?: () => void }) {
  const stay = claim.groupBooking;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && styles.pressed]}>
    <AppCard style={[styles.card, styles.cardClaim]}>
      <View style={[styles.cardAccentBar, { backgroundColor: colors.accent.blue }]} />
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <View style={[styles.mark, { backgroundColor: colors.accent.blueSoft }]}>
            <ClipboardList size={18} color={colors.accent.blue} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText variant="body" weight="bold" numberOfLines={1}>{claim.property?.title || "Submitted offer"}</AppText>
            <AppText variant="caption" tone="muted" numberOfLines={1}>
              {stay?.toRegion || "Destination"}  ·  {formatGroupStayDate(claim.createdAt)}
            </AppText>
          </View>
          <StatusBadge status={claimBadge(claim.status)} label={String(claim.status || "PENDING")} />
        </View>

        <View style={styles.offerPanel}>
          <View style={{ flex: 1 }}>
            <AppText variant="caption" tone="muted">Nightly offer</AppText>
            <AppText variant="titleSm" weight="bold" style={styles.offerValue} numberOfLines={1}>
              {formatGroupStayMoney(claim.offeredPricePerNight, claim.currency || "TZS")}
            </AppText>
          </View>
          <View style={styles.offerTotal}>
            <AppText variant="caption" tone="muted">Total</AppText>
            <AppText variant="bodySmall" weight="bold" numberOfLines={1}>
              {formatGroupStayMoney(claim.totalAmount, claim.currency || "TZS")}
            </AppText>
          </View>
        </View>

        <View style={styles.metaPills}>
          <MetaPill icon={<Users size={13} color={colors.primary} />} value={`${Number(stay?.headcount ?? 0)} guests`} />
          <MetaPill icon={<CalendarDays size={13} color={colors.primary} />} value={groupStayDates(stay)} />
        </View>

        {claim.specialOffers ? (
          <View style={styles.noteBox}>
            <AppText variant="caption" tone="muted" weight="bold">Special offers</AppText>
            <AppText variant="bodySmall" numberOfLines={3}>{claim.specialOffers}</AppText>
          </View>
        ) : null}

        <View style={styles.detailTapHint}>
          <AppText variant="caption" tone="muted">Tap to view full details</AppText>
        </View>
      </View>
    </AppCard>
    </Pressable>
  );
}

function ClaimModal({
  visible,
  target,
  properties,
  onClose,
  onSubmitted
}: {
  visible: boolean;
  target: OwnerGroupStay | null;
  properties: OwnerGroupStayProperty[];
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const { token } = useAuth();
  const [propertyId, setPropertyId] = useState<number | null>(null);
  const [price, setPrice] = useState("");
  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [discount, setDiscount] = useState("");
  const [offers, setOffers] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEligibleProperties, setShowEligibleProperties] = useState(false);
  const [showIneligibleProperties, setShowIneligibleProperties] = useState(false);

  const currency = target?.currency || "TZS";
  const nights = useMemo(() => {
    if (!target?.checkIn || !target?.checkOut) return 1;
    const a = new Date(String(target.checkIn)).getTime();
    const b = new Date(String(target.checkOut)).getTime();
    if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 1;
    return Math.max(1, Math.ceil((b - a) / 86400000));
  }, [target?.checkIn, target?.checkOut]);
  const rooms = Math.max(1, Number(target?.roomsNeeded ?? 1) || 1);
  const offeredPrice = Number(price);
  const discountPercent = discountEnabled && discount.trim() ? Number(discount) : null;
  const discountAmount = Number.isFinite(offeredPrice) && discountPercent && discountPercent > 0
    ? Math.round((offeredPrice * discountPercent) / 100)
    : 0;
  const priceAfterDiscount = Math.max(0, Number.isFinite(offeredPrice) ? offeredPrice - discountAmount : 0);
  const totalAfterDiscount = priceAfterDiscount * rooms * nights;
  const totalSavings = discountAmount * rooms * nights;
  const eligibleProperties = useMemo(
    () => properties.filter((property) => eligibleForGroupStayBid(property, target)),
    [properties, target]
  );
  const propertyEligibility = useMemo(
    () => properties.map((property) => {
      const reasons = groupStayBidEligibilityReasons(property, target);
      return { property, eligible: reasons.length === 0, reasons };
    }),
    [properties, target]
  );
  const ineligibleProperties = useMemo(
    () => propertyEligibility.filter((item) => !item.eligible),
    [propertyEligibility]
  );
  const selectedProperty = useMemo(
    () => eligibleProperties.find((property) => property.id === propertyId) ?? null,
    [eligibleProperties, propertyId]
  );

  useEffect(() => {
    if (visible) {
      const firstEligible = properties.find((property) => eligibleForGroupStayBid(property, target));
      const suggestedPrice = propertySuggestedNightlyPrice(firstEligible);
      setPropertyId(firstEligible?.id ?? null);
      setPrice(suggestedPrice ? String(suggestedPrice) : "");
      setShowEligibleProperties(false);
      setDiscountEnabled(Boolean(target?.minDiscountPercent));
      setDiscount(target?.minDiscountPercent ? String(target.minDiscountPercent) : "");
      setOffers("");
      setSelectedServices([]);
      setNotes("");
      setError(null);
      setShowIneligibleProperties(false);
    }
  }, [visible, properties, target]);

  useEffect(() => {
    if (!propertyId) return;
    if (!eligibleProperties.some((property) => property.id === propertyId)) setPropertyId(null);
  }, [eligibleProperties, propertyId]);

  useEffect(() => {
    if (!visible) return;
    const suggestedPrice = propertySuggestedNightlyPrice(selectedProperty);
    if (suggestedPrice) setPrice(String(suggestedPrice));
  }, [visible, selectedProperty]);

  const toggleService = (service: string) => {
    setSelectedServices((prev) => {
      const next = prev.includes(service) ? prev.filter((item) => item !== service) : [...prev, service];
      setOffers(next.join(", "));
      return next;
    });
  };

  const handleOffersChange = (value: string) => {
    if (value.length > MAX_SPECIAL_OFFERS) return;
    setOffers(value);
    setSelectedServices(
      value
        .split(",")
        .map((item) => item.trim())
        .filter((item) => BID_SERVICES.includes(item))
    );
  };

  const handleNotesChange = (value: string) => {
    if (value.length <= MAX_BID_NOTES) setNotes(value);
  };

  const submit = async () => {
    if (!target || !propertyId) {
      setError("Choose an approved property first.");
      return;
    }
    const offeredPricePerNight = Number(price);
    if (!Number.isFinite(offeredPricePerNight) || offeredPricePerNight <= 0) {
      setError("Enter a valid nightly offer.");
      return;
    }
    const finalDiscountPercent = discountEnabled && discount.trim() ? Number(discount) : null;
    if (finalDiscountPercent !== null && (!Number.isFinite(finalDiscountPercent) || finalDiscountPercent < 0 || finalDiscountPercent > 100)) {
      setError("Discount must be between 0 and 100.");
      return;
    }
    if (target.minDiscountPercent && (!finalDiscountPercent || finalDiscountPercent < target.minDiscountPercent)) {
      setError(`This auction requires at least ${target.minDiscountPercent}% discount.`);
      return;
    }
    if (offers.length > MAX_SPECIAL_OFFERS) {
      setError(`Special offers cannot exceed ${MAX_SPECIAL_OFFERS} characters.`);
      return;
    }
    if (notes.length > MAX_BID_NOTES) {
      setError(`Notes cannot exceed ${MAX_BID_NOTES} characters.`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitOwnerGroupStayClaim({
        token,
        groupBookingId: target.id,
        propertyId,
        offeredPricePerNight,
        discountPercent: finalDiscountPercent,
        specialOffers: offers,
        notes
      });
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit bid.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { maxHeight: "94%" }]}>
          <View style={styles.bidModalHero}>
            <View style={styles.bidModalHeroIcon}>
              <Gavel size={22} color={colors.primary} />
            </View>
            <View style={styles.modalHeaderTitle}>
              <AppText variant="titleSm" weight="bold" tone="inverse">Place bid</AppText>
              <AppText variant="caption" style={styles.bidModalHeroSub}>{target ? groupStayTitle(target) : "Group stay request"}</AppText>
            </View>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.policyCloseButton}>
              <X size={18} color={colors.white} />
            </Pressable>
          </View>

          <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={styles.bidModalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {target ? (
              <View style={styles.bidRequestCard}>
                <View style={styles.bidRequestTop}>
                  <View style={styles.bidRequestIcon}><ClipboardList size={18} color={colors.primary} /></View>
                  <View style={styles.modalHeaderTitle}>
                    <AppText variant="bodySmall" weight="bold">{String(target.accommodationType || "Accommodation").replace(/_/g, " ")} request</AppText>
                    <AppText variant="caption" tone="muted">{[target.user?.name || "Customer", groupStayLocation(target)].filter(Boolean).join(" - ")}</AppText>
                  </View>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bidFactGrid}>
                  <BidFact icon={<Users size={13} color={colors.primary} />} label={`${Number(target.headcount ?? 0)} guests`} />
                  <BidFact icon={<Building2 size={13} color={colors.primary} />} label={`${Number(target.roomsNeeded ?? 0)} rooms`} />
                  <BidFact icon={<CalendarDays size={13} color={colors.primary} />} label={groupStayDates(target)} />
                </ScrollView>
                <View style={styles.bidDeadlineRow}>
                  <AppText variant="caption" tone="muted">{Number(target.existingClaimsCount ?? 0)} competing offers</AppText>
                  {target.submissionDeadline ? <AppText variant="caption" style={styles.deadlineText}>Due {formatGroupStayDate(target.submissionDeadline)}</AppText> : null}
                </View>
              </View>
            ) : null}

            <BidSection step="1" title="Choose eligible property" icon={<Building2 size={18} color={colors.primary} />}>
              <View style={styles.propertyList}>
                <AppText variant="caption" weight="bold" style={styles.propertySectionLabel}>Select property *</AppText>

                <View style={styles.eligibilityPanel}>
                  <View style={styles.eligibilityPanelTop}>
                    <View style={styles.eligibilityCountBadge}>
                      <AppText variant="caption" weight="bold" style={styles.eligibilityCountText}>{eligibleProperties.length}</AppText>
                    </View>
                    <View style={styles.modalHeaderTitle}>
                      <AppText variant="bodySmall" weight="bold" style={styles.eligibilityTitle}>
                        {eligibleProperties.length ? "Eligible properties ready" : "No eligible properties yet"}
                      </AppText>
                      <AppText variant="caption" tone="muted">
                        {properties.length} approved propert{properties.length === 1 ? "y" : "ies"} checked against this request.
                      </AppText>
                    </View>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.eligibilityChecklist}>
                    {["Group stay enabled", "Matching type", "Correct location", "Required rating"].map((item) => (
                      <View key={item} style={styles.eligibilityCheckChip}>
                        <CheckCircle2 size={12} color={colors.primary} />
                        <AppText variant="caption" weight="semiBold" style={styles.eligibilityCheckText}>{item}</AppText>
                      </View>
                    ))}
                  </ScrollView>
                </View>

                {eligibleProperties.length ? (
                  <View style={styles.eligiblePropertySection}>
                    <AppText variant="caption" weight="bold" style={styles.eligiblePropertyTitle}>Available to select</AppText>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ expanded: showEligibleProperties }}
                      onPress={() => setShowEligibleProperties((value) => !value)}
                      style={({ pressed }) => [styles.propertySelectField, pressed && styles.pressed]}
                    >
                      <View style={styles.propertyChoiceTop}>
                        <View style={styles.propertyChoiceIcon}>
                          <Building2 size={16} color={colors.primary} />
                        </View>
                        <View style={styles.modalHeaderTitle}>
                          <AppText variant="bodySmall" weight="bold" style={styles.propertyChoiceText} numberOfLines={1}>
                            {selectedProperty?.title || "Choose a property..."}
                          </AppText>
                          <AppText variant="caption" style={styles.propertyChoiceSub} numberOfLines={1}>
                            {selectedProperty
                              ? [
                                  selectedProperty.type,
                                  selectedProperty.district,
                                  selectedProperty.regionName,
                                  selectedProperty.basePrice ? `${selectedProperty.currency || currency} ${Number(selectedProperty.basePrice).toLocaleString("en-US")}/night` : null
                                ].filter(Boolean).join(" - ")
                              : "Eligible properties only"}
                          </AppText>
                        </View>
                        <ChevronRight size={18} color={colors.primary} style={showEligibleProperties ? styles.chevronOpen : undefined} />
                      </View>
                    </Pressable>

                    {showEligibleProperties ? (
                      <View style={styles.propertySelectMenu}>
                        {eligibleProperties.map((property) => {
                          const active = propertyId === property.id;
                          return (
                            <Pressable
                              key={property.id}
                              accessibilityRole="button"
                              onPress={() => {
                                setPropertyId(property.id);
                                const suggestedPrice = propertySuggestedNightlyPrice(property);
                                setPrice(suggestedPrice ? String(suggestedPrice) : "");
                                setShowEligibleProperties(false);
                              }}
                              style={({ pressed }) => [styles.propertySelectOption, active && styles.propertySelectOptionActive, pressed && styles.pressed]}
                            >
                              <View style={[styles.propertyChoiceIcon, active && styles.propertyChoiceIconActive]}>
                                {active ? <CheckCircle2 size={16} color={colors.white} /> : <Building2 size={16} color={colors.primary} />}
                              </View>
                              <View style={styles.modalHeaderTitle}>
                                <AppText variant="bodySmall" weight="bold" style={active ? styles.propertyChoiceTextActive : styles.propertyChoiceText} numberOfLines={1}>{property.title}</AppText>
                                <AppText variant="caption" style={active ? styles.propertyChoiceSubActive : styles.propertyChoiceSub} numberOfLines={1}>
                                  {[
                                    property.type,
                                    property.district,
                                    property.regionName,
                                    property.basePrice ? `${property.currency || currency} ${Number(property.basePrice).toLocaleString("en-US")}/night` : null
                                  ].filter(Boolean).join(" - ")}
                                </AppText>
                              </View>
                            </Pressable>
                          );
                        })}
                      </View>
                    ) : null}
                  </View>
                ) : null}

                {ineligibleProperties.length ? (
                  <View style={styles.disabledPropertySection}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ expanded: showIneligibleProperties }}
                      onPress={() => setShowIneligibleProperties((value) => !value)}
                      style={({ pressed }) => [styles.disabledPropertyHeader, pressed && styles.pressed]}
                    >
                      <View style={styles.disabledPropertyHeading}>
                        <AppText variant="bodySmall" weight="bold" style={styles.disabledPropertyTitle}>Not eligible</AppText>
                        <AppText variant="caption" tone="muted" numberOfLines={1}>Tap to see what needs fixing before this property can bid.</AppText>
                      </View>
                      <View style={styles.disabledPropertyHeaderRight}>
                        <View style={styles.disabledPropertyCount}>
                          <AppText variant="caption" weight="bold" style={styles.disabledPropertyCountText}>{ineligibleProperties.length}</AppText>
                        </View>
                        <ChevronRight size={18} color="#64748b" style={showIneligibleProperties ? styles.chevronOpen : undefined} />
                      </View>
                    </Pressable>

                    {showIneligibleProperties ? (
                      <View style={styles.disabledPropertyList}>
                        {ineligibleProperties.map(({ property, reasons }) => (
                          <View key={property.id} style={styles.disabledPropertyRow}>
                            <View style={styles.disabledPropertyTop}>
                              <View style={styles.disabledPropertyIcon}>
                                <Building2 size={15} color="#9ca3af" />
                              </View>
                              <View style={styles.modalHeaderTitle}>
                                <AppText variant="bodySmall" weight="bold" style={styles.disabledPropertyName} numberOfLines={1}>
                                  {property.title}
                                </AppText>
                                <AppText variant="caption" style={styles.disabledPropertyMeta} numberOfLines={1}>
                                  {[property.type, property.district, property.regionName].filter(Boolean).join(" - ").toUpperCase()}
                                </AppText>
                              </View>
                            </View>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.reasonChipWrap}>
                              {reasons.map((reason) => (
                                <View key={reason} style={styles.reasonChip}>
                                  <AppText variant="caption" weight="semiBold" style={styles.reasonChipText}>{reason}</AppText>
                                </View>
                              ))}
                            </ScrollView>
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </View>
            </BidSection>
            <BidSection step="2" title="Pricing & budget" subtitle="Set your nightly rate" icon={<DollarSign size={18} color={colors.primary} />}>
              <View style={styles.webFieldGridInner}>
                <WebField label="Headcount" prefix="People" value={String(Number(target?.headcount ?? 0))} readOnly />
                <WebField label="Rooms needed" prefix="Rooms" value={String(rooms)} readOnly />
                <WebField label="Price / night (per room) *" prefix={currency} value={price} onChangeText={(value) => { setPrice(value); setError(null); }} keyboardType="numeric" />
                <WebField label="Total nights" prefix="Nights" value={String(nights)} readOnly />
              </View>
              <View style={styles.totalAmountCard}>
                <View>
                  <AppText variant="caption" style={styles.totalAmountLabel}>ESTIMATED TOTAL</AppText>
                  <AppText variant="caption" tone="muted" style={{ fontSize: 10, marginTop: 1 }}>{rooms} rooms · {nights} nights</AppText>
                </View>
                <AppText variant="titleSm" weight="bold" style={styles.totalAmountValue}>
                  TSh {formatNumber(totalAfterDiscount > 0 ? totalAfterDiscount : offeredPrice * rooms * nights)}
                </AppText>
              </View>
            </BidSection>

            <BidSection
              step="3"
              title="Offer a discount"
              subtitle="Optional, sweetens your bid"
              icon={<Tag size={18} color="#9333ea" />}
              accent="#9333ea"
              headerRight={
                <Pressable accessibilityRole="switch" accessibilityState={{ checked: discountEnabled }} onPress={() => { setDiscountEnabled((value) => !value); setError(null); }} style={[styles.webSwitch, discountEnabled && styles.webSwitchOn]}>
                  <View style={[styles.webSwitchKnob, discountEnabled && styles.webSwitchKnobOn]} />
                </Pressable>
              }
            >
              {discountEnabled ? (
                <View style={styles.webFieldGridInner}>
                  <WebSelectField label="Discount type" value="Percentage (%)" onPress={() => undefined} />
                  <WebField label="Discount percentage" prefix="%" value={discount} onChangeText={(value) => { setDiscount(value); setError(null); }} keyboardType="numeric" helper="0 to 100%" />
                </View>
              ) : (
                <AppText variant="caption" tone="muted">Turn on to add a percentage discount to your offer.</AppText>
              )}

              {target?.minDiscountPercent ? (
                <View style={styles.discountRequiredNote}>
                  <AppText variant="caption" weight="bold" style={{ color: "#7c3aed", fontSize: 11 }}>This auction requires at least {target.minDiscountPercent}% discount.</AppText>
                </View>
              ) : null}

              {Number.isFinite(offeredPrice) && offeredPrice > 0 ? (
                <View style={styles.discountSummaryCard}>
                  <View style={styles.discountSummaryHeader}>
                    <View style={styles.discountSummaryIcon}>
                      <Percent size={18} color={colors.white} />
                    </View>
                    <AppText variant="bodySmall" weight="bold" style={styles.discountSummaryTitle}>Discount calculation</AppText>
                  </View>
                  <View style={styles.discountSummaryRows}>
                    <DiscountSummaryRow label="Original price per night" value={formatGroupStayMoney(offeredPrice, currency)} />
                    <DiscountSummaryRow label="Discount applied" value={discountEnabled && discountPercent && discountPercent > 0 ? `${discountPercent}%` : "0%"} valueStyle={styles.discountSummaryPurple} tinted />
                    <DiscountSummaryRow label="Discount amount" value={discountEnabled && discountAmount > 0 ? `-${formatGroupStayMoney(discountAmount, currency)}` : formatGroupStayMoney(0, currency)} valueStyle={styles.discountSummaryRed} danger />
                    <DiscountSummaryRow label="Price per night (after discount)" value={formatGroupStayMoney(discountEnabled ? priceAfterDiscount : offeredPrice, currency)} valueStyle={styles.discountSummaryGreen} success strong />
                    <DiscountSummaryRow label="Total amount (after discount)" value={formatGroupStayMoney(discountEnabled ? totalAfterDiscount : offeredPrice * rooms * nights, currency)} valueStyle={styles.discountSummaryTotalValue} total strong />
                    <DiscountSummaryRow label="Savings" value={formatGroupStayMoney(discountEnabled ? totalSavings : 0, currency)} />
                  </View>
                </View>
              ) : null}
            </BidSection>
            <BidSection step="4" title="Special offers" subtitle="Extra services for the group" icon={<Gift size={18} color={colors.primary} />}>
              {/* Owner guidance note */}
              <View style={styles.serviceNoteBox}>
                <View style={styles.serviceNoteIcon}>
                  <Gift size={16} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="caption" weight="bold" style={{ color: colors.primaryDeep }}>
                    What are special offers?
                  </AppText>
                  <AppText variant="caption" tone="muted" style={{ marginTop: 3, lineHeight: 17 }}>
                    These are additional services your group will receive on arrival or during their stay: meals, transport, activities, room extras and more. They strengthen your bid and make it more attractive to the organiser.
                  </AppText>
                  <View style={styles.serviceNoteWarning}>
                    <AppText variant="caption" weight="bold" style={{ color: "#92400e", fontSize: 11 }}>
                      Only select services you can genuinely provide.
                    </AppText>
                  </View>
                </View>
              </View>
              <View style={styles.serviceCategoryList}>
                {BID_SERVICE_CATEGORIES.map((cat) => (
                  <View key={cat.label} style={styles.serviceCategory}>
                    <View style={styles.serviceCategoryHead}>
                      <AppText style={styles.serviceCategoryIcon}>{cat.icon}</AppText>
                      <AppText variant="caption" weight="bold" style={styles.serviceCategoryLabel}>{cat.label}</AppText>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.serviceCategoryChips}>
                      {cat.services.map((service) => {
                        const active = selectedServices.includes(service);
                        return (
                          <Pressable
                            key={service}
                            accessibilityRole="checkbox"
                            accessibilityState={{ checked: active }}
                            onPress={() => toggleService(service)}
                            style={({ pressed }) => [styles.serviceChip, active && styles.serviceChipActive, pressed && styles.pressed]}
                          >
                            {active
                              ? <CheckCircle2 size={13} color={colors.white} />
                              : <Plus size={13} color={colors.primary} />}
                            <AppText variant="caption" weight="semiBold" style={active ? styles.serviceChipTextActive : styles.serviceChipText}>
                              {service}
                            </AppText>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                ))}
              </View>
              <TextInput value={offers} onChangeText={handleOffersChange} multiline textAlignVertical="top" placeholder="Selected services appear here, or type custom offers..." placeholderTextColor={colors.softText} style={styles.bidTextarea} />
              <AppText variant="caption" tone="muted">{offers.length}/{MAX_SPECIAL_OFFERS}</AppText>
            </BidSection>

            <BidSection step="5" title="Notes" subtitle="Add room setup or conditions" icon={<FileText size={18} color={colors.primary} />}>
              <TextInput value={notes} onChangeText={handleNotesChange} multiline textAlignVertical="top" placeholder="Availability, room setup, conditions..." placeholderTextColor={colors.softText} style={styles.bidTextarea} />
              <AppText variant="caption" tone="muted" style={{ alignSelf: "flex-end" }}>{notes.length}/{MAX_BID_NOTES}</AppText>
            </BidSection>

            {error ? (
              <View style={styles.errorBox}>
                <AppText variant="bodySmall" tone="danger">{error}</AppText>
              </View>
            ) : null}
          </ScrollView>

          {/* Sticky submit footer */}
          <View style={styles.bidFooterBar}>
            <View style={styles.bidFooterTotal}>
              <AppText variant="caption" tone="muted" style={{ fontSize: 10 }}>YOUR OFFER</AppText>
              <AppText variant="bodySmall" weight="bold" style={{ color: colors.primaryDeep }}>
                {Number.isFinite(offeredPrice) && offeredPrice > 0
                  ? `TSh ${formatNumber(totalAfterDiscount > 0 ? totalAfterDiscount : offeredPrice * rooms * nights)}`
                  : "TSh 0"}
              </AppText>
            </View>
            <Pressable onPress={submit} disabled={submitting} style={({ pressed }) => [styles.bidSubmitBtn, pressed && { opacity: 0.85 }, submitting && { opacity: 0.7 }]}>
              {submitting ? <ActivityIndicator color={colors.white} size="small" /> : <Gavel size={17} color={colors.white} />}
              <AppText variant="bodySmall" weight="bold" tone="inverse">{submitting ? "Submitting..." : "Submit offer"}</AppText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Info({ icon, label, value, wide }: { icon: React.ReactNode; label: string; value: string; wide?: boolean }) {
  return (
    <View style={[styles.info, wide && styles.infoWide]}>
      {icon}
      <View style={styles.cardTitle}>
        <AppText variant="caption" tone="muted">
          {label}
        </AppText>
        <AppText variant="bodySmall" weight="semiBold" numberOfLines={2}>
          {value}
        </AppText>
      </View>
    </View>
  );
}

function MetaPill({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <View style={styles.metaPill}>
      {icon}
      <AppText variant="caption" weight="semiBold" style={styles.metaPillText} numberOfLines={1}>
        {value}
      </AppText>
    </View>
  );
}

function stayBadge(status?: string | null): "paid" | "failed" | "awaiting" | "approved" | "pending" {
  const s = String(status || "").toUpperCase();
  if (s === "CONFIRMED" || s === "COMPLETED") return "paid";
  if (s === "CANCELED" || s === "CANCELLED") return "failed";
  if (s === "PROCESSING") return "approved";
  if (s === "PENDING") return "awaiting";
  return "pending";
}

function claimBadge(status?: string | null): "paid" | "failed" | "awaiting" | "approved" | "pending" {
  const s = String(status || "").toUpperCase();
  if (s === "ACCEPTED") return "paid";
  if (s === "REJECTED" || s === "WITHDRAWN") return "failed";
  if (s === "PENDING") return "awaiting";
  return "pending";
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  scroll: { padding: spacing[3], paddingBottom: spacing[8], gap: spacing[3] },

  // Dark hero
  hero: { borderRadius: radius.xl, backgroundColor: colors.primaryDeep, padding: spacing[4], gap: spacing[3], overflow: "hidden" },
  heroTop: { flexDirection: "row", alignItems: "center", gap: spacing[3] },
  heroIconWrap: { width: 46, height: 46, borderRadius: radius.lg, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  heroEyebrow: { color: colors.onHeroSoft, letterSpacing: 1.5 },
  refreshButton: { width: 38, height: 38, borderRadius: radius.full, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.12)" },
  heroSub: { color: colors.onHeroSoft },
  summaryRail: { flexDirection: "row", alignItems: "center", borderRadius: radius.lg, backgroundColor: "rgba(255,255,255,0.10)", borderWidth: 1, borderColor: "rgba(255,255,255,0.13)", paddingVertical: spacing[3], paddingHorizontal: spacing[2] },
  summaryItem: { flex: 1, alignItems: "center", gap: 2, position: "relative" },
  summaryDivider: {},
  summaryDividerLine: { position: "absolute", right: 0, top: 4, bottom: 4, width: 1, backgroundColor: "rgba(255,255,255,0.13)" },
  summaryLabel: { color: colors.onHeroSoft, textAlign: "center" },

  // Light segment control
  segmentWrap: { gap: spacing[2] },
  segmentControl: { flexDirection: "row", borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, padding: 4 },
  segmentChip: { flex: 1, minHeight: 40, borderRadius: radius.lg, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: spacing[2], paddingHorizontal: spacing[2] },
  segmentChipActive: { backgroundColor: colors.primary },
  segmentText: { color: colors.primaryDeep },
  segmentTextActive: { color: colors.white },
  segmentBadge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.brand[100], alignItems: "center", justifyContent: "center", paddingHorizontal: spacing[1] },
  segmentBadgeActive: { backgroundColor: "rgba(255,255,255,0.25)" },
  segmentBadgeText: { color: colors.primary, fontSize: 11 },
  segmentBadgeTextActive: { color: colors.white, fontSize: 11 },
  contextHint: { textAlign: "center" },

  // Light search
  searchRow: { flexDirection: "row", alignItems: "center", gap: spacing[2], borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, paddingLeft: spacing[3], paddingRight: spacing[2], height: 46 },
  searchInput: { flex: 1, fontSize: 14, color: colors.ink, padding: 0 },
  searchClear: { padding: 4 },
  searchDivider: { width: 1, height: 20, backgroundColor: colors.border },
  filterIconBtn: { width: 34, height: 34, borderRadius: radius.lg, alignItems: "center", justifyContent: "center", backgroundColor: colors.brand[50] },

  // Filter chips (light)
  filterRow: { flexDirection: "row", alignItems: "center", gap: spacing[2], paddingVertical: spacing[1], paddingRight: spacing[3] },
  filterChip: { flexDirection: "row", alignItems: "center", gap: spacing[1], borderRadius: radius.full, borderWidth: 1, borderColor: colors.brand[100], backgroundColor: colors.white, paddingHorizontal: spacing[3], paddingVertical: spacing[2] },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primaryDark },
  filterText: { color: colors.primary },
  filterTextActive: { color: colors.white },

  // White cards
  list: { gap: spacing[3] },
  card: { gap: 0, position: "relative", overflow: "hidden", borderColor: colors.border, backgroundColor: colors.white },
  cardAssigned: { backgroundColor: "#ffffff" },
  cardAvailable: { backgroundColor: "#fffdf8" },
  cardClaim: { backgroundColor: "#fbfdff" },
  cardAccentBar: { height: 3, width: "100%" },
  cardBody: { padding: spacing[4], gap: spacing[3] },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  mark: { width: 40, height: 40, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  deadlineText: { color: colors.accent.amberDark },

  // Meta pills (light)
  metaPills: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2] },
  metaPill: { flexDirection: "row", alignItems: "center", gap: spacing[1], borderRadius: radius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing[3], paddingVertical: spacing[2], maxWidth: "100%" },
  metaPillText: { color: colors.primaryDeep, maxWidth: 210 },

  // Bid footer
  bidFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing[3], gap: spacing[3] },

  // Offer panel (light)
  offerPanel: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: radius.lg, borderWidth: 1, borderColor: colors.brand[100], backgroundColor: colors.brand[50], padding: spacing[3], gap: spacing[3] },
  offerValue: { color: colors.primary, maxWidth: 190 },
  offerTotal: { alignItems: "flex-end", flex: 1, minWidth: 0 },

  // Note / info boxes
  noteBox: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: spacing[3], gap: spacing[1] },
  errorBox: { borderRadius: radius.md, borderWidth: 1, borderColor: "#fecaca", backgroundColor: "#fef2f2", padding: spacing[3] },
  loadingBox: { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, padding: spacing[6], alignItems: "center", gap: spacing[2] },
  refreshingRow: { alignItems: "center", padding: spacing[2] },

  // Assigned stay detail modal
  assignedHeader: { flexDirection: "row", alignItems: "center", gap: spacing[3], padding: spacing[4], borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.brand[50] },
  assignedHeaderIcon: { width: 48, height: 48, borderRadius: radius.xl, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  assignedTitleRow: { flexDirection: "row", alignItems: "center", gap: spacing[2], flexWrap: "wrap" },
  depositBadge: { paddingHorizontal: spacing[2], paddingVertical: 4, borderRadius: radius.full, backgroundColor: colors.primaryDeep },
  depositBadgeText: { color: colors.white, fontSize: 10, letterSpacing: 0.5 },
  assignedBody: { padding: spacing[4], gap: spacing[4], paddingBottom: spacing[8] },
  assignedCongrats: { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.brand[100], backgroundColor: colors.brand[50], padding: spacing[3] },
  assignedCongratsText: { color: colors.primaryDeep, lineHeight: 22 },
  infoGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing[3] },
  infoCell: { width: "47%", flexDirection: "row", alignItems: "flex-start", gap: spacing[2], borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: spacing[3] },
  infoCellIcon: { width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.brand[50], alignItems: "center", justifyContent: "center", flexShrink: 0 },
  infoCellLabel: { fontSize: 9, color: colors.primary, letterSpacing: 0.8, textTransform: "uppercase" },
  infoCellValue: { color: colors.primaryDeep, marginTop: 2, lineHeight: 18 },
  collectCard: { flexDirection: "row", alignItems: "flex-start", gap: spacing[3], borderRadius: radius.lg, borderWidth: 1, borderColor: colors.brand[100], backgroundColor: colors.brand[50], padding: spacing[4] },
  collectCardIcon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.brand[100], alignItems: "center", justifyContent: "center", flexShrink: 0 },
  // Group details section
  groupDetailsCard: { borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  groupDetailsHeader: { flexDirection: "row", alignItems: "center", gap: spacing[2], backgroundColor: colors.primaryDeep, paddingHorizontal: spacing[4], paddingVertical: spacing[3] },
  groupDetailsHeaderIcon: { width: 28, height: 28, borderRadius: radius.md, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  groupDetailsBody: { backgroundColor: colors.white, padding: spacing[4], gap: spacing[3] },
  groupDetailsRow: { flexDirection: "row", gap: spacing[3] },
  groupDetailCell: { flex: 1, gap: spacing[1] },
  headcountCard: { flex: 1, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.brand[100], backgroundColor: colors.brand[50], padding: spacing[3], gap: spacing[1], position: "relative", overflow: "hidden" },
  headcountRow: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  headcountFooter: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: spacing[1] },
  headcountBadge: { position: "absolute", bottom: spacing[2], right: spacing[2], width: 34, height: 34, borderRadius: radius.md, backgroundColor: colors.brand[100], alignItems: "center", justifyContent: "center" },
  pickupDetailsCard: { borderRadius: radius.xl, backgroundColor: "#eff6ff", borderWidth: 1, borderColor: "#dbeafe", padding: spacing[4], gap: spacing[3] },
  pickupDetailsHeader: { flexDirection: "row", alignItems: "center", gap: spacing[3] },
  pickupDetailsIcon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: "#dbeafe", alignItems: "center", justifyContent: "center" },
  pickupDetailsTitle: { color: "#173b8f" },
  pickupDetailsRows: { gap: spacing[2], paddingLeft: 52 },
  pickupDetailsRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing[3] },
  pickupDetailsLabel: { width: 86, color: "#174ea6" },
  pickupDetailsValue: { flex: 1, color: "#173b8f" },
  // Roster
  rosterScroll: { padding: spacing[4], paddingBottom: spacing[8] },
  rosterCenter: { alignItems: "center", paddingVertical: spacing[8], gap: spacing[2] },
  rosterGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing[3] },
  rosterCard: { width: "47.5%", borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: spacing[3], gap: spacing[3] },
  rosterCardHead: { flexDirection: "row", alignItems: "flex-start", gap: spacing[2] },
  rosterCardIcon: { width: 38, height: 38, borderRadius: radius.md, backgroundColor: colors.brand[50], borderWidth: 1, borderColor: colors.brand[100], alignItems: "center", justifyContent: "center", flexShrink: 0 },
  rosterNum: { color: colors.primary, fontSize: 10, fontWeight: "700" },
  rosterCardDetails: { gap: 3 },
  rosterPhone: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  rosterAddedAt: { color: colors.softText, fontSize: 10, marginTop: spacing[1] },
  assignedActions: { gap: spacing[3] },
  assignedSecondaryRow: { flexDirection: "row", gap: spacing[3] },
  assignedSecondaryBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing[2], paddingVertical: spacing[3], borderRadius: radius.xl, backgroundColor: colors.brand[50], borderWidth: 1, borderColor: colors.brand[100] },
  assignedSecondaryBtnOutline: { backgroundColor: colors.white },
  // Claim detail tap hint
  detailTapHint: { alignItems: "center", paddingTop: spacing[1], borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing[1] },
  // Claim detail modal
  detailHeader: { flexDirection: "row", alignItems: "center", gap: spacing[2], padding: spacing[4], borderBottomWidth: 1, borderBottomColor: colors.border },
  detailBody: { padding: spacing[4], gap: spacing[4], paddingBottom: spacing[8] },
  detailOfferPanel: { flexDirection: "row", borderRadius: radius.lg, borderWidth: 1, padding: spacing[4] },
  detailOfferCell: { flex: 1, gap: spacing[1] },
  detailOfferDivider: { width: 1, backgroundColor: colors.border, marginHorizontal: spacing[3] },
  detailSection: { gap: spacing[1], borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: spacing[3] },
  detailSectionLabel: { color: colors.softText, fontSize: 10, letterSpacing: 0.8 },
  // Bid modal (light sheet)
  modalOverlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.42)", justifyContent: "flex-end", padding: spacing[2] },
  modalSheet: { maxHeight: "90%", borderRadius: radius.xl, backgroundColor: colors.white, overflow: "hidden" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing[4], borderBottomWidth: 1, borderBottomColor: colors.border },
  modalHeaderTitle: { flex: 1, minWidth: 0 },
  closeButton: { width: 38, height: 38, borderRadius: radius.full, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  modalBody: { padding: spacing[4], gap: spacing[3] },
  messageBody: { padding: spacing[4], gap: spacing[3] },
  messageInput: { minHeight: 170, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, color: colors.ink, fontSize: 14, lineHeight: 20, padding: spacing[3] },
  successBox: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.brand[100], backgroundColor: colors.brand[50], padding: spacing[3] },
  successText: { color: colors.primary },
  checkinConfirmHeader: { flexDirection: "row", alignItems: "center", gap: spacing[3], padding: spacing[4], backgroundColor: colors.primary },
  checkinConfirmIcon: { width: 42, height: 42, borderRadius: radius.lg, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  checkinConfirmSub: { color: colors.onHeroSoft },
  checkinConfirmBody: { padding: spacing[4], gap: spacing[4], paddingBottom: spacing[6] },
  checkinSummaryCard: { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.brand[100], backgroundColor: colors.brand[50], padding: spacing[3], gap: spacing[1] },
  checkinTermsList: { gap: spacing[2] },
  checkinTermRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing[2], borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: spacing[3] },
  checkinTermText: { flex: 1, lineHeight: 18 },
  checkinAgreeRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing[3], borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.white, padding: spacing[3] },
  checkinAgreeRowActive: { borderColor: colors.primary, backgroundColor: colors.brand[50] },
  checkinCheckbox: { width: 24, height: 24, borderRadius: radius.sm, borderWidth: 1.5, borderColor: colors.border, alignItems: "center", justifyContent: "center", backgroundColor: colors.white },
  checkinCheckboxActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  checkinAgreeText: { flex: 1, color: colors.primaryDeep, lineHeight: 20 },
  checkinConfirmActions: { flexDirection: "row", gap: spacing[3] },
  policyHeader: { flexDirection: "row", alignItems: "center", gap: spacing[3], padding: spacing[4], backgroundColor: colors.primary },
  policyHeaderIcon: { width: 40, height: 40, borderRadius: radius.lg, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  policyHeaderSub: { color: colors.onHeroSoft },
  policyCloseButton: { width: 36, height: 36, borderRadius: radius.lg, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  policyBody: { padding: spacing[4], gap: spacing[3], paddingBottom: spacing[6] },
  policyRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing[3], borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: spacing[3] },
  policyRowIcon: { width: 38, height: 38, borderRadius: radius.md, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  policyRowText: { flex: 1, minWidth: 0, gap: 3 },
  policyRowBody: { lineHeight: 18 },
  bidModalHero: { flexDirection: "row", alignItems: "center", gap: spacing[3], paddingHorizontal: spacing[4], paddingVertical: spacing[4], backgroundColor: colors.primaryDeep, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" },
  bidModalHeroIcon: { width: 48, height: 48, borderRadius: radius.xl, backgroundColor: "#fff7e6", alignItems: "center", justifyContent: "center", flexShrink: 0, borderWidth: 1, borderColor: "#fde68a" },
  bidModalHeroSub: { color: colors.onHeroSoft, marginTop: 2 },
  bidModalBody: { padding: spacing[4], gap: spacing[4], paddingBottom: spacing[8], backgroundColor: colors.surface },
  bidRequestCard: { borderRadius: radius.xl, backgroundColor: "#fffdf5", borderWidth: 1, borderColor: "#f0e0b0", padding: spacing[4], gap: spacing[3] },
  bidRequestTop: { flexDirection: "row", alignItems: "center", gap: spacing[3] },
  bidRequestIcon: { width: 44, height: 44, borderRadius: radius.lg, backgroundColor: "#fff4d0", borderWidth: 1, borderColor: "#f0d990", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  bidFactGrid: { flexDirection: "row", gap: spacing[2], paddingVertical: 2, paddingRight: spacing[2] },
  bidFact: { flexDirection: "row", alignItems: "center", gap: spacing[1], borderRadius: radius.full, borderWidth: 1, borderColor: "#d6e8d4", backgroundColor: colors.white, paddingHorizontal: spacing[3], paddingVertical: spacing[2], flexShrink: 0 },
  bidFactText: { color: colors.primaryDeep },
  bidDeadlineRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing[3], borderTopWidth: 1, borderTopColor: "#e8dfc0", paddingTop: spacing[3] },
  bidSection: { borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  bidSectionHeader: { flexDirection: "row", alignItems: "center", gap: spacing[2], paddingHorizontal: spacing[4], paddingVertical: spacing[3], backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  bidStepBadge: { width: 26, height: 26, borderRadius: radius.full, backgroundColor: colors.primaryDeep, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  bidStepText: { color: colors.white, fontSize: 12, fontWeight: "700" },
  bidSectionIcon: { width: 32, height: 32, borderRadius: radius.md, backgroundColor: colors.brand[50], alignItems: "center", justifyContent: "center" },
  bidSectionTitle: { color: colors.primaryDeep, fontSize: 14, fontWeight: "700" },
  bidSectionSubtitle: { fontSize: 11, marginTop: 1 },
  bidSectionBody: { padding: spacing[4], gap: spacing[3], backgroundColor: colors.surface },
  // Pricing inner grid + total
  webFieldGridInner: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2] },
  totalAmountCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: radius.lg, backgroundColor: colors.primaryDeep, paddingHorizontal: spacing[4], paddingVertical: spacing[3] },
  totalAmountLabel: { color: "rgba(255,255,255,0.6)", fontSize: 10, letterSpacing: 0.6 },
  totalAmountValue: { color: colors.white },
  discountRequiredNote: { borderRadius: radius.md, backgroundColor: "#f3e8ff", borderWidth: 1, borderColor: "#e9d5ff", paddingHorizontal: spacing[3], paddingVertical: spacing[2] },
  discountSummaryCard: { borderRadius: radius.xl, backgroundColor: colors.white, borderWidth: 1, borderColor: "#e5e7eb", padding: spacing[3], gap: spacing[3] },
  discountSummaryHeader: { flexDirection: "row", alignItems: "center", gap: spacing[3], paddingBottom: spacing[1] },
  discountSummaryIcon: { width: 38, height: 38, borderRadius: radius.md, backgroundColor: "#9333ea", alignItems: "center", justifyContent: "center", shadowColor: "#9333ea", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.22, shadowRadius: 4, elevation: 2 },
  discountSummaryTitle: { color: colors.ink, fontSize: 16 },
  discountSummaryRows: { gap: spacing[2] },
  discountSummaryRow: { minHeight: 48, borderRadius: radius.md, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing[3], paddingHorizontal: spacing[3], paddingVertical: spacing[2], backgroundColor: "#ffffff" },
  discountSummaryRowTinted: { backgroundColor: "#faf5ff" },
  discountSummaryRowDanger: { backgroundColor: "#fff7f7" },
  discountSummaryRowSuccess: { backgroundColor: "#f0fdf4" },
  discountSummaryRowTotal: { minHeight: 58, backgroundColor: "#ecfdf5", marginTop: spacing[2] },
  discountSummaryLabel: { color: "#334155", flex: 1 },
  discountSummaryTotalLabel: { color: colors.ink, flex: 1 },
  discountSummaryValue: { color: colors.ink, textAlign: "right", flexShrink: 0 },
  discountSummaryPurple: { color: "#7e22ce" },
  discountSummaryRed: { color: "#dc2626" },
  discountSummaryGreen: { color: "#15803d" },
  discountSummaryTotalValue: { color: "#15803d" },
  // Sticky footer
  bidFooterBar: { flexDirection: "row", alignItems: "center", gap: spacing[3], paddingHorizontal: spacing[4], paddingVertical: spacing[3], borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.white },
  bidFooterTotal: { gap: 1 },
  bidSubmitBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing[2], borderRadius: radius.full, backgroundColor: colors.primary, paddingVertical: spacing[3] },
  // Preview card
  bidPreviewTitle: { color: colors.softText, fontSize: 10, letterSpacing: 0.6, marginBottom: spacing[1] },
  bidPreviewDivider: { height: 1, backgroundColor: colors.brand[100], marginVertical: spacing[1] },
  discountToggle: { flexDirection: "row", alignItems: "center", gap: spacing[3], borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: spacing[3] },
  discountToggleActive: { borderColor: "#c4b5fd", backgroundColor: "#faf5ff" },
  discountKnob: { width: 34, height: 22, borderRadius: radius.full, backgroundColor: colors.border },
  discountKnobActive: { backgroundColor: "#7c3aed" },
  discountToggleText: { color: colors.primaryDeep },
  discountToggleTextActive: { color: "#5b21b6" },
  discountToggleSub: { color: colors.softText },
  discountToggleSubActive: { color: "#6d28d9" },
  // Pricing & Budget section
  webPricingSection: { borderRadius: radius.xl, overflow: "hidden", borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, gap: 0 },
  webPricingHeader: { flexDirection: "row", alignItems: "center", gap: spacing[2], paddingHorizontal: spacing[4], paddingVertical: spacing[3], backgroundColor: colors.primaryDeep, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" },
  webPricingHeaderIcon: { width: 30, height: 30, borderRadius: radius.md, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  webDiscountSection: { borderRadius: radius.xl, borderWidth: 1, borderColor: "#e9d5ff", backgroundColor: "#fdfaff", padding: spacing[4], gap: spacing[4] },
  webSectionTitle: { color: colors.white, fontSize: 15, fontWeight: "700" },
  webFieldGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2], padding: spacing[3] },
  webFieldWrap: { width: "48%", gap: spacing[1], flexGrow: 0 },
  webFieldLabel: { color: colors.softText, fontSize: 11, fontWeight: "600", letterSpacing: 0.3 },
  webInputBox: {
    height: 54, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface, flexDirection: "row", alignItems: "center",
    paddingHorizontal: spacing[3], gap: spacing[2], overflow: "hidden"
  },
  webInputBoxHighlight: { borderColor: "#a855f7", backgroundColor: "#fdfcff", borderWidth: 1.5 },
  webInputPrefix: { paddingHorizontal: spacing[2], height: 32, borderRadius: radius.md, backgroundColor: colors.border, alignItems: "center", justifyContent: "center", minWidth: 48 },
  webInputPrefixHighlight: { backgroundColor: "#f3e8ff" },
  webInputPrefixText: { color: colors.softText, fontSize: 11, fontWeight: "600" },
  webInputPrefixTextHighlight: { color: "#9333ea", fontSize: 11, fontWeight: "600" },
  webInput: { flex: 1, minWidth: 0, color: colors.ink, fontSize: 15, paddingVertical: 0 },
  webInputReadOnly: { color: colors.primaryDeep, fontWeight: "700", fontSize: 18 },
  webFieldHelper: { color: "#64748b", fontSize: 10, paddingLeft: spacing[1] },
  webSelectBox: { justifyContent: "space-between" },
  webSelectValue: { flex: 1, color: colors.ink, fontSize: 14 },
  webDiscountHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing[3] },
  webDiscountTitleRow: { flexDirection: "row", alignItems: "center", gap: spacing[3], flex: 1, minWidth: 0 },
  webSwitch: { width: 66, height: 34, borderRadius: radius.full, backgroundColor: "#e2e8f0", justifyContent: "center", padding: 3 },
  webSwitchOn: { backgroundColor: "#9333ea" },
  webSwitchKnob: { width: 28, height: 28, borderRadius: radius.full, backgroundColor: colors.white, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.18, shadowRadius: 2, elevation: 2 },
  webSwitchKnobOn: { alignSelf: "flex-end" },
  serviceNoteBox: { flexDirection: "row", alignItems: "flex-start", gap: spacing[3], borderRadius: radius.lg, borderWidth: 1, borderColor: colors.brand[100], backgroundColor: colors.brand[50], padding: spacing[3] },
  serviceNoteIcon: { width: 32, height: 32, borderRadius: radius.md, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.brand[100], alignItems: "center", justifyContent: "center", flexShrink: 0 },
  serviceNoteWarning: { marginTop: spacing[2], paddingHorizontal: spacing[2], paddingVertical: spacing[1], borderRadius: radius.md, backgroundColor: "#fef9c3", borderWidth: 1, borderColor: "#fde68a", alignSelf: "flex-start" },
  serviceCategoryList: { gap: spacing[3] },
  serviceCategory: { gap: spacing[2] },
  serviceCategoryHead: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  serviceCategoryIcon: { fontSize: 14 },
  serviceCategoryLabel: { fontSize: 11, color: colors.primaryDeep, letterSpacing: 0.5, textTransform: "uppercase" },
  serviceCategoryChips: { flexDirection: "row", gap: spacing[2], paddingVertical: 2, paddingRight: spacing[2] },
  serviceChip: { flexDirection: "row", alignItems: "center", gap: spacing[1], borderRadius: radius.full, borderWidth: 1, borderColor: colors.brand[100], backgroundColor: colors.white, paddingHorizontal: spacing[3], paddingVertical: spacing[2], flexShrink: 0 },
  serviceChipActive: { backgroundColor: colors.primary, borderColor: colors.primaryDark },
  serviceChipText: { color: colors.primary, maxWidth: 150 },
  serviceChipTextActive: { color: colors.white, maxWidth: 150 },
  serviceGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2] },
  bidTextarea: { minHeight: 96, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, color: colors.ink, fontSize: 14, lineHeight: 20, padding: spacing[3] },
  bidPreviewCard: { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.brand[100], backgroundColor: colors.brand[50], padding: spacing[3], gap: spacing[2] },
  previewRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing[3] },
  previewLabel: { flex: 1 },
  previewValue: { color: colors.primaryDeep, textAlign: "right" },
  previewValueStrong: { color: colors.primary, textAlign: "right" },
  propertyList: { gap: spacing[3] },
  propertySectionLabel: { color: colors.primaryDeep, textTransform: "uppercase", letterSpacing: 1, fontSize: 11, fontWeight: "700" },
  // Eligibility panel
  eligibilityPanel: { borderRadius: radius.xl, borderWidth: 1, borderColor: colors.brand[100], backgroundColor: "#f0fdf8", padding: spacing[4], gap: spacing[3] },
  eligibilityPanelTop: { flexDirection: "row", alignItems: "center", gap: spacing[3] },
  eligibilityCountBadge: { width: 42, height: 42, borderRadius: radius.full, backgroundColor: colors.primaryDeep, alignItems: "center", justifyContent: "center", flexShrink: 0, borderWidth: 2, borderColor: colors.primary },
  eligibilityCountText: { color: colors.white, fontSize: 17, fontWeight: "800" },
  eligibilityTitle: { color: colors.primaryDeep, fontWeight: "700" },
  eligibilityChecklist: { flexDirection: "row", gap: spacing[2], paddingVertical: 2 },
  eligibilityCheckChip: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: radius.full, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.brand[100], paddingHorizontal: spacing[3], paddingVertical: 6 },
  eligibilityCheckText: { color: colors.primary, fontSize: 11, fontWeight: "600" },
  eligiblePropertySection: { gap: spacing[2] },
  eligiblePropertyTitle: { color: colors.primary, textTransform: "uppercase", letterSpacing: 0.8, fontSize: 10, fontWeight: "700" },
  // Property choice cards
  propertySelectField: { borderRadius: radius.xl, borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.white, padding: spacing[3] },
  propertySelectMenu: { borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, overflow: "hidden" },
  propertySelectOption: { flexDirection: "row", alignItems: "center", gap: spacing[3], padding: spacing[3], borderBottomWidth: 1, borderBottomColor: colors.border },
  propertySelectOptionActive: { backgroundColor: colors.primary },
  propertyChoice: { borderRadius: radius.xl, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.white, padding: spacing[3], gap: spacing[1] },
  propertyChoiceElevated: { borderColor: colors.brand[100], backgroundColor: colors.white, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  propertyChoiceTop: { flexDirection: "row", alignItems: "center", gap: spacing[3] },
  propertyChoiceIcon: { width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.brand[50], alignItems: "center", justifyContent: "center", flexShrink: 0, borderWidth: 1, borderColor: colors.brand[100] },
  propertyChoiceIconActive: { backgroundColor: "rgba(255,255,255,0.2)", borderColor: "rgba(255,255,255,0.3)" },
  propertyChoiceActive: { backgroundColor: colors.primary, borderColor: colors.primaryDark },
  propertyChoiceText: { color: colors.primaryDeep, fontWeight: "600" },
  propertyChoiceTextActive: { color: colors.white, fontWeight: "700" },
  propertyChoiceSub: { color: colors.softText },
  propertyChoiceSubActive: { color: colors.onHeroSoft },
  // Ineligible properties
  disabledPropertySection: { borderRadius: radius.xl, borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#f9fafb", overflow: "hidden" },
  disabledPropertyHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing[3] },
  disabledPropertyHeading: { flex: 1, minWidth: 0, paddingVertical: spacing[3], paddingLeft: spacing[3] },
  disabledPropertyHeaderRight: { flexDirection: "row", alignItems: "center", gap: spacing[2], paddingRight: spacing[3] },
  disabledPropertyTitle: { color: "#374151", fontWeight: "600" },
  disabledPropertyCount: { minWidth: 24, height: 24, borderRadius: radius.full, backgroundColor: "#e5e7eb", alignItems: "center", justifyContent: "center", paddingHorizontal: spacing[2] },
  disabledPropertyCountText: { color: "#6b7280", fontSize: 12 },
  chevronOpen: { transform: [{ rotate: "90deg" }] },
  disabledPropertyList: { borderTopWidth: 1, borderTopColor: "#e5e7eb", padding: spacing[3], gap: spacing[3] },
  disabledPropertyRow: { borderRadius: radius.lg, borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#ffffff", padding: spacing[3], gap: spacing[2] },
  disabledPropertyTop: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  disabledPropertyIcon: { width: 34, height: 34, borderRadius: radius.md, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  disabledPropertyName: { color: "#6b7280", fontWeight: "500" },
  disabledPropertyMeta: { color: "#9ca3af", fontSize: 11 },
  reasonChipWrap: { flexDirection: "row", gap: spacing[2], paddingLeft: 42, paddingVertical: 2 },
  reasonChip: { borderRadius: radius.full, backgroundColor: "#fff7ed", borderWidth: 1, borderColor: "#fed7aa", paddingHorizontal: spacing[2], paddingVertical: 4 },
  reasonChipText: { color: "#c2410c", fontSize: 11, fontWeight: "500" },
  pressed: { opacity: 0.78 },
  info: { flexDirection: "row", alignItems: "flex-start", gap: spacing[2], flex: 1 },
  cardTitle: { flex: 1, minWidth: 0 },
  infoWide: { flexBasis: "100%" },
});
