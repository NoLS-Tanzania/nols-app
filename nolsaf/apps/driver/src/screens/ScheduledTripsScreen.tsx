import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AmountText, AppButton, AppCard, AppStack, AppText, CodeText, colors, radius, shadows, spacing, StateView } from "@nolsaf/native-ui";
import { ArrowLeft, BadgeCheck, Bike, Car, Check, CheckCircle2, ChevronRight, Clock, FileText, Hourglass, MapPin, PartyPopper, ShieldCheck, Star, Truck, Users, Wallet, X } from "lucide-react-native";
import { ReactNode, useCallback, useEffect, useState } from "react";
import { Alert, Linking, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";

import { useAuth } from "../auth/AuthProvider";
import { formatTripWhen } from "../components/TripCard";
import { claimPayout, claimTrip, fetchAssignedScheduledTrips, fetchClaimsFinished, fetchClaimsPending, fetchScheduledTrips } from "../driver/driverApi";
import { ClaimItem, FinishedClaimItem, ScheduledTripItem } from "../driver/types";
import { useDriverSocket } from "../hooks/useDriverSocket";
import { buildSampleTripOffer, emitTestTripOffer } from "../lib/tripOfferTestBus";
import { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "ScheduledTrips">;

type TabKey = "available" | "assigned" | "claims" | "finished";

type VehicleFilter = "all" | "BODA" | "BAJAJI" | "CAR" | "XL" | "VIP";

const STATS: Array<{ key: TabKey; label: string; dot: string; soft: string; ring: string }> = [
  { key: "available", label: "Available", dot: colors.primary, soft: colors.brand[50], ring: "rgba(2,102,94,0.18)" },
  { key: "claims", label: "Pending", dot: colors.warning, soft: "#fffbeb", ring: "rgba(180,83,9,0.18)" },
  { key: "assigned", label: "Awarded", dot: colors.success, soft: "#ecfdf5", ring: "rgba(22,163,74,0.18)" },
  { key: "finished", label: "Finished", dot: "#7c3aed", soft: "#f5f3ff", ring: "rgba(124,58,237,0.18)" }
];

const FILTERS: Array<{ key: VehicleFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "BODA", label: "Boda" },
  { key: "BAJAJI", label: "Bajaji" },
  { key: "CAR", label: "Car" },
  { key: "XL", label: "XL" },
  { key: "VIP", label: "VIP" }
];

const VIEW_SUBTITLE: Record<TabKey, string> = {
  available: "Preview trips and submit bids.",
  claims: "Bids awaiting NoLSAF review.",
  assigned: "Trips awarded to you (upcoming).",
  finished: "Completed trips and ratings."
};

const PAYOUT_STATUS_LABEL: Record<string, string> = {
  PENDING: "Payout requested. Awaiting NoLSAF review.",
  APPROVED: "Payout approved. Processing payment.",
  PAID: "Payout paid."
};

const PAYOUT_STATUS_CHIP_LABEL: Record<string, string> = {
  PENDING: "Payout pending",
  APPROVED: "Payout approved",
  PAID: "Payout paid"
};

type AnyScheduledItem = ScheduledTripItem & Partial<ClaimItem> & Partial<FinishedClaimItem>;

function getVehicleLabel(type?: string) {
  if (!type) return "Vehicle";
  if (type === "PREMIUM") return "VIP";
  return type;
}

function formatDurationMs(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function buildMapsLink(lat?: number, lng?: number, address?: string) {
  if (typeof lat === "number" && typeof lng === "number") return `https://www.google.com/maps?q=${lat},${lng}`;
  if (address) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  return null;
}

function formatTime(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

const VEHICLE_TONES: Record<string, { bg: string; color: string }> = {
  BODA: { bg: "#eef2ff", color: "#4338ca" },
  BAJAJI: { bg: "#fffbeb", color: "#b45309" },
  CAR: { bg: "#f8fafc", color: colors.mutedText },
  XL: { bg: "#f0f9ff", color: "#0369a1" },
  PREMIUM: { bg: "#fef9c3", color: "#92400e" }
};

function VehicleIcon({ type }: { type?: string }) {
  const tone = (type && VEHICLE_TONES[type]) || { bg: "#f8fafc", color: colors.mutedText };
  const Icon = type === "BODA" ? Bike : type === "XL" ? Truck : Car;
  return (
    <View style={[styles.vehicleIcon, { backgroundColor: tone.bg }]}>
      <Icon color={tone.color} size={20} />
    </View>
  );
}

function ClaimMetaBadges({ item, nowMs }: { item: AnyScheduledItem; nowMs: number }) {
  const badges: ReactNode[] = [];

  if (item.claimOpensAt) {
    const opensAtMs = new Date(item.claimOpensAt).getTime();
    if (Number.isFinite(opensAtMs)) {
      const isOpen = nowMs >= opensAtMs;
      badges.push(
        <View key="opens" style={[styles.badge, isOpen ? styles.badgeSuccess : styles.badgeMuted]}>
          <Hourglass size={12} color={isOpen ? colors.success : colors.mutedText} />
          <AppText variant="caption" weight="bold" style={{ color: isOpen ? colors.success : colors.mutedText }}>
            {isOpen ? "Bidding open" : `Opens in ${formatDurationMs(opensAtMs - nowMs)}`}
          </AppText>
        </View>
      );
    }
  }

  if (typeof item.claimsRemaining === "number") {
    const limit = item.claimLimit ?? 5;
    const urgent = item.claimsRemaining <= 0;
    const low = item.claimsRemaining === 1;
    badges.push(
      <View key="slots" style={[styles.badge, urgent ? styles.badgeDanger : low ? styles.badgeWarning : styles.badgeMuted]}>
        <Users size={12} color={urgent ? colors.danger : low ? colors.warning : colors.mutedText} />
        <AppText variant="caption" weight="bold" style={{ color: urgent ? colors.danger : low ? colors.warning : colors.mutedText }}>
          {item.claimsRemaining}/{limit} slots
        </AppText>
      </View>
    );
  }

  if (!badges.length) return null;
  return <View style={styles.badgeRow}>{badges}</View>;
}

export function ScheduledTripsScreen({ navigation }: Props) {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("available");
  const [items, setItems] = useState<AnyScheduledItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [detailTrip, setDetailTrip] = useState<AnyScheduledItem | null>(null);
  const [claimTarget, setClaimTarget] = useState<AnyScheduledItem | null>(null);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedAuction, setAgreedAuction] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimingPayout, setClaimingPayout] = useState(false);
  const [filter, setFilter] = useState<VehicleFilter>("all");
  const [overview, setOverview] = useState<Record<TabKey, number>>({ available: 0, claims: 0, assigned: 0, finished: 0 });

  useEffect(() => {
    if (activeTab !== "available") return;
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [activeTab]);

  const load = useCallback(
    async (tab: TabKey, mode: "initial" | "refresh" = "initial") => {
      if (!token) {
        setError("Please sign in to view scheduled trips.");
        setLoading(false);
        return;
      }
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        if (tab === "available") {
          const vehicleType = filter === "all" ? undefined : filter === "VIP" ? "PREMIUM" : filter;
          const res = await fetchScheduledTrips(token, vehicleType);
          setItems(res.items || []);
        } else if (tab === "assigned") {
          const res = await fetchAssignedScheduledTrips(token);
          setItems(res.items || []);
        } else if (tab === "claims") {
          const res = await fetchClaimsPending(token);
          setItems(res.items || []);
        } else {
          const res = await fetchClaimsFinished(token);
          setItems(res.items || []);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load scheduled trips.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token, filter]
  );

  const loadOverview = useCallback(async () => {
    if (!token) return;
    try {
      const [availableRes, pendingRes, awardedRes, finishedRes] = await Promise.all([
        fetchScheduledTrips(token),
        fetchClaimsPending(token),
        fetchAssignedScheduledTrips(token),
        fetchClaimsFinished(token)
      ]);
      setOverview({
        available: Number(availableRes.total || 0),
        claims: Number(pendingRes.total || 0),
        assigned: Number(awardedRes.total || 0),
        finished: Number(finishedRes.total || 0)
      });
    } catch {
      // ignore — overview counts are best-effort
    }
  }, [token]);

  useEffect(() => {
    void load(activeTab);
  }, [activeTab, load]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  useDriverSocket({
    "transport:booking:claim_awarded": () => {
      if (activeTab === "claims" || activeTab === "assigned") void load(activeTab, "refresh");
      void loadOverview();
    },
    "transport:booking:created": () => {
      if (activeTab === "available") void load(activeTab, "refresh");
      void loadOverview();
    }
  });

  function openClaim(item: AnyScheduledItem) {
    if (item.canClaim === false) {
      Alert.alert("Can't claim this trip", item.claimIneligibilityReason || "You're not eligible to claim this trip.");
      return;
    }
    setDetailTrip(null);
    setClaimTarget(item);
    setAgreedTerms(false);
    setAgreedAuction(false);
  }

  async function confirmClaim() {
    if (!token || !claimTarget) return;
    setClaiming(true);
    try {
      await claimTrip(token, claimTarget.id);
      setClaimTarget(null);
      Alert.alert("Bid submitted!", "Awaiting NoLSAF review. You'll be notified once it's decided.");
      await load("available", "refresh");
      void loadOverview();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit your bid for this trip.");
    } finally {
      setClaiming(false);
    }
  }

  async function handleClaimPayout(item: AnyScheduledItem) {
    if (!token) return;
    setClaimingPayout(true);
    try {
      const res = await claimPayout(token, item.id);
      const payout = res.payout;
      const updates: Partial<AnyScheduledItem> = payout
        ? {
            payoutId: payout.id,
            payoutStatus: payout.status,
            payoutGrossAmount: payout.grossAmount,
            payoutCommissionAmount: payout.commissionAmount,
            payoutNetPaid: payout.netPaid,
            payoutCurrency: payout.currency
          }
        : {};
      setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, ...updates } : it)));
      setDetailTrip((prev) => (prev && prev.id === item.id ? { ...prev, ...updates } : prev));
      Alert.alert(
        res.alreadyClaimed ? "Payout already requested" : "Payout requested",
        res.alreadyClaimed
          ? "You already requested a payout for this trip. Track it in your Invoices."
          : "Your payout request has been sent to NoLSAF for review. Track it in your Invoices."
      );
    } catch (e) {
      Alert.alert("Could not request payout", e instanceof Error ? e.message : "Please try again later.");
    } finally {
      setClaimingPayout(false);
    }
  }

  function openMaps(url: string | null) {
    if (!url) return;
    void Linking.openURL(url);
  }

  return (
    <View style={styles.root}>
      <View style={styles.headerRow}>
        <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft color={colors.ink} size={22} />
        </Pressable>
        <AppText variant="title" weight="bold">
          Scheduled trips
        </AppText>
        {__DEV__ ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => emitTestTripOffer(buildSampleTripOffer())}
            style={styles.devButton}
          >
            <AppText variant="caption" weight="bold" tone="primary">
              Simulate offer
            </AppText>
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(activeTab, "refresh")} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <BadgeCheck color={colors.primary} size={26} />
          </View>
          <AppText variant="bodySmall" tone="muted" style={styles.heroSubtitle}>
            {VIEW_SUBTITLE[activeTab]}
          </AppText>

          <View style={styles.statsGrid}>
            {STATS.map((stat) => {
              const active = activeTab === stat.key;
              return (
                <Pressable
                  key={stat.key}
                  accessibilityRole="button"
                  onPress={() => setActiveTab(stat.key)}
                  style={[styles.statCard, active && { borderColor: stat.ring, backgroundColor: stat.soft }]}
                >
                  <View>
                    <AppText variant="caption" tone="muted">
                      {stat.label}
                    </AppText>
                    <AppText variant="titleSm" weight="extraBold">
                      {overview[stat.key].toLocaleString()}
                    </AppText>
                  </View>
                  <View style={[styles.viewPill, active && { backgroundColor: stat.soft }]}>
                    <View style={[styles.statDot, { backgroundColor: active ? stat.dot : colors.softText }]} />
                    <AppText variant="caption" weight="bold" tone={active ? "default" : "muted"}>
                      View
                    </AppText>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {activeTab === "available" ? (
            <View style={styles.filterRow}>
              {FILTERS.map((f) => (
                <Pressable
                  key={f.key}
                  accessibilityRole="button"
                  onPress={() => setFilter(f.key)}
                  style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
                >
                  <AppText variant="caption" weight="bold" tone={filter === f.key ? "default" : "muted"}>
                    {f.label}
                  </AppText>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

        {loading ? (
          <StateView title="Loading trips" message="Fetching scheduled trips." />
        ) : error ? (
          <StateView title="Could not load trips" message={error} actionLabel="Try again" onAction={() => load(activeTab)} />
        ) : items.length === 0 ? (
          <StateView
            title="Nothing here yet"
            message={
              activeTab === "available"
                ? "There are no paid scheduled trips at the moment. Trips become available to bid on 72 hours before pickup."
                : activeTab === "claims"
                  ? "When you bid on a trip, it will appear here while NoLSAF reviews it."
                  : activeTab === "assigned"
                    ? "Trips awarded to you will show here."
                    : "Your completed trips will show here with ratings."
            }
          />
        ) : (
          <AppStack gap={3}>
            {items.map((item) => {
              const pickup = item.fromAddress || item.pickupLocation || null;
              const dropoff = item.toAddress || item.property?.title || null;
              const when = formatTripWhen(item.pickupTime || item.scheduledDate);

              return (
                <AppCard key={item.id} style={styles.card}>
                  <View style={styles.cardTopRow}>
                    <View style={styles.cardTopLeft}>
                      <VehicleIcon type={item.vehicleType} />
                      <View style={styles.cardTopLeftText}>
                        <AppText variant="bodySmall" weight="bold">
                          {getVehicleLabel(item.vehicleType)}
                        </AppText>
                        {when ? (
                          <AppText variant="caption" tone="muted">
                            {when}
                          </AppText>
                        ) : null}
                      </View>
                    </View>
                    {item.amount != null ? (
                      <View style={styles.fareChip}>
                        <AppText variant="title" weight="extraBold" tone="primary">
                          {Number(item.amount).toLocaleString()}
                        </AppText>
                        <AppText variant="caption" tone="muted">
                          {item.currency || "TZS"}
                        </AppText>
                      </View>
                    ) : null}
                  </View>

                  {activeTab === "available" ? <ClaimMetaBadges item={item} nowMs={nowMs} /> : null}

                  <View style={styles.cardDivider} />

                  <View style={styles.routeTimeline}>
                    <View style={styles.routeRail}>
                      <View style={styles.routeDotPickup} />
                      <View style={styles.routeConnector} />
                      <View style={styles.routeDotDropoff} />
                    </View>
                    <View style={styles.routeStops}>
                      <View style={styles.routeStop}>
                        <AppText variant="caption" tone="muted">
                          Pickup
                        </AppText>
                        <AppText variant="bodySmall" weight="bold" numberOfLines={1}>
                          {pickup || "Pickup location"}
                        </AppText>
                      </View>
                      <View style={styles.routeStop}>
                        <AppText variant="caption" tone="muted">
                          Drop-off
                        </AppText>
                        <AppText variant="bodySmall" weight="bold" numberOfLines={1}>
                          {dropoff || "Dropoff location"}
                        </AppText>
                      </View>
                    </View>
                  </View>

                  <View style={styles.bottomRow}>
                    {item.tripCode ? (
                      <View style={styles.codeChip}>
                        <CodeText value={item.tripCode} variant="caption" tone="soft" maxLines={1} />
                      </View>
                    ) : (
                      <View />
                    )}
                    {activeTab === "claims" ? (
                      <AppText variant="caption" tone="soft">
                        Bid status: {item.claimStatus}
                      </AppText>
                    ) : activeTab === "finished" && item.driverRating != null ? (
                      <View style={styles.ratingRow}>
                        <Star color={colors.warning} size={16} fill={colors.warning} />
                        <AppText variant="caption" weight="bold">
                          {Number(item.driverRating).toFixed(1)}
                        </AppText>
                      </View>
                    ) : null}
                  </View>

                  {activeTab === "finished" ? (
                    <View style={styles.payoutStatusRow}>
                      <Wallet color={item.payoutStatus ? colors.primary : colors.mutedText} size={14} />
                      <AppText variant="caption" tone={item.payoutStatus ? "primary" : "muted"} weight="bold" numberOfLines={1} style={styles.reminderText}>
                        {item.payoutStatus ? PAYOUT_STATUS_CHIP_LABEL[item.payoutStatus] || item.payoutStatus : "Payout not claimed yet"}
                      </AppText>
                    </View>
                  ) : null}

                  {activeTab === "available" && item.canClaim === false && item.claimIneligibilityReason ? (
                    <View style={styles.ineligibleBox}>
                      <AppText variant="caption" weight="bold" tone="danger">
                        {item.claimIneligibilityReason}
                      </AppText>
                    </View>
                  ) : null}

                  <View style={styles.actionsRow}>
                    <AppButton
                      title="Full details"
                      variant="ghost"
                      icon={<FileText color={colors.ink} size={16} />}
                      onPress={() => setDetailTrip(item)}
                      style={styles.actionButton}
                    />
                    {activeTab === "available" ? (
                      <AppButton
                        title="Bid"
                        icon={<CheckCircle2 color={colors.white} size={16} />}
                        onPress={() => openClaim(item)}
                        disabled={item.canClaim === false}
                        style={styles.actionButton}
                      />
                    ) : null}
                  </View>
                </AppCard>
              );
            })}
          </AppStack>
        )}
      </ScrollView>

      {/* Trip details modal */}
      <Modal visible={Boolean(detailTrip)} transparent animationType="slide" onRequestClose={() => setDetailTrip(null)}>
        <View style={styles.overlay}>
          <View style={styles.detailSheet}>
            {detailTrip ? (
              <>
                <View style={styles.detailHeader}>
                  <View style={styles.cardTopLeft}>
                    <VehicleIcon type={detailTrip.vehicleType} />
                    <View>
                      <AppText variant="title" weight="bold">
                        {getVehicleLabel(detailTrip.vehicleType)}
                      </AppText>
                      <AppText variant="caption" tone="muted">
                        {detailTrip.tripCode}
                      </AppText>
                    </View>
                  </View>
                  <Pressable accessibilityRole="button" onPress={() => setDetailTrip(null)} style={styles.closeButton}>
                    <X color={colors.ink} size={18} />
                  </Pressable>
                </View>

                <ScrollView style={styles.detailScroll} showsVerticalScrollIndicator={false}>
                  <AppStack gap={3}>
                    {detailTrip.amount != null ? (
                      <View style={styles.detailFare}>
                        <AppText variant="caption" tone="muted">
                          Fare
                        </AppText>
                        <AppText variant="headline" weight="extraBold" tone="primary">
                          {Number(detailTrip.amount).toLocaleString()} {detailTrip.currency || "TZS"}
                        </AppText>
                      </View>
                    ) : null}

                    {activeTab === "available" ? <ClaimMetaBadges item={detailTrip} nowMs={nowMs} /> : null}

                    {activeTab === "assigned" ? (
                      <View style={styles.awardedBanner}>
                        <View style={styles.awardedIconWrap}>
                          <PartyPopper color={colors.success} size={22} />
                        </View>
                        <View style={styles.awardedTextWrap}>
                          <AppText variant="bodySmall" weight="extraBold" tone="success">
                            Congratulations, this trip is awarded to you!
                          </AppText>
                          <AppText variant="caption" tone="muted">
                            You were selected among many drivers who bid on this trip. Review the details below and be ready before the pickup time.
                          </AppText>
                          {detailTrip.awardedAt ? (
                            <AppText variant="caption" tone="success" weight="bold" style={styles.awardedAtText}>
                              Awarded at {formatTripWhen(detailTrip.awardedAt)}
                            </AppText>
                          ) : null}
                        </View>
                      </View>
                    ) : null}

                    {activeTab === "claims" ? (
                      <View style={styles.pendingBanner}>
                        <View style={styles.awardedIconWrap}>
                          <Hourglass color={colors.warning} size={20} />
                        </View>
                        <View style={styles.awardedTextWrap}>
                          <AppText variant="bodySmall" weight="extraBold" tone="warning">
                            Your bid is under review
                          </AppText>
                          <AppText variant="caption" tone="muted">
                            NoLSAF is currently reviewing the bids submitted for this trip. You&apos;ll be notified as soon as a driver is selected.
                          </AppText>
                        </View>
                      </View>
                    ) : null}

                    {activeTab === "claims" ? (
                      <View style={styles.detailGrid}>
                        <View style={styles.detailPill}>
                          <Clock color={colors.primary} size={16} />
                          <View>
                            <AppText variant="caption" tone="muted">
                              Bid placed at
                            </AppText>
                            <AppText variant="bodySmall" weight="bold">
                              {formatTripWhen(detailTrip.claimCreatedAt) || "—"}
                            </AppText>
                          </View>
                        </View>
                        <View style={styles.detailPill}>
                          <Users color={colors.primary} size={16} />
                          <View>
                            <AppText variant="caption" tone="muted">
                              Total bids
                            </AppText>
                            <AppText variant="bodySmall" weight="bold">
                              {detailTrip.claimCount ?? "—"}
                            </AppText>
                          </View>
                        </View>
                      </View>
                    ) : null}

                    {activeTab === "claims" ? (
                      <View style={styles.detailBlock}>
                        <AppText variant="caption" weight="bold" tone="soft" style={styles.detailLabel}>
                          HOW A DRIVER IS SELECTED
                        </AppText>
                        <AppText variant="bodySmall">
                          NoLSAF reviews every bid submitted for this trip and awards it to one driver, considering factors such as location,
                          rating, and availability. This is the auction model.
                        </AppText>
                        <Pressable accessibilityRole="button" onPress={() => navigation.navigate("ClaimPolicy")}>
                          <AppText variant="bodySmall" weight="bold" tone="primary">
                            View Bid Policy
                          </AppText>
                        </Pressable>
                      </View>
                    ) : null}

                    <View style={styles.detailBlock}>
                      <AppText variant="caption" weight="bold" tone="soft" style={styles.detailLabel}>
                        ROUTE
                      </AppText>
                      <View style={styles.detailRouteRow}>
                        <View style={[styles.dot, { backgroundColor: colors.primary }]} />
                        <View style={styles.detailRouteText}>
                          <AppText variant="caption" tone="muted">
                            Pickup
                          </AppText>
                          <AppText variant="bodySmall" weight="bold">
                            {detailTrip.fromAddress || detailTrip.pickupLocation || "Not specified"}
                          </AppText>
                        </View>
                        <Pressable
                          accessibilityRole="button"
                          onPress={() =>
                            openMaps(buildMapsLink(detailTrip.fromLatitude, detailTrip.fromLongitude, detailTrip.fromAddress || detailTrip.pickupLocation))
                          }
                          style={styles.mapsLink}
                        >
                          <MapPin color={colors.primary} size={14} />
                          <AppText variant="caption" weight="bold" tone="primary">
                            Maps
                          </AppText>
                        </Pressable>
                      </View>
                      <View style={styles.detailRouteRow}>
                        <View style={[styles.dot, { backgroundColor: colors.danger }]} />
                        <View style={styles.detailRouteText}>
                          <AppText variant="caption" tone="muted">
                            Drop-off
                          </AppText>
                          <AppText variant="bodySmall" weight="bold">
                            {detailTrip.toAddress || detailTrip.property?.title || "Not specified"}
                          </AppText>
                        </View>
                        <Pressable
                          accessibilityRole="button"
                          onPress={() =>
                            openMaps(buildMapsLink(detailTrip.toLatitude, detailTrip.toLongitude, detailTrip.toAddress || detailTrip.property?.title))
                          }
                          style={styles.mapsLink}
                        >
                          <MapPin color={colors.primary} size={14} />
                          <AppText variant="caption" weight="bold" tone="primary">
                            Maps
                          </AppText>
                        </Pressable>
                      </View>
                    </View>

                    <View style={styles.detailGrid}>
                      <View style={styles.detailPill}>
                        <Users color={colors.primary} size={16} />
                        <View>
                          <AppText variant="caption" tone="muted">
                            Passengers
                          </AppText>
                          <AppText variant="bodySmall" weight="bold">
                            {detailTrip.numberOfPassengers ?? "—"}
                          </AppText>
                        </View>
                      </View>
                      <View style={styles.detailPill}>
                        <Clock color={colors.warning} size={16} />
                        <View>
                          <AppText variant="caption" tone="muted">
                            Pickup time
                          </AppText>
                          <AppText variant="bodySmall" weight="bold">
                            {formatTime(detailTrip.pickupTime || detailTrip.scheduledDate) || "—"}
                          </AppText>
                        </View>
                      </View>
                    </View>

                    {activeTab === "finished" ? (
                      <View style={styles.detailGrid}>
                        <View style={styles.detailPill}>
                          <CheckCircle2 color={colors.success} size={16} />
                          <View>
                            <AppText variant="caption" tone="muted">
                              Completed at
                            </AppText>
                            <AppText variant="bodySmall" weight="bold">
                              {formatTripWhen(detailTrip.completedAt) || "—"}
                            </AppText>
                          </View>
                        </View>
                      </View>
                    ) : null}

                    {detailTrip.notes ? (
                      <View style={styles.notesBox}>
                        <AppText variant="caption" weight="bold" tone="soft" style={styles.detailLabel}>
                          SPECIAL INSTRUCTIONS
                        </AppText>
                        <AppText variant="bodySmall">{detailTrip.notes}</AppText>
                      </View>
                    ) : null}

                    {detailTrip.pickupLocation || detailTrip.arrivalType || detailTrip.transportCompany || detailTrip.arrivalNumber || detailTrip.arrivalTime ? (
                      <View style={styles.detailBlock}>
                        <AppText variant="caption" weight="bold" tone="soft" style={styles.detailLabel}>
                          ARRIVAL &amp; PICKUP INFO
                        </AppText>
                        {detailTrip.pickupLocation ? (
                          <AppText variant="bodySmall">Pickup area: {detailTrip.pickupLocation}</AppText>
                        ) : null}
                        {detailTrip.arrivalType ? <AppText variant="bodySmall">Type: {detailTrip.arrivalType}</AppText> : null}
                        {detailTrip.transportCompany ? (
                          <AppText variant="bodySmall">Company: {detailTrip.transportCompany}</AppText>
                        ) : null}
                        {detailTrip.arrivalNumber ? (
                          <AppText variant="bodySmall">Number: {detailTrip.arrivalNumber}</AppText>
                        ) : null}
                        {detailTrip.arrivalTime ? (
                          <AppText variant="bodySmall">Arrival time: {formatTime(detailTrip.arrivalTime)}</AppText>
                        ) : null}
                      </View>
                    ) : null}

                    {activeTab === "assigned" ? (
                      <View style={styles.detailBlock}>
                        <AppText variant="caption" weight="bold" tone="soft" style={styles.detailLabel}>
                          BEFORE YOU GO
                        </AppText>
                        <View style={styles.reminderRow}>
                          <Check color={colors.success} size={14} />
                          <AppText variant="bodySmall" style={styles.reminderText}>
                            Arrive at the pickup point on time and confirm with the passenger.
                          </AppText>
                        </View>
                        <View style={styles.reminderRow}>
                          <Check color={colors.success} size={14} />
                          <AppText variant="bodySmall" style={styles.reminderText}>
                            Make sure your vehicle matches the booked type and is clean and ready.
                          </AppText>
                        </View>
                        <Pressable accessibilityRole="button" onPress={() => navigation.navigate("Profile")} style={styles.reminderRow}>
                          <Check color={colors.success} size={14} />
                          <AppText variant="bodySmall" style={styles.reminderText}>
                            Download your driver ID and be ready to show it to the passenger for identification.
                          </AppText>
                          <ChevronRight color={colors.mutedText} size={16} />
                        </Pressable>
                        <View style={styles.reminderRow}>
                          <Check color={colors.success} size={14} />
                          <AppText variant="bodySmall" style={styles.reminderText}>
                            Stay calm, courteous, and professional with the passenger throughout the trip.
                          </AppText>
                        </View>
                        <View style={styles.reminderRow}>
                          <Check color={colors.success} size={14} />
                          <AppText variant="bodySmall" style={styles.reminderText}>
                            Follow the NoLSAF Terms of Service and Auction Policy throughout this trip.
                          </AppText>
                        </View>
                        <View style={styles.reminderRow}>
                          <Check color={colors.success} size={14} />
                          <AppText variant="bodySmall" style={styles.reminderText}>
                            Update the trip status from your Trips screen as the journey progresses.
                          </AppText>
                        </View>
                      </View>
                    ) : null}

                    {activeTab === "assigned" ? (
                      <View style={styles.monitoringBanner}>
                        <ShieldCheck color={colors.info} size={18} />
                        <AppText variant="caption" tone="muted" style={styles.reminderText}>
                          NoLSAF monitors all trips to ensure compliance and protect the brand. Drive responsibly and stay within policy.
                        </AppText>
                      </View>
                    ) : null}

                    {detailTrip.userRating || detailTrip.userReview || detailTrip.driverRating || detailTrip.driverReview ? (
                      <View style={styles.detailBlock}>
                        <AppText variant="caption" weight="bold" tone="soft" style={styles.detailLabel}>
                          RATINGS &amp; REVIEWS
                        </AppText>
                        {detailTrip.userRating != null ? (
                          <AppText variant="bodySmall">Passenger rated you: {Number(detailTrip.userRating).toFixed(1)}/5</AppText>
                        ) : null}
                        {detailTrip.userReview ? <AppText variant="bodySmall">{detailTrip.userReview}</AppText> : null}
                        {detailTrip.driverRating != null ? (
                          <AppText variant="bodySmall">You rated passenger: {Number(detailTrip.driverRating).toFixed(1)}/5</AppText>
                        ) : null}
                        {detailTrip.driverReview ? <AppText variant="bodySmall">{detailTrip.driverReview}</AppText> : null}
                      </View>
                    ) : null}

                    {activeTab === "finished" ? (
                      <View style={styles.detailBlock}>
                        <AppText variant="caption" weight="bold" tone="soft" style={styles.detailLabel}>
                          PAYOUT
                        </AppText>
                        {!detailTrip.payoutStatus ? (
                          <>
                            <AppText variant="bodySmall" tone="muted">
                              This trip is complete. Claim your payout and NoLSAF will review it and pay you out.
                            </AppText>
                            <AppButton
                              title="Claim payout"
                              icon={<Wallet color={colors.white} size={16} />}
                              onPress={() => handleClaimPayout(detailTrip)}
                              loading={claimingPayout}
                              disabled={!detailTrip.amount || Number(detailTrip.amount) <= 0}
                            />
                          </>
                        ) : (
                          <>
                            <View style={styles.payoutStatusRow}>
                              <Wallet color={colors.primary} size={16} />
                              <AppText variant="bodySmall" weight="bold" style={styles.reminderText}>
                                {PAYOUT_STATUS_LABEL[detailTrip.payoutStatus] || detailTrip.payoutStatus}
                              </AppText>
                            </View>
                            {detailTrip.payoutNetPaid != null ? (
                              <AmountText
                                amount={Number(detailTrip.payoutNetPaid)}
                                currency={detailTrip.payoutCurrency || detailTrip.currency || "TZS"}
                                variant="title"
                              />
                            ) : null}
                            <Pressable accessibilityRole="button" onPress={() => navigation.navigate("Invoices")}>
                              <AppText variant="bodySmall" weight="bold" tone="primary">
                                View in Invoices
                              </AppText>
                            </Pressable>
                          </>
                        )}
                      </View>
                    ) : null}

                    {activeTab === "available" && detailTrip.canClaim === false && detailTrip.claimIneligibilityReason ? (
                      <View style={styles.ineligibleBox}>
                        <AppText variant="caption" weight="bold" tone="danger">
                          {detailTrip.claimIneligibilityReason}
                        </AppText>
                      </View>
                    ) : null}
                  </AppStack>
                </ScrollView>

                <View style={styles.detailFooter}>
                  <AppButton title="Close" variant="ghost" onPress={() => setDetailTrip(null)} style={styles.actionButton} />
                  {activeTab === "available" ? (
                    <AppButton
                      title="Bid for this trip"
                      onPress={() => openClaim(detailTrip)}
                      disabled={detailTrip.canClaim === false}
                      style={styles.actionButton}
                    />
                  ) : null}
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Bid confirmation modal */}
      <Modal visible={Boolean(claimTarget)} transparent animationType="fade" onRequestClose={() => setClaimTarget(null)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <AppStack gap={5}>
              <AppStack gap={2}>
                <AppText variant="title" weight="bold">
                  Place your bid?
                </AppText>
                <AppText variant="body" tone="muted">
                  Confirm both agreements before bidding on this scheduled trip.
                </AppText>
                <Pressable accessibilityRole="button" onPress={() => navigation.navigate("ClaimPolicy")}>
                  <AppText variant="bodySmall" weight="bold" tone="primary">
                    What does bidding mean?
                  </AppText>
                </Pressable>
              </AppStack>

              <AppStack gap={3}>
                <Pressable accessibilityRole="checkbox" onPress={() => setAgreedTerms((v) => !v)} style={styles.checkboxRow}>
                  <View style={[styles.checkbox, agreedTerms && styles.checkboxChecked]}>
                    {agreedTerms ? <Check color={colors.white} size={14} /> : null}
                  </View>
                  <AppText variant="bodySmall" style={styles.checkboxLabel}>
                    I agree to the Terms of Service
                  </AppText>
                </Pressable>
                <Pressable accessibilityRole="checkbox" onPress={() => setAgreedAuction((v) => !v)} style={styles.checkboxRow}>
                  <View style={[styles.checkbox, agreedAuction && styles.checkboxChecked]}>
                    {agreedAuction ? <Check color={colors.white} size={14} /> : null}
                  </View>
                  <AppText variant="bodySmall" style={styles.checkboxLabel}>
                    I agree to the NoLSAF Auction Policy
                  </AppText>
                </Pressable>
              </AppStack>

              <AppStack gap={2}>
                <AppButton title="Agree & Bid" onPress={confirmClaim} loading={claiming} disabled={!agreedTerms || !agreedAuction} />
                <AppButton title="Cancel" variant="ghost" onPress={() => setClaimTarget(null)} />
              </AppStack>
            </AppStack>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4]
  },
  devButton: {
    marginLeft: "auto",
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
    backgroundColor: colors.brand[50],
    borderWidth: 1,
    borderColor: "rgba(2,102,94,0.18)"
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border
  },
  heroCard: {
    borderRadius: radius.xl,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[5],
    alignItems: "center",
    gap: spacing[2]
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.brand[50],
    borderWidth: 1,
    borderColor: colors.brand[100],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[1]
  },
  heroSubtitle: {
    textAlign: "center",
    marginBottom: spacing[2]
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[2],
    width: "100%"
  },
  statCard: {
    flexBasis: "47%",
    flexGrow: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[2],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3]
  },
  viewPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#f8fafc",
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1] / 2
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[1],
    justifyContent: "center",
    borderRadius: radius.full,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[1],
    marginTop: spacing[2]
  },
  filterChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1] + 2,
    borderRadius: radius.full
  },
  filterChipActive: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border
  },
  scrollContent: {
    gap: spacing[4],
    padding: spacing[4],
    paddingBottom: spacing[8]
  },
  card: {
    gap: spacing[3]
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[2]
  },
  cardTopLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    flexShrink: 1
  },
  cardTopLeftText: {
    minWidth: 0,
    gap: 2
  },
  vehicleIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center"
  },
  fareChip: {
    alignItems: "flex-end",
    borderRadius: radius.md,
    backgroundColor: colors.brand[50],
    borderWidth: 1,
    borderColor: colors.brand[100],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1]
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[2]
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1] / 2
  },
  badgeMuted: {
    backgroundColor: "#f8fafc",
    borderColor: colors.border
  },
  badgeSuccess: {
    backgroundColor: "#ecfdf5",
    borderColor: "#a7f3d0"
  },
  badgeWarning: {
    backgroundColor: "#fffbeb",
    borderColor: "#fde68a"
  },
  badgeDanger: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca"
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.border
  },
  routeTimeline: {
    flexDirection: "row",
    gap: spacing[3]
  },
  routeRail: {
    width: 12,
    alignItems: "center",
    paddingVertical: 2
  },
  routeDotPickup: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
    backgroundColor: colors.primary
  },
  routeDotDropoff: {
    width: 10,
    height: 10,
    borderRadius: 3,
    backgroundColor: colors.danger
  },
  routeConnector: {
    flex: 1,
    width: 2,
    minHeight: spacing[4],
    marginVertical: spacing[1],
    backgroundColor: colors.border
  },
  routeStops: {
    flex: 1,
    minWidth: 0,
    justifyContent: "space-between",
    gap: spacing[3]
  },
  routeStop: {
    minWidth: 0,
    gap: 2
  },
  codeChip: {
    alignSelf: "flex-start",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#f8fafc",
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1] / 2
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minWidth: 0
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1]
  },
  ineligibleBox: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#fecaca",
    backgroundColor: "#fef2f2",
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2]
  },
  actionsRow: {
    flexDirection: "row",
    gap: spacing[2]
  },
  actionButton: {
    flex: 1
  },
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(2,6,23,0.42)",
    padding: spacing[4]
  },
  sheet: {
    borderRadius: radius.xl,
    backgroundColor: colors.white,
    padding: spacing[5],
    ...shadows.sheet
  },
  detailSheet: {
    borderRadius: radius.xl,
    backgroundColor: colors.white,
    padding: spacing[5],
    maxHeight: "85%",
    gap: spacing[3],
    ...shadows.sheet
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[2]
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f1f5f9"
  },
  detailScroll: {
    flexGrow: 0
  },
  detailFare: {
    borderRadius: radius.lg,
    backgroundColor: colors.brand[50],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[1]
  },
  awardedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#a7f3d0",
    backgroundColor: "#ecfdf5",
    padding: spacing[3]
  },
  pendingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#fde68a",
    backgroundColor: "#fffbeb",
    padding: spacing[3]
  },
  awardedIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white
  },
  awardedTextWrap: {
    flex: 1,
    minWidth: 0,
    gap: 2
  },
  awardedAtText: {
    marginTop: spacing[1]
  },
  monitoringBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[2],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    backgroundColor: "#eff6ff",
    padding: spacing[3]
  },
  reminderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[2]
  },
  payoutStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2]
  },
  reminderText: {
    flex: 1,
    minWidth: 0
  },
  detailBlock: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: spacing[3],
    gap: spacing[2]
  },
  detailLabel: {
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  detailRouteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2]
  },
  detailRouteText: {
    flex: 1,
    minWidth: 0
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: radius.full
  },
  mapsLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radius.full,
    backgroundColor: colors.brand[50]
  },
  detailGrid: {
    flexDirection: "row",
    gap: spacing[2]
  },
  detailPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: spacing[3]
  },
  notesBox: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#fde68a",
    backgroundColor: "#fffbeb",
    padding: spacing[3],
    gap: spacing[1]
  },
  detailFooter: {
    flexDirection: "row",
    gap: spacing[2],
    paddingTop: spacing[2]
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    minWidth: 0
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  checkboxLabel: {
    flex: 1,
    minWidth: 0
  }
});
