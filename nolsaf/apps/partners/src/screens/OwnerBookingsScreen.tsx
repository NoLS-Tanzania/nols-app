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
import { ArrowUpDown, CalendarCheck, CheckCircle2, Clock, LogIn, LogOut, RefreshCw, Search, Star, UserRound } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";

import { useAuth } from "../auth";
import {
  OwnerBooking,
  OwnerBookingCounts,
  OwnerBookingLane,
  bookingAmount,
  bookingCode,
  confirmOwnerCheckout,
  fetchOwnerBookingCounts,
  fetchOwnerBookingsForLane,
  formatShortDate,
  formatTzs,
  formatTzsCompact,
  guestName,
  guestPhone,
  nightsBetween,
  normalizedStatus,
  propertyTitle
} from "../ownerBookings";

type OwnerBookingsScreenProps = {
  onOpenValidate: () => void;
};

const LANES: Array<{ key: OwnerBookingLane; label: string; helper: string; dot: string }> = [
  { key: "all",         label: "All",        helper: "All bookings",  dot: "#94a3b8" },
  { key: "recent",      label: "Recent",     helper: "Latest 50",     dot: "#3b82f6" },
  { key: "checkedIn",   label: "Checked in", helper: "Live guests",   dot: "#10b981" },
  { key: "checkoutDue", label: "Check out",  helper: "Due soon",      dot: "#f59e0b" },
  { key: "checkedOut",  label: "History",    helper: "Completed",     dot: "#8b5cf6" }
];

