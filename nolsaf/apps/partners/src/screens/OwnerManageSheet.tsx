import { AppText, colors, radius, spacing, apiRequest, getErrorMessage } from "@nolsaf/native-ui";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Circle,
  Clock,
  MapPin,
  PenLine,
  Star,
  Tag,
  TrendingDown,
  Users,
} from "lucide-react-native";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../auth";
import { STATUS_META } from "./property/data";
import type { ListProperty } from "./property/types";

// ── Types ──────────────────────────────────────────────────────────────────

type RoomEntry = {
  localId: string;
  type: string;
  count: number;
  pricePerNight: number;
  discountPercent: number | null;
};

type PropertyStats = {
  approvedAt:      string | null;
  averageRating:   number | null;
  reviewCount:     number;
  totalEarnings:   number | null;
  rooms:           RoomEntry[];
};

// ── Props ──────────────────────────────────────────────────────────────────

type Props = {
  property: ListProperty | null;
  visible:  boolean;
  onClose:  () => void;
  onEdit:   (id: number) => void;
};

// ── Component ──────────────────────────────────────────────────────────────

export function OwnerManageSheet({ property, visible, onClose, onEdit }: Props) {
  const { token } = useAuth();
  const [stats, setStats]           = useState<PropertyStats | null>(null);
  const [heroWidth, setHeroWidth]   = useState(0);
  const [photoIdx, setPhotoIdx]     = useState(0);
  const [editRoom, setEditRoom]     = useState<RoomEntry | null>(null);
  const [editPrice, setEditPrice]   = useState("");
  const [editDiscount, setEditDiscount] = useState("");
  const [saving, setSaving]         = useState(false);

  useEffect(() => {
    if (!visible || !property) return;
    setStats(null);
    setPhotoIdx(0);
    apiRequest(`/api/owner/properties/${property.id}`, { method: "GET", token })
      .then((data: any) => setStats({
        approvedAt:    data.approvedAt    ?? null,
        averageRating: data.averageRating ?? null,
        reviewCount:   data.reviewCount   ?? 0,
        totalEarnings: data.totalEarnings ?? null,
        rooms: Array.isArray(data.roomsSpec)
          ? data.roomsSpec.map((r: any) => ({
              localId:         r._localId ?? String(Math.random()),
              type:            r.type || r.otherType || "Room",
              count:           Number(r.count) || 1,
              pricePerNight:   Number(r.pricePerNight) || 0,
              discountPercent: r.discountPercent ?? null,
            }))
          : [],
      }))
      .catch(() => setStats(null));
  }, [visible, property?.id, token]);

  if (!property) return null;

  const meta     = STATUS_META[property.status] ?? STATUS_META["DRAFT"];
  const photos   = property.photos ?? [];
  const location = [property.city, property.district, property.regionName].filter(Boolean).join(", ");
  const currency = property.currency ?? "TZS";
  const base     = property.basePrice ? Number(property.basePrice) : null;
  const rating   = stats?.averageRating;
  const earnings = stats?.totalEarnings
    ?? (base && property._count.bookings ? base * property._count.bookings : null);

  const openEdit = (room: RoomEntry) => {
    setEditRoom(room);
    setEditPrice(String(room.pricePerNight));
    setEditDiscount(room.discountPercent != null ? String(room.discountPercent) : "");
  };

  const saveRoomPrice = async () => {
    if (!editRoom) return;
    const newPrice = Number(editPrice);
    const newDisc  = editDiscount ? Number(editDiscount) : null;
    if (!newPrice || newPrice <= 0) {
      Alert.alert("Invalid price", "Enter a valid price per night.");
      return;
    }
    setSaving(true);
    try {
      const updatedRooms = (stats?.rooms ?? []).map(r =>
        r.localId === editRoom.localId
          ? { ...r, pricePerNight: newPrice, discountPercent: newDisc }
          : r
      );
      await apiRequest(`/api/owner/properties/${property.id}`, {
        method: "PATCH",
        token,
        body: { roomsSpec: updatedRooms.map(r => ({
          _localId:        r.localId,
          type:            r.type,
          count:           String(r.count),
          pricePerNight:   String(r.pricePerNight),
          discountPercent: r.discountPercent,
        })) },
      });
      setStats(prev => prev ? { ...prev, rooms: updatedRooms } : null);
      setEditRoom(null);
    } catch (e) {
      Alert.alert("Error", getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.backBtn} accessibilityRole="button">
            <ArrowLeft size={20} color={colors.text} />
          </Pressable>
          <AppText variant="bodySmall" weight="semiBold">Property Overview</AppText>
          <Pressable onPress={() => onEdit(property.id)} style={styles.editHeaderBtn} accessibilityRole="button">
            <PenLine size={13} color={colors.primary} />
            <AppText variant="caption" weight="semiBold" style={styles.editHeaderText}>Edit</AppText>
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

          {/* ── Hero carousel ── */}
          <View style={styles.heroWrap} onLayout={e => setHeroWidth(e.nativeEvent.layout.width)}>
            {photos.length > 0 && heroWidth > 0 ? (
              <FlatList
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                data={photos}
                keyExtractor={(_, i) => String(i)}
                getItemLayout={(_, i) => ({ length: heroWidth, offset: heroWidth * i, index: i })}
                onMomentumScrollEnd={e => {
                  setPhotoIdx(Math.round(e.nativeEvent.contentOffset.x / heroWidth));
                }}
                renderItem={({ item }) => (
                  <Image source={{ uri: item }} style={{ width: heroWidth, height: HERO_H }} resizeMode="cover" />
                )}
              />
            ) : (
              <View style={styles.heroEmpty}>
                <Building2 size={40} color="rgba(255,255,255,0.35)" />
              </View>
            )}
            <View style={styles.heroGradient} pointerEvents="none" />
            <View style={styles.heroVerifyBadge}>
              {property.status === "APPROVED"  && <CheckCircle2  size={22} color={meta.color} fill={meta.bg} />}
              {property.status === "PENDING"   && <Clock         size={20} color={meta.color} />}
              {property.status === "REJECTED"  && <AlertTriangle size={20} color={meta.color} />}
              {property.status === "SUSPENDED" && <Circle        size={20} color={meta.color} />}
            </View>
            {photos.length > 1 && (
              <View style={styles.heroDots}>
                {photos.map((_, i) => (
                  <View key={i} style={[styles.heroDot, i === photoIdx && styles.heroDotActive]} />
                ))}
              </View>
            )}
          </View>

          {/* ── Identity ── */}
          <View style={styles.identity}>
            <AppText weight="bold" style={styles.identityTitle} numberOfLines={2}>
              {property.title || "Untitled property"}
            </AppText>
            <View style={styles.identityMeta}>
              {property.type && (
                <View style={styles.typeChip}>
                  <AppText style={styles.typeChipText}>{property.type}</AppText>
                </View>
              )}
              {location ? (
                <View style={styles.identityLocation}>
                  <MapPin size={11} color={colors.softText} />
                  <AppText style={styles.locationText} numberOfLines={1}>{location}</AppText>
                </View>
              ) : null}
            </View>
          </View>

          {/* ── Stats row ── */}
          <View style={styles.statsCard}>
            <StatTile
              icon={<Users size={18} color={colors.primary} />}
              value={String(property._count.bookings)}
              label="Bookings"
            />
            <View style={styles.statDivider} />
            <StatTile
              icon={<Star size={18} color="#f59e0b" fill="#fef3c7" />}
              value={rating != null ? rating.toFixed(1) : "N/A"}
              label="Rating"
            />
            <View style={styles.statDivider} />
            <StatTile
              icon={<CheckCircle2 size={18} color={colors.accent.green} />}
              value={earnings != null ? `${currency} ${shortNumber(earnings)}` : "N/A"}
              label="Earned"
              compact
            />
          </View>

          {/* ── Pricing ── */}
          <View style={styles.section}>
            <SectionTitle icon={<Tag size={14} color={colors.primary} />} label="Pricing" />

            {stats === null ? (
              <View style={[styles.priceCard, styles.priceCardLoading]}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : stats.rooms.length > 0 ? (
              <View style={styles.priceCard}>
                {stats.rooms.map((room, i) => (
                  <RoomPriceRow
                    key={room.localId}
                    room={room}
                    currency={currency}
                    isLast={i === stats.rooms.length - 1}
                    onEdit={() => openEdit(room)}
                  />
                ))}
              </View>
            ) : base != null ? (
              /* Fallback: single base price from ListProperty */
              <View style={styles.priceCard}>
                <View style={styles.priceRow}>
                  <View>
                    <AppText style={styles.priceLabel}>Per night</AppText>
                    <AppText style={styles.priceActive}>{currency} {base.toLocaleString()}</AppText>
                  </View>
                  <View style={styles.noDiscountPill}>
                    <AppText style={styles.noDiscountText}>No discount set</AppText>
                  </View>
                </View>
              </View>
            ) : null}
          </View>

          {/* ── Activity timeline ── */}
          <View style={styles.section}>
            <SectionTitle icon={<Clock size={14} color={colors.primary} />} label="Activity" />
            <View style={styles.timelineCard}>
              {stats?.approvedAt && (
                <TimelineRow dot="green" label="Approved" value={formatDate(stats.approvedAt)} />
              )}
              {property.lastSubmittedAt && (
                <TimelineRow dot="amber" label="Last submitted" value={formatDate(property.lastSubmittedAt)} />
              )}
              <TimelineRow dot="grey" label="Listed since" value={formatDate(property.createdAt)} last />
            </View>
          </View>

        </ScrollView>

        {/* ── Sticky footer ── */}
        <View style={styles.footer}>
          <Pressable onPress={() => onEdit(property.id)} style={styles.editBtn} accessibilityRole="button">
            <PenLine size={16} color={colors.white} />
            <AppText variant="bodySmall" weight="semiBold" style={styles.editBtnText}>Edit Property</AppText>
          </Pressable>
        </View>

      </SafeAreaView>
    </Modal>

    {/* ── Price edit sheet ── */}
    {editRoom && (
      <PriceEditSheet
        room={editRoom}
        currency={currency}
        price={editPrice}
        discount={editDiscount}
        saving={saving}
        onChangePrice={setEditPrice}
        onChangeDiscount={setEditDiscount}
        onClose={() => setEditRoom(null)}
        onSave={saveRoomPrice}
      />
    )}
    </>
  );
}

// ── RoomPriceRow ───────────────────────────────────────────────────────────

function RoomPriceRow({
  room, currency, isLast, onEdit,
}: {
  room: RoomEntry;
  currency: string;
  isLast: boolean;
  onEdit: () => void;
}) {
  const discounted = room.discountPercent
    ? Math.round(room.pricePerNight * (1 - room.discountPercent / 100))
    : null;

  return (
    <View style={[styles.roomRow, !isLast && styles.roomRowBorder]}>
      <View style={{ flex: 1, gap: 3 }}>
        <View style={styles.roomTypeRow}>
          <AppText variant="caption" weight="semiBold">{room.type}</AppText>
          <View style={styles.roomCountBadge}>
            <AppText style={styles.roomCountText}>x{room.count}</AppText>
          </View>
        </View>
        {discounted ? (
          <View style={{ gap: 1 }}>
            <AppText style={styles.priceStrike}>
              {currency} {room.pricePerNight.toLocaleString()}/night
            </AppText>
            <View style={styles.discountedRow}>
              <AppText style={styles.priceActive}>
                {currency} {discounted.toLocaleString()}/night
              </AppText>
              <View style={styles.discountBadge}>
                <TrendingDown size={10} color="#15803d" />
                <AppText style={styles.discountBadgeText}>{room.discountPercent}% off</AppText>
              </View>
            </View>
          </View>
        ) : (
          <AppText style={styles.priceActive}>
            {currency} {room.pricePerNight.toLocaleString()}/night
          </AppText>
        )}
      </View>
      <Pressable onPress={onEdit} style={styles.roomEditBtn} accessibilityRole="button">
        <PenLine size={14} color={colors.primary} />
      </Pressable>
    </View>
  );
}

// ── PriceEditSheet ─────────────────────────────────────────────────────────

function PriceEditSheet({
  room, currency, price, discount, saving,
  onChangePrice, onChangeDiscount, onClose, onSave,
}: {
  room: RoomEntry;
  currency: string;
  price: string;
  discount: string;
  saving: boolean;
  onChangePrice: (v: string) => void;
  onChangeDiscount: (v: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const numPrice   = Number(price) || 0;
  const numDisc    = Number(discount) || 0;
  const discounted = numDisc > 0 && numDisc < 100
    ? Math.round(numPrice * (1 - numDisc / 100))
    : null;

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={editStyles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={editStyles.backdrop} onPress={onClose} />
        <View style={editStyles.sheet}>
          <View style={editStyles.handle} />

          <AppText variant="bodySmall" weight="semiBold" style={editStyles.sheetTitle}>
            {room.type} pricing
          </AppText>
          <AppText variant="caption" tone="muted" style={editStyles.sheetSub}>
            x{room.count} room{room.count !== 1 ? "s" : ""}
          </AppText>

          {/* Price input */}
          <AppText style={editStyles.label}>Price per night ({currency})</AppText>
          <TextInput
            style={editStyles.input}
            value={price}
            onChangeText={onChangePrice}
            keyboardType="numeric"
            placeholder="e.g. 66000"
            placeholderTextColor={colors.softText}
          />

          {/* Discount input */}
          <AppText style={[editStyles.label, { marginTop: spacing[3] }]}>
            Discount percentage (optional)
          </AppText>
          <TextInput
            style={editStyles.input}
            value={discount}
            onChangeText={onChangeDiscount}
            keyboardType="numeric"
            placeholder="e.g. 10"
            placeholderTextColor={colors.softText}
          />

          {/* Live preview */}
          {discounted != null && (
            <View style={editStyles.preview}>
              <AppText style={editStyles.previewLabel}>Guests will pay</AppText>
              <AppText style={editStyles.previewPrice}>
                {currency} {discounted.toLocaleString()}/night
              </AppText>
              <AppText style={editStyles.previewSave}>
                saving {currency} {(numPrice - discounted).toLocaleString()} per night
              </AppText>
            </View>
          )}

          {/* Actions */}
          <View style={editStyles.actions}>
            <Pressable onPress={onClose} style={editStyles.cancelBtn} accessibilityRole="button">
              <AppText variant="caption" tone="muted">Cancel</AppText>
            </Pressable>
            <Pressable
              onPress={onSave}
              style={[editStyles.saveBtn, saving && { opacity: 0.7 }]}
              disabled={saving}
              accessibilityRole="button"
            >
              {saving
                ? <ActivityIndicator size="small" color={colors.white} />
                : <AppText variant="caption" weight="semiBold" style={{ color: colors.white }}>Save</AppText>
              }
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Shared sub-components ──────────────────────────────────────────────────

function SectionTitle({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <View style={styles.sectionTitle}>
      {icon}
      <AppText variant="bodySmall" weight="semiBold">{label}</AppText>
    </View>
  );
}

function StatTile({
  icon, value, label, compact = false,
}: {
  icon: ReactNode;
  value: string;
  label: string;
  compact?: boolean;
}) {
  return (
    <View style={styles.statTile}>
      {icon}
      <AppText weight="bold" numberOfLines={1} style={[styles.statValue, compact && styles.statValueCompact]}>
        {value}
      </AppText>
      <AppText variant="caption" tone="muted">{label}</AppText>
    </View>
  );
}

function TimelineRow({
  dot, label, value, last = false,
}: {
  dot: "green" | "amber" | "grey";
  label: string;
  value: string;
  last?: boolean;
}) {
  const dotColor =
    dot === "green" ? colors.accent.green
    : dot === "amber" ? "#f59e0b"
    : colors.border;
  return (
    <View style={styles.timelineRow}>
      <View style={styles.timelineDotCol}>
        <View style={[styles.timelineDot, { backgroundColor: dotColor }]} />
        {!last && <View style={styles.timelineLine} />}
      </View>
      <View style={[styles.timelineContent, !last && { paddingBottom: spacing[4] }]}>
        <AppText style={styles.timelineLabel}>{label}</AppText>
        <AppText style={styles.timelineValue}>{value}</AppText>
      </View>
    </View>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-TZ", { day: "numeric", month: "short", year: "numeric" });
  } catch { return ""; }
}

function shortNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

// ── Styles ─────────────────────────────────────────────────────────────────

const SCREEN_W = Dimensions.get("window").width;
const HERO_H   = Math.round(SCREEN_W * 0.54);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing[3], paddingVertical: spacing[3],
    borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.white,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: radius.full,
    alignItems: "center", justifyContent: "center", backgroundColor: colors.surface,
  },
  editHeaderBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: spacing[3], paddingVertical: 6,
    borderRadius: radius.full, borderWidth: 1, borderColor: colors.primary,
  },
  editHeaderText: { color: colors.primary },

  scroll: { paddingBottom: 110 },

  // Hero
  heroWrap: {
    marginHorizontal: spacing[4], marginTop: spacing[4],
    borderRadius: radius.xl, overflow: "hidden", height: HERO_H,
  },
  heroEmpty: {
    width: "100%", height: HERO_H,
    backgroundColor: colors.primaryDeep,
    alignItems: "center", justifyContent: "center",
  },
  heroGradient: {
    position: "absolute", bottom: 0, left: 0, right: 0, height: HERO_H * 0.5,
    backgroundColor: "rgba(0,0,0,0.32)",
  },
  heroVerifyBadge: {
    position: "absolute", top: spacing[3], right: spacing[3],
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  heroDots: {
    position: "absolute", bottom: spacing[3], right: spacing[3],
    flexDirection: "row", alignItems: "center", gap: 4,
  },
  heroDot:       { width: 5, height: 5, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.45)" },
  heroDotActive: { width: 14, backgroundColor: colors.white },

  // Identity
  identity: {
    paddingHorizontal: spacing[4], paddingTop: spacing[4], paddingBottom: spacing[3], gap: spacing[2],
  },
  identityTitle:    { fontSize: 20, lineHeight: 26, color: colors.text },
  identityMeta:     { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing[2] },
  typeChip:         { backgroundColor: colors.brand[50], borderRadius: radius.sm, paddingHorizontal: 7, paddingVertical: 2 },
  typeChipText:     { fontSize: 10, fontWeight: "700", color: colors.primary, letterSpacing: 0.3 },
  identityLocation: { flexDirection: "row", alignItems: "center", gap: 3 },
  locationText:     { fontSize: 11, color: colors.softText, flexShrink: 1 },

  // Stats
  statsCard: {
    flexDirection: "row", alignItems: "center",
    marginHorizontal: spacing[4],
    borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border,
    overflow: "hidden", backgroundColor: colors.white,
  },
  statTile:         { flex: 1, alignItems: "center", paddingVertical: spacing[4], gap: 5 },
  statDivider:      { width: 1, height: 52, backgroundColor: colors.border },
  statValue:        { fontSize: 16, fontWeight: "800", color: colors.text },
  statValueCompact: { fontSize: 13 },

  // Section
  section:      { paddingHorizontal: spacing[4], marginTop: spacing[5] },
  sectionTitle: { flexDirection: "row", alignItems: "center", gap: spacing[2], marginBottom: spacing[3] },

  // Price card
  priceCard: {
    borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.white, overflow: "hidden",
  },
  priceCardLoading: { paddingVertical: spacing[5], alignItems: "center" },
  priceRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: spacing[4],
  },
  priceLabel:     { fontSize: 11, color: colors.softText, marginBottom: 4 },
  priceActive:    { fontSize: 15, fontWeight: "800", color: colors.primary },
  priceStrike:    { fontSize: 12, color: colors.softText, textDecorationLine: "line-through" },
  discountedRow:  { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  discountBadge:  {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: "#dcfce7", borderRadius: radius.full,
    paddingHorizontal: spacing[2], paddingVertical: 3,
  },
  discountBadgeText: { fontSize: 10, fontWeight: "700", color: "#15803d" },
  noDiscountPill:    {
    backgroundColor: colors.surface, borderRadius: radius.full,
    paddingHorizontal: spacing[3], paddingVertical: 5,
    borderWidth: 1, borderColor: colors.border,
  },
  noDiscountText: { fontSize: 11, color: colors.softText },

  // Room rows
  roomRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: spacing[4], paddingVertical: spacing[3],
  },
  roomRowBorder:  { borderBottomWidth: 1, borderBottomColor: colors.border },
  roomTypeRow:    { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  roomCountBadge: {
    backgroundColor: colors.surface, borderRadius: radius.sm,
    paddingHorizontal: 5, paddingVertical: 1,
    borderWidth: 1, borderColor: colors.border,
  },
  roomCountText: { fontSize: 9, fontWeight: "700", color: colors.softText },
  roomEditBtn: {
    width: 34, height: 34, borderRadius: radius.md,
    backgroundColor: colors.brand[50],
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: colors.border,
    marginLeft: spacing[3],
  },

  // Timeline
  timelineCard:   { gap: 0 },
  timelineRow:    { flexDirection: "row", gap: spacing[3] },
  timelineDotCol: { alignItems: "center", width: 12 },
  timelineDot:    { width: 10, height: 10, borderRadius: 5, marginTop: 2 },
  timelineLine:   { width: 1, flex: 1, backgroundColor: colors.border, marginTop: 4 },
  timelineContent: {
    flex: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
  },
  timelineLabel: { fontSize: 12, color: colors.softText },
  timelineValue: { fontSize: 12, fontWeight: "600", color: colors.text },

  // Footer
  footer: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: colors.white,
    paddingHorizontal: spacing[4], paddingVertical: spacing[3],
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  editBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing[2],
    backgroundColor: colors.primary, borderRadius: radius.xl, paddingVertical: spacing[3] + 2,
  },
  editBtnText: { color: colors.white },
});

// ── Edit sheet styles ──────────────────────────────────────────────────────

const editStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl * 2,
    borderTopRightRadius: radius.xl * 2,
    paddingHorizontal: spacing[5],
    paddingTop: spacing[3],
    paddingBottom: spacing[6],
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center", marginBottom: spacing[4],
  },
  sheetTitle: { marginBottom: 2 },
  sheetSub:   { marginBottom: spacing[4] },
  label: { fontSize: 12, color: colors.softText, marginBottom: spacing[1] },
  input: {
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing[3], paddingVertical: spacing[2] + 2,
    fontSize: 15, fontWeight: "600", color: colors.text,
    backgroundColor: colors.surface,
  },
  preview: {
    marginTop: spacing[4],
    padding: spacing[4],
    borderRadius: radius.xl,
    backgroundColor: "#f0fdf4",
    borderWidth: 1, borderColor: "#bbf7d0",
    gap: 2,
  },
  previewLabel: { fontSize: 11, color: "#15803d" },
  previewPrice: { fontSize: 18, fontWeight: "800", color: "#15803d" },
  previewSave:  { fontSize: 11, color: "#15803d", opacity: 0.7 },
  actions: {
    flexDirection: "row", gap: spacing[3], marginTop: spacing[5],
  },
  cancelBtn: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingVertical: spacing[3],
    borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  saveBtn: {
    flex: 2, alignItems: "center", justifyContent: "center",
    paddingVertical: spacing[3],
    borderRadius: radius.xl, backgroundColor: colors.primary,
  },
});