export function OwnerBookingsScreen({ onOpenValidate }: OwnerBookingsScreenProps) {
  const { token } = useAuth();
  const [lane, setLane] = useState<OwnerBookingLane>("recent");
  const [bookings, setBookings] = useState<OwnerBooking[]>([]);
  const [counts, setCounts] = useState<OwnerBookingCounts>({ all: 0, recent: 0, checkedIn: 0, checkoutDue: 0, checkedOut: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [checkoutTarget, setCheckoutTarget] = useState<OwnerBooking | null>(null);
  const [detailBooking, setDetailBooking] = useState<OwnerBooking | null>(null);
  const [sortKey, setSortKey] = useState<"date_desc" | "date_asc" | "amount_desc" | "amount_asc">("date_desc");
  const [showSort, setShowSort] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [agree, setAgree] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const load = async (nextLane = lane, silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [items, nextCounts] = await Promise.all([
        fetchOwnerBookingsForLane(nextLane, { token }),
        fetchOwnerBookingCounts({ token })
      ]);
      setBookings(items);
      setCounts(nextCounts);
    } catch (err) {
      setBookings([]);
      setError(err instanceof Error ? err.message : "Could not load owner bookings.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void load(lane);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lane]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = bookings.filter((booking) => {
      if (!q) return true;
      const haystack = [
        propertyTitle(booking),
        guestName(booking),
        guestPhone(booking),
        bookingCode(booking),
        booking.roomType,
        booking.roomCode,
        booking.status
      ].join(" ").toLowerCase();
      return haystack.includes(q);
    });
    list.sort((a, b) => {
      if (sortKey === "date_desc") return new Date(String(b.checkIn ?? "")).getTime() - new Date(String(a.checkIn ?? "")).getTime();
      if (sortKey === "date_asc")  return new Date(String(a.checkIn ?? "")).getTime() - new Date(String(b.checkIn ?? "")).getTime();
      if (sortKey === "amount_desc") return bookingAmount(b) - bookingAmount(a);
      if (sortKey === "amount_asc")  return bookingAmount(a) - bookingAmount(b);
      return 0;
    });
    return list;
  }, [bookings, query, sortKey]);

  const summary = useMemo(() => {
    const totalValue = filtered.reduce((sum, item) => sum + bookingAmount(item), 0);
    return {
      count: filtered.length,
      totalValue,
      checkedIn: filtered.filter((item) => normalizedStatus(item) === "CHECKED_IN").length,
      confirmed: filtered.filter((item) => normalizedStatus(item) === "CONFIRMED").length
    };
  }, [filtered]);

  const openCheckout = (booking: OwnerBooking) => {
    setCheckoutTarget(booking);
    setRating(0);
    setFeedback("");
    setAgree(false);
    setError(null);
  };

  const submitCheckout = async () => {
    if (!checkoutTarget) return;
    if (rating < 1) {
      setError("Please rate the guest before confirming check out.");
      return;
    }
    if (!agree) {
      setError("Please confirm the check out terms first.");
      return;
    }
    setCheckoutLoading(true);
    setError(null);
    try {
      await confirmOwnerCheckout({ token, bookingId: checkoutTarget.id, rating, feedback });
      setCheckoutTarget(null);
      await load(lane, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not confirm check out.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.heroLeft}>
              <View style={styles.heroIcon}>
                <CalendarCheck size={20} color={colors.white} />
              </View>
              <View>
                <AppText variant="caption" weight="bold" style={styles.heroEyebrow}>
                  OWNER BOOKINGS
                </AppText>
                <AppText variant="titleSm" weight="bold" tone="inverse">
                  Guest movement
                </AppText>
              </View>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Refresh bookings" onPress={() => load(lane, true)} style={({ pressed }) => [styles.refreshButton, pressed && styles.pressed]}>
              <RefreshCw size={17} color={colors.onHeroSoft} />
            </Pressable>
          </View>

          <View style={styles.heroDivider} />

          <View style={styles.heroStats}>
            <View style={styles.heroStatItem}>
              <AppText variant="caption" style={styles.heroStatLabel}>SHOWING</AppText>
              <AppText variant="titleSm" weight="bold" tone="inverse">{summary.count.toLocaleString()}</AppText>
            </View>
            <View style={styles.heroStatSep} />
            <View style={styles.heroStatItem}>
              <AppText variant="caption" style={styles.heroStatLabel}>CHECKED IN</AppText>
              <AppText variant="titleSm" weight="bold" tone="inverse">{summary.checkedIn}</AppText>
            </View>
            <View style={styles.heroStatSep} />
            <View style={styles.heroStatItem}>
              <AppText variant="caption" style={styles.heroStatLabel}>OWNER AMOUNT</AppText>
              <AppText variant="titleSm" weight="bold" tone="inverse" numberOfLines={1}>{formatTzsCompact(summary.totalValue)}</AppText>
              <AppText variant="caption" style={[styles.heroStatLabel, { fontSize: 9, opacity: 0.5, marginTop: 1 }]}>
                {filtered.length > 0 ? formatTzs(summary.totalValue) : "—"}
              </AppText>
            </View>
          </View>
        </View>

        <View style={styles.laneWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            contentContainerStyle={styles.laneScroll}
          >
            {LANES.map((item) => {
              const active = lane === item.key;
              return (
                <Pressable
                  key={item.key}
                  accessibilityRole="button"
                  onPress={() => setLane(item.key)}
                  style={({ pressed }) => [styles.laneChip, active && styles.laneChipActive, pressed && styles.pressed]}
                >
                  <View style={styles.laneChipTop}>
                    <View style={[styles.laneDot, { backgroundColor: active ? "rgba(255,255,255,0.6)" : item.dot }]} />
                    <AppText variant="bodySmall" weight="bold" style={active ? styles.laneTextActive : styles.laneText} numberOfLines={1}>
                      {item.label}
                    </AppText>
                  </View>
                  <View style={styles.laneChipBottom}>
                    <View style={[styles.laneCountBadge, active && styles.laneCountBadgeActive]}>
                      <AppText variant="caption" weight="bold" style={active ? styles.laneCountActive : styles.laneCount}>
                        {counts[item.key]}
                      </AppText>
                    </View>
                    <AppText variant="caption" style={active ? styles.laneHelperActive : styles.laneHelper} numberOfLines={1}>
                      {item.helper}
                    </AppText>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Search size={16} color={colors.softText} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search guest, property, code..."
              placeholderTextColor={colors.softText}
              style={styles.searchInput}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
          </View>
          <Pressable
            onPress={() => setShowSort((v) => !v)}
            style={({ pressed }) => [styles.sortToggleBtn, showSort && styles.sortToggleBtnActive, pressed && styles.pressed]}
            accessibilityLabel="Sort options"
          >
            <ArrowUpDown size={16} color={showSort ? colors.white : colors.primaryDeep} />
            {sortKey !== "date_desc" && !showSort ? <View style={styles.sortActiveDot} /> : null}
          </Pressable>
        </View>

        {showSort ? (
          <View style={styles.sortPanel}>
            <View style={styles.sortPanelHeader}>
              <AppText variant="caption" weight="bold" style={styles.sortPanelTitle}>SORT BY</AppText>
            </View>
            <View style={styles.sortGrid}>
              {([
                { key: "date_desc",   label: "Newest",  sub: "Check-in ↓" },
                { key: "date_asc",    label: "Oldest",  sub: "Check-in ↑" },
                { key: "amount_desc", label: "Highest", sub: "Payout ↓" },
                { key: "amount_asc",  label: "Lowest",  sub: "Payout ↑" }
              ] as const).map((opt) => {
                const active = sortKey === opt.key;
                return (
                  <Pressable
                    key={opt.key}
                    onPress={() => { setSortKey(opt.key); setShowSort(false); }}
                    style={({ pressed }) => [styles.sortCell, active && styles.sortCellActive, pressed && styles.pressed]}
                  >
                    {active ? <View style={styles.sortCellDot} /> : null}
                    <AppText variant="bodySmall" weight="bold" style={active ? styles.sortCellLabelActive : styles.sortCellLabel}>
                      {opt.label}
                    </AppText>
                    <AppText variant="caption" style={active ? styles.sortCellSubActive : styles.sortCellSub}>
                      {opt.sub}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        <View style={styles.quickActions}>
          <AppButton title="Validate code" onPress={onOpenValidate} icon={<LogIn size={18} color={colors.white} />} />
          <View style={styles.quickStats}>
            <MiniCount label="Confirmed" value={summary.confirmed} tone="amber" />
            <MiniCount label="Checked in" value={summary.checkedIn} tone="green" />
          </View>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <AppText variant="bodySmall" tone="danger">
              {error}
            </AppText>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.primary} />
            <AppText variant="bodySmall" tone="muted">
              Loading owner bookings
            </AppText>
          </View>
        ) : filtered.length === 0 ? (
          <StateView title="No bookings here" message="Try another segment or refresh to pull the latest owner booking activity." actionLabel="Refresh" onAction={() => load(lane, true)} />
        ) : (
          <View style={styles.list}>
            {filtered.map((booking) => (
              <BookingCard key={`${lane}-${booking.id}`} booking={booking} lane={lane} onCheckout={openCheckout} onPress={() => setDetailBooking(booking)} />
            ))}
          </View>
        )}

        {refreshing ? (
          <View style={styles.refreshing}>
            <ActivityIndicator size="small" color={colors.primary} />
            <AppText variant="caption" tone="muted">
              Refreshing
            </AppText>
          </View>
        ) : null}
      </ScrollView>

      <BookingDetailSheet
        booking={detailBooking}
        onClose={() => setDetailBooking(null)}
        onCheckout={(b) => { setDetailBooking(null); openCheckout(b); }}
      />
      <CheckoutModal
        booking={checkoutTarget}
        rating={rating}
        feedback={feedback}
        agree={agree}
        loading={checkoutLoading}
        onRating={setRating}
        onFeedback={setFeedback}
        onAgree={setAgree}
        onClose={() => setCheckoutTarget(null)}
        onConfirm={submitCheckout}
      />
    </View>
  );
}

function BookingCard({ booking, lane, onCheckout, onPress }: { booking: OwnerBooking; lane: OwnerBookingLane; onCheckout: (booking: OwnerBooking) => void; onPress: () => void }) {
  const status = normalizedStatus(booking);
  const canCheckout = (lane === "checkoutDue" || status === "CHECKED_IN") && status === "CHECKED_IN";

  const isCheckedIn  = status === "CHECKED_IN";
  const isCheckedOut = status === "CHECKED_OUT";

  const iconBg    = isCheckedIn  ? "#d1fae5" : isCheckedOut ? "#f1f5f9" : "#fef3c7";
  const iconColor = isCheckedIn  ? "#059669" : isCheckedOut ? "#64748b" : "#d97706";
  const pillBg    = isCheckedIn  ? "#ecfdf5" : isCheckedOut ? "#f8fafc" : "#fffbeb";
  const pillBorder= isCheckedIn  ? "#10b98130" : isCheckedOut ? "#e2e8f0" : "#f59e0b30";
  const pillText  = isCheckedIn  ? "#059669"  : isCheckedOut ? "#64748b" : "#d97706";
  const nights    = nightsBetween(booking.checkIn, booking.checkOut);

  const StatusIcon = isCheckedOut ? LogOut : isCheckedIn ? CheckCircle2 : Clock;

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.bookingCard, pressed && styles.pressed]}>
      {/* Top: property + status */}
      <View style={styles.cardTop}>
        <View style={[styles.statusMark, { backgroundColor: iconBg }]}>
          <StatusIcon size={17} color={iconColor} />
        </View>
        <View style={styles.cardTitle}>
          <AppText variant="bodySmall" weight="extraBold" numberOfLines={1} style={styles.propertyName}>
            {propertyTitle(booking)}
          </AppText>
          <AppText variant="caption" tone="muted" numberOfLines={1}>
            {bookingCode(booking)}  ·  {booking.roomType || booking.roomCode || "Room"}
          </AppText>
        </View>
        <View style={[styles.statusPill, { backgroundColor: pillBg, borderColor: pillBorder }]}>
          <AppText variant="caption" weight="bold" style={[styles.statusPillText, { color: pillText }]}>
            {status.replace("_", " ")}
          </AppText>
        </View>
      </View>

      <View style={styles.bookingDivider} />

      {/* Guest + amount */}
      <View style={styles.guestRow}>
        <View style={styles.guestAvatar}>
          <AppText variant="caption" weight="bold" style={styles.guestInitial}>
            {(guestName(booking) || "G").charAt(0).toUpperCase()}
          </AppText>
        </View>
        <View style={styles.cardTitle}>
          <AppText variant="bodySmall" weight="bold" numberOfLines={1}>
            {guestName(booking)}
          </AppText>
          <AppText variant="caption" tone="muted" numberOfLines={1}>
            {guestPhone(booking) || "No phone"}
          </AppText>
        </View>
        <View style={styles.amountBlock}>
          <AppText variant="caption" style={styles.amountLabel}>PAYOUT</AppText>
          <AppText variant="bodySmall" weight="extraBold" style={styles.amount} numberOfLines={1}>
            {formatTzs(bookingAmount(booking))}
          </AppText>
        </View>
      </View>

      <View style={styles.bookingDivider} />

      {/* Date bridge */}
      <View style={styles.dateBridge}>
        <View>
          <AppText variant="caption" weight="bold" style={styles.dateLabel}>CHECK IN</AppText>
          <AppText variant="bodySmall" weight="bold" style={styles.dateValue}>{formatShortDate(booking.checkIn)}</AppText>
        </View>
        {nights != null ? (
          <View style={styles.nightsBadge}>
            <AppText variant="caption" weight="bold" style={styles.nightsText}>{nights}n</AppText>
          </View>
        ) : <View />}
        <View style={styles.dateRight}>
          <AppText variant="caption" weight="bold" style={styles.dateLabel}>CHECK OUT</AppText>
          <AppText variant="bodySmall" weight="bold" style={styles.dateValue}>{formatShortDate(booking.checkOut)}</AppText>
        </View>
      </View>

      {canCheckout ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => onCheckout(booking)}
          style={({ pressed }) => [styles.checkoutBtn, pressed && styles.pressed]}
        >
          <LogOut size={15} color={colors.primary} />
          <AppText variant="caption" weight="bold" style={styles.checkoutBtnText}>Confirm check out</AppText>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

function BookingDetailSheet({ booking, onClose, onCheckout }: { booking: OwnerBooking | null; onClose: () => void; onCheckout: (b: OwnerBooking) => void }) {
  if (!booking) return null;
  const status = normalizedStatus(booking);
  const isCheckedIn  = status === "CHECKED_IN";
  const isCheckedOut = status === "CHECKED_OUT";
  const nights = nightsBetween(booking.checkIn, booking.checkOut);
  const pillBg   = isCheckedIn ? "#ecfdf5" : isCheckedOut ? "#f8fafc" : "#fffbeb";
  const pillText = isCheckedIn ? "#059669" : isCheckedOut ? "#64748b" : "#d97706";
  const canCheckout = isCheckedIn;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={sheetStyles.overlay}>
        <Pressable style={sheetStyles.backdrop} onPress={onClose} />
        <View style={sheetStyles.sheet}>
          {/* Handle */}
          <View style={sheetStyles.handle} />

          {/* Header */}
          <View style={sheetStyles.header}>
            <View style={sheetStyles.headerLeft}>
              <AppText variant="titleSm" weight="bold" numberOfLines={1}>{propertyTitle(booking)}</AppText>
              <AppText variant="caption" tone="muted">{bookingCode(booking)}  ·  {booking.roomType || "Room"}</AppText>
            </View>
            <View style={[sheetStyles.statusPill, { backgroundColor: pillBg }]}>
              <AppText variant="caption" weight="bold" style={{ color: pillText, fontSize: 10, letterSpacing: 0.5 }}>
                {status.replace("_", " ")}
              </AppText>
            </View>
          </View>

          <View style={sheetStyles.divider} />

          {/* Guest block */}
          <View style={sheetStyles.guestBlock}>
            <View style={sheetStyles.guestAvatar}>
              <AppText variant="bodySmall" weight="bold" style={sheetStyles.guestInitial}>
                {(guestName(booking) || "G").charAt(0).toUpperCase()}
              </AppText>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <AppText variant="body" weight="bold" numberOfLines={1}>{guestName(booking)}</AppText>
              <AppText variant="caption" tone="muted">{guestPhone(booking) || "No phone"}</AppText>
            </View>
          </View>

          <View style={sheetStyles.divider} />

          {/* Stats grid */}
          <View style={sheetStyles.grid}>
            <SheetTile label="Check in"     value={formatShortDate(booking.checkIn)} />
            <SheetTile label="Check out"    value={formatShortDate(booking.checkOut)} />
            <SheetTile label="Nights"       value={nights != null ? `${nights} nights` : "—"} />
            <SheetTile label="Owner payout" value={formatTzs(bookingAmount(booking))} accent />
          </View>

          <View style={sheetStyles.divider} />

          {/* Checkout button or close */}
          {canCheckout ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => onCheckout(booking)}
              style={({ pressed }) => [sheetStyles.actionBtn, sheetStyles.actionBtnPrimary, pressed && { opacity: 0.85 }]}
            >
              <LogOut size={16} color="#fff" />
              <AppText variant="bodySmall" weight="bold" style={{ color: "#fff" }}>Confirm check out</AppText>
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => [sheetStyles.actionBtn, pressed && { opacity: 0.75 }]}
            >
              <AppText variant="bodySmall" weight="bold" tone="muted">Close</AppText>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

function SheetTile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={sheetStyles.tile}>
      <AppText variant="caption" weight="bold" style={sheetStyles.tileLabel}>{label}</AppText>
      <AppText variant="bodySmall" weight="bold" style={accent ? sheetStyles.tileValueAccent : sheetStyles.tileValue}>{value}</AppText>
    </View>
  );
}

const sheetStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(15,23,42,0.45)" },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: colors.white,
    paddingBottom: spacing[6],
    overflow: "hidden"
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginTop: spacing[3],
    marginBottom: spacing[2]
  },
  header: {
    flexDirection: "row", alignItems: "flex-start",
    gap: spacing[3], paddingHorizontal: spacing[4], paddingVertical: spacing[3]
  },
  headerLeft: { flex: 1, minWidth: 0, gap: 3 },
  statusPill: {
    paddingHorizontal: spacing[2], paddingVertical: 3,
    borderRadius: radius.full, flexShrink: 0
  },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: spacing[4] },
  guestBlock: {
    flexDirection: "row", alignItems: "center",
    gap: spacing[3], paddingHorizontal: spacing[4], paddingVertical: spacing[4]
  },
  guestAvatar: {
    width: 44, height: 44, borderRadius: radius.full,
    backgroundColor: colors.primaryDeep,
    alignItems: "center", justifyContent: "center", flexShrink: 0
  },
  guestInitial: { color: colors.white, fontSize: 18 },
  grid: {
    flexDirection: "row", flexWrap: "wrap",
    paddingHorizontal: spacing[4], paddingVertical: spacing[4], gap: spacing[2]
  },
  tile: {
    width: "48%", borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing[3], gap: 4
  },
  tileLabel: { color: colors.softText, fontSize: 10, letterSpacing: 1 },
  tileValue: { color: colors.primaryDeep },
  tileValueAccent: { color: colors.primary },
  actionBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: spacing[2], marginHorizontal: spacing[4], marginTop: spacing[3],
    paddingVertical: spacing[4], borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.border
  },
  actionBtnPrimary: { backgroundColor: colors.primaryDeep, borderColor: colors.primaryDeep }
});

function CheckoutModal({
  booking,
  rating,
  feedback,
  agree,
  loading,
  onRating,
  onFeedback,
  onAgree,
  onClose,
  onConfirm
}: {
  booking: OwnerBooking | null;
  rating: number;
  feedback: string;
  agree: boolean;
  loading: boolean;
  onRating: (rating: number) => void;
  onFeedback: (value: string) => void;
  onAgree: (value: boolean) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!booking) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <AppText variant="title" weight="bold">
            Confirm check out
          </AppText>
          <AppText variant="bodySmall" tone="muted">
            Rate {guestName(booking)} before closing this stay at {propertyTitle(booking)}.
          </AppText>

          <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map((value) => (
              <Pressable key={value} accessibilityRole="button" onPress={() => onRating(value)} style={[styles.starButton, rating >= value && styles.starButtonActive]}>
                <Star size={20} color={rating >= value ? colors.white : colors.softText} fill={rating >= value ? colors.white : "transparent"} />
              </Pressable>
            ))}
          </View>

          <AppInput label="Note" value={feedback} onChangeText={onFeedback} placeholder="Optional check out note" multiline numberOfLines={3} style={styles.feedbackInput} />

          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: agree }} onPress={() => onAgree(!agree)} style={styles.agreeRow}>
            <View style={[styles.checkbox, agree && styles.checkboxOn]}>
              {agree ? <CheckCircle2 size={14} color={colors.white} /> : null}
            </View>
            <AppText variant="bodySmall" tone="muted" style={styles.agreeText}>
              I confirm the guest has checked out and this owner action should be recorded.
            </AppText>
          </Pressable>

          <View style={styles.modalActions}>
            <AppButton title="Cancel" variant="ghost" onPress={onClose} style={styles.modalAction} />
            <AppButton title="Confirm" loading={loading} disabled={rating < 1 || !agree} onPress={onConfirm} style={styles.modalAction} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function HeroMini({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.heroMini}>
      <AppText variant="caption" style={styles.heroMiniLabel}>
        {label}
      </AppText>
      <AppText variant="bodySmall" weight="bold" tone="inverse" numberOfLines={1}>
        {value}
      </AppText>
    </View>
  );
}

function MiniCount({ label, value, tone }: { label: string; value: number; tone: "amber" | "green" }) {
  return (
    <View style={styles.miniCount}>
      <AppText variant="caption" tone="muted" numberOfLines={1}>
        {label}
      </AppText>
      <AppText variant="titleSm" weight="bold" style={tone === "green" ? styles.greenText : styles.amberText}>
        {value}
      </AppText>
    </View>
  );
}

function DatePill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.datePill}>
      <AppText variant="caption" tone="muted" weight="bold" style={styles.dateLabel}>
        {label}
      </AppText>
      <AppText variant="bodySmall" weight="semiBold">
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  scroll: { padding: spacing[3], paddingBottom: spacing[8], gap: spacing[3] },
  hero: {
    borderRadius: radius.xl,
    padding: spacing[4],
    gap: spacing[3],
    backgroundColor: colors.primaryDeep
  },
  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  heroLeft: { flexDirection: "row", alignItems: "center", gap: spacing[3] },
  heroIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.13)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)"
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.13)"
  },
  heroEyebrow: { color: "rgba(255,255,255,0.45)", fontSize: 10, letterSpacing: 1.8 },
  heroDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.10)" },
  heroStats: { flexDirection: "row", alignItems: "center" },
  heroMini: {
    flex: 1,
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.13)",
    padding: spacing[3],
    gap: spacing[1]
  },
  heroMiniLabel: { color: "rgba(255,255,255,0.48)", fontSize: 10, letterSpacing: 1 },
  heroStatItem: { flex: 1, gap: 3 },
  heroStatSep: { width: 1, height: 32, backgroundColor: "rgba(255,255,255,0.12)", marginHorizontal: spacing[3] },
  heroStatLabel: { color: "rgba(255,255,255,0.4)", fontSize: 9, letterSpacing: 1.2 },
  laneWrap: { marginHorizontal: -spacing[3] },
  laneScroll: { paddingHorizontal: spacing[3], gap: spacing[2], paddingRight: spacing[6] },
  laneChip: {
    width: 110,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    gap: spacing[2],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1
  },
  laneChipActive: {
    backgroundColor: colors.primaryDeep,
    borderColor: colors.primaryDeep,
    shadowColor: colors.primaryDeep,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4
  },
  laneChipTop: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  laneDot: { width: 7, height: 7, borderRadius: radius.full, flexShrink: 0 },
  laneChipBottom: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  laneText: { color: colors.primaryDeep, fontSize: 13, flex: 1 },
  laneTextActive: { color: colors.white, fontSize: 13, flex: 1 },
  laneCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 22,
    alignItems: "center"
  },
  laneCountBadgeActive: { backgroundColor: "rgba(255,255,255,0.2)", borderColor: "transparent" },
  laneCount: { color: colors.primaryDeep, fontSize: 11 },
  laneCountActive: { color: colors.white, fontSize: 11 },
  laneHelper: { color: colors.softText, fontSize: 10, flex: 1 },
  laneHelperActive: { color: "rgba(255,255,255,0.5)", fontSize: 10, flex: 1 },
  pressed: { opacity: 0.75 },
  searchRow: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: spacing[4],
    height: 48,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.ink,
    paddingVertical: 0
  },
  sortToggleBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1
  },
  sortToggleBtnActive: {
    backgroundColor: colors.primaryDeep,
    borderColor: colors.primaryDeep
  },
  sortActiveDot: {
    position: "absolute",
    top: 9,
    right: 9,
    width: 7,
    height: 7,
    borderRadius: radius.full,
    backgroundColor: "#f59e0b",
    borderWidth: 1.5,
    borderColor: colors.white
  },
  sortPanel: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3
  },
  sortPanelHeader: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[2]
  },
  sortPanelTitle: {
    color: colors.softText,
    fontSize: 10,
    letterSpacing: 1.5
  },
  sortGrid: {
    flexDirection: "row",
    flexWrap: "wrap"
  },
  sortCell: {
    width: "50%",
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    gap: spacing[1],
    borderTopWidth: 1,
    borderTopColor: colors.border,
    position: "relative"
  },
  sortCellActive: {
    backgroundColor: colors.primaryDeep
  },
  sortCellDot: {
    position: "absolute",
    top: spacing[3],
    right: spacing[3],
    width: 6,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: "#34d399"
  },
  sortCellLabel: { color: colors.primaryDeep, fontSize: 14 },
  sortCellLabelActive: { color: colors.white, fontSize: 14 },
  sortCellSub: { color: colors.softText, fontSize: 11 },
  sortCellSubActive: { color: "rgba(255,255,255,0.5)", fontSize: 11 },
  quickActions: { gap: spacing[2] },
  quickStats: { flexDirection: "row", gap: spacing[2] },
  miniCount: {
    flex: 1,
    minWidth: 0,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: spacing[3]
  },
  greenText: { color: colors.success },
  amberText: { color: colors.warning },
  errorBox: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#fecaca",
    backgroundColor: "#fef2f2",
    padding: spacing[3]
  },
  loadingBox: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: spacing[6]
  },
  list: { gap: spacing[3] },
  refreshing: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing[2] },
  bookingCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: spacing[3], padding: spacing[4] },
  bookingDivider: { height: 1, backgroundColor: colors.border, marginHorizontal: spacing[4] },
  statusMark: { width: 38, height: 38, borderRadius: radius.md, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  propertyName: { color: colors.primaryDeep, letterSpacing: 0.2 },
  statusPill: { paddingHorizontal: spacing[2], paddingVertical: 3, borderRadius: radius.full, borderWidth: 1, flexShrink: 0 },
  statusPillText: { fontSize: 10, letterSpacing: 0.5 },
  cardTitle: { flex: 1, minWidth: 0 },
  guestRow: { flexDirection: "row", alignItems: "center", gap: spacing[3], padding: spacing[4] },
  guestAvatar: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryDeep,
    flexShrink: 0
  },
  guestInitial: { color: colors.white, fontSize: 14 },
  amountBlock: { alignItems: "flex-end", gap: 2 },
  amountLabel: { color: colors.softText, fontSize: 9, letterSpacing: 1.2 },
  amount: { color: colors.primaryDeep, maxWidth: 130, textAlign: "right" },
  dateBridge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3]
  },
  datePill: {
    minWidth: 104,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    gap: 2
  },
  dateRight: { alignItems: "flex-end" },
  dateLabel: { color: colors.softText, fontSize: 9, letterSpacing: 1.2, textTransform: "uppercase" },
  dateValue: { color: colors.primaryDeep, marginTop: 2 },
  nightsBadge: {
    backgroundColor: colors.brand[50],
    borderRadius: radius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderWidth: 1,
    borderColor: colors.brand[100]
  },
  nightsText: { color: colors.primary, fontSize: 11 },
  checkoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    margin: spacing[4],
    marginTop: spacing[2],
    paddingVertical: spacing[3],
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.brand[100],
    backgroundColor: colors.brand[50]
  },
  checkoutBtnText: { color: colors.primary, fontSize: 13 },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(2,6,23,0.42)",
    padding: spacing[4]
  },
  modalSheet: { borderRadius: radius.xl, backgroundColor: colors.white, padding: spacing[5], gap: spacing[3] },
  starRow: { flexDirection: "row", gap: spacing[2] },
  starButton: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  starButtonActive: { backgroundColor: colors.warning, borderColor: colors.warning },
  feedbackInput: { minHeight: 86, textAlignVertical: "top" },
  agreeRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing[3] },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1
  },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  agreeText: { flex: 1, minWidth: 0 },
  modalActions: { flexDirection: "row", gap: spacing[2] },
  modalAction: { flex: 1 }
});
