import { AppText, colors, radius, spacing, apiRequest, getErrorMessage } from "@nolsaf/native-ui";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock,
  MapPin,
  PenLine,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  LayoutChangeEvent,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../auth";
import { OwnerManageSheet } from "./OwnerManageSheet";
import { STATUS_META } from "./property/data";
import type { ListProperty } from "./property/types";

// ── Props ──────────────────────────────────────────────────────────────────

type Props = {
  visible: boolean;
  onClose: () => void;
  onAddProperty: () => void;
  onEditProperty: (propertyId: number) => void;
};

// ── Tab config ─────────────────────────────────────────────────────────────

const TABS = [
  { key: "ALL",       label: "All",       desc: "All your listed properties" },
  { key: "APPROVED",  label: "Approved",  desc: "Live and accepting bookings" },
  { key: "DRAFT",     label: "Draft",     desc: "Incomplete listings in progress" },
  { key: "PENDING",   label: "Pending",   desc: "Submitted and awaiting review" },
  { key: "REJECTED",  label: "Rejected",  desc: "Listings that need your attention" },
  { key: "SUSPENDED", label: "Suspended", desc: "Temporarily paused by admin" },
] as const;

type TabKey = typeof TABS[number]["key"];

// ── Sliding tab bar ────────────────────────────────────────────────────────

const PILL_H = 32;

function SlidingTabs({
  activeTab,
  onSelect,
  counts,
}: {
  activeTab: TabKey;
  onSelect: (k: TabKey) => void;
  counts: Record<TabKey, number>;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const slideX = useRef(new Animated.Value(0)).current;
  const slideW = useRef(new Animated.Value(56)).current;
  const layouts = useRef<Partial<Record<TabKey, { x: number; width: number }>>>({});

  const recordLayout = (key: TabKey, e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    layouts.current[key] = { x, width };
    if (key === activeTab) {
      slideX.setValue(x);
      slideW.setValue(width);
    }
  };

  useEffect(() => {
    const layout = layouts.current[activeTab];
    if (!layout) return;
    Animated.parallel([
      Animated.spring(slideX, { toValue: layout.x, useNativeDriver: false, damping: 18, stiffness: 200 }),
      Animated.spring(slideW, { toValue: layout.width, useNativeDriver: false, damping: 18, stiffness: 200 }),
    ]).start();
    scrollRef.current?.scrollTo({ x: Math.max(0, layout.x - spacing[4] * 2), animated: true });
  }, [activeTab, slideX, slideW]);

  const activeTabData = TABS.find(t => t.key === activeTab)!;

  return (
    <View style={tabStyles.wrap}>
      <ScrollView ref={scrollRef} horizontal showsHorizontalScrollIndicator={false}>
        <View style={tabStyles.row}>
          <Animated.View
            style={[tabStyles.slidePill, { left: slideX, width: slideW }]}
            pointerEvents="none"
          />
          {TABS.map(tab => {
            const active = tab.key === activeTab;
            const count = counts[tab.key];
            return (
              <Pressable
                key={tab.key}
                onLayout={e => recordLayout(tab.key, e)}
                onPress={() => onSelect(tab.key)}
                style={[tabStyles.tab, !active && tabStyles.tabInactive]}
                accessibilityRole="button"
              >
                <AppText
                  variant="caption"
                  weight={active ? "semiBold" : "regular"}
                  style={[tabStyles.tabLabel, active && tabStyles.tabLabelActive]}
                >
                  {tab.label}
                </AppText>
                {count > 0 && (
                  <View style={[tabStyles.badge, active && tabStyles.badgeActive]}>
                    <AppText style={[tabStyles.badgeText, active && tabStyles.badgeTextActive]}>
                      {count}
                    </AppText>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
      <View style={tabStyles.descRow}>
        <View style={tabStyles.descDot} />
        <AppText variant="caption" style={tabStyles.descText}>
          {activeTabData.desc}
        </AppText>
      </View>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing[3],
    paddingTop: spacing[2],
    paddingBottom: spacing[2],
    gap: spacing[2],
  },
  slidePill: {
    position: "absolute",
    top: spacing[2],
    height: PILL_H,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing[3],
    height: PILL_H,
    borderRadius: radius.full,
    backgroundColor: "transparent",
  },
  tabInactive: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabLabel: { color: colors.softText },
  tabLabelActive: { color: colors.white },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeActive: { backgroundColor: "rgba(255,255,255,0.28)" },
  badgeText: { fontSize: 9, fontWeight: "700", color: colors.softText },
  badgeTextActive: { color: colors.white },
  descRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[2],
    paddingTop: 2,
  },
  descDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.primary,
    opacity: 0.6,
  },
  descText: { fontSize: 11, color: colors.softText },
});

// ── Component ──────────────────────────────────────────────────────────────

export function OwnerPropertiesScreen({ visible, onClose, onAddProperty, onEditProperty }: Props) {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("ALL");
  const [items, setItems] = useState<ListProperty[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manageProp, setManageProp] = useState<ListProperty | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest(`/api/owner/properties/mine`, { method: "GET", token }) as { items: ListProperty[] };
      setItems(data.items ?? []);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  const handleDelete = (property: ListProperty) => {
    if (property.status !== "DRAFT") return;
    Alert.alert(
      "Delete draft",
      `Delete "${property.title || "Untitled"}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await apiRequest(`/api/owner/properties/${property.id}`, { method: "DELETE", token });
              setItems(prev => prev.filter(p => p.id !== property.id));
            } catch (e) {
              Alert.alert("Error", getErrorMessage(e));
            }
          },
        },
      ]
    );
  };

  const filtered = activeTab === "ALL" ? items : items.filter(p => p.status === activeTab);

  const counts = useMemo<Record<TabKey, number>>(() => {
    const c: Record<TabKey, number> = { ALL: items.length, APPROVED: 0, DRAFT: 0, PENDING: 0, REJECTED: 0, SUSPENDED: 0 };
    for (const item of items) {
      const k = item.status as TabKey;
      if (k in c) c[k]++;
    }
    return c;
  }, [items]);

  return (
    <>
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>

        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.backBtn} accessibilityRole="button">
            <ArrowLeft size={20} color={colors.text} />
          </Pressable>
          <View style={styles.headerTitle}>
            <Building2 size={18} color={colors.primary} />
            <AppText variant="bodySmall" weight="semiBold">My Properties</AppText>
          </View>
          <Pressable onPress={onAddProperty} style={styles.addBtn} accessibilityRole="button" accessibilityLabel="Add property">
            <Plus size={18} color={colors.white} />
          </Pressable>
        </View>

        {/* Status tabs with sliding indicator */}
        <SlidingTabs activeTab={activeTab} onSelect={setActiveTab} counts={counts} />

        {/* List */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <AppText variant="bodySmall" tone="muted">{error}</AppText>
            <Pressable onPress={load} style={styles.retryBtn}>
              <RefreshCw size={14} color={colors.primary} />
              <AppText variant="caption" tone="primary">Retry</AppText>
            </Pressable>
          </View>
        ) : filtered.length === 0 ? (
          <EmptyState onAdd={onAddProperty} tab={activeTab} />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={p => String(p.id)}
            numColumns={2}
            columnWrapperStyle={styles.listRow}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <PropertyCard
                property={item}
                onEdit={() => onEditProperty(item.id)}
                onManage={() => setManageProp(item)}
                onDelete={() => handleDelete(item)}
              />
            )}
          />
        )}
      </SafeAreaView>
    </Modal>

    <OwnerManageSheet
      property={manageProp}
      visible={manageProp !== null}
      onClose={() => setManageProp(null)}
      onEdit={(id) => { setManageProp(null); onEditProperty(id); }}
    />
    </>
  );
}

// 2-column grid: (screen - list padding*2 - column gap) / 2
const SCREEN_W = Dimensions.get("window").width;
const CARD_W   = Math.floor((SCREEN_W - spacing[3] * 2 - spacing[2]) / 2);
const PHOTO_H  = Math.round(CARD_W * 0.68);

// ── PropertyCard ───────────────────────────────────────────────────────────

const PROGRESS_STEPS = ["Basics", "Rooms", "Services", "Photos"] as const;

function PropertyCard({
  property, onEdit, onManage, onDelete
}: {
  property: ListProperty;
  onEdit: () => void;
  onManage: () => void;
  onDelete: () => void;
}) {
  const meta     = STATUS_META[property.status] ?? STATUS_META["DRAFT"];
  const thumb    = Array.isArray(property.photos) && property.photos.length > 0 ? property.photos[0] : null;
  const location = [property.city, property.district, property.regionName].filter(Boolean).join(", ");
  const price    = property.basePrice
    ? `${property.currency ?? "TZS"} ${Number(property.basePrice).toLocaleString()}/night`
    : null;
  const isDraft  = property.status === "DRAFT";

  const stepsDone: Record<string, boolean> = {
    Basics:   !!(property.title && property.type && property.regionName),
    Rooms:    !!property.basePrice,
    Services: !!property.basePrice, // services are optional; if rooms are done the owner has passed this step
    Photos:   (property.photos?.length ?? 0) >= 3,
  };
  const doneCount = Object.values(stepsDone).filter(Boolean).length;

  return (
    <View style={styles.card}>
      {/* ── Header: title + delete ── */}
      <View style={styles.cardHeader}>
        <AppText variant="bodySmall" weight="semiBold" numberOfLines={1} style={{ flex: 1 }}>
          {property.title || "Untitled property"}
        </AppText>
        {isDraft && (
          <Pressable onPress={onDelete} style={styles.cardDeleteBtn} accessibilityRole="button">
            <Trash2 size={15} color={colors.softText} />
          </Pressable>
        )}
      </View>

      {/* ── Photo ── */}
      <View style={styles.cardPhoto}>
        {thumb ? (
          <Image source={{ uri: thumb }} style={styles.cardPhotoImg} resizeMode="cover" />
        ) : (
          <View style={styles.cardPhotoEmpty}>
            <View style={styles.photoBlobTl} />
            <View style={styles.photoBlobBr} />
            <View style={styles.photoLogoWrap}>
              <View style={styles.photoLogoInner}>
                <AppText style={styles.photoLogoText}>N</AppText>
              </View>
            </View>
          </View>
        )}
        {thumb && <View style={styles.photoGradientOverlay} pointerEvents="none" />}
        {isDraft ? (
          <View style={styles.statusBadge}>
            <PenLine size={9} color={colors.white} />
            <AppText style={styles.statusText}>{meta.label}</AppText>
          </View>
        ) : (
          <View style={styles.verifyBadge}>
            {property.status === "APPROVED"  && <CheckCircle2  size={22} color={meta.color} fill={meta.bg} />}
            {property.status === "PENDING"   && <Clock         size={20} color={meta.color} />}
            {property.status === "REJECTED"  && <AlertTriangle size={20} color={meta.color} />}
            {property.status === "SUSPENDED" && <Circle        size={20} color={meta.color} />}
          </View>
        )}
      </View>

      {/* ── Location + type + price ── */}
      <View style={styles.cardInfo}>
        {location ? (
          <View style={styles.cardMeta}>
            <MapPin size={11} color={colors.softText} />
            <AppText style={styles.cardLocation} numberOfLines={1}>
              {location}
            </AppText>
          </View>
        ) : null}

        {property.status === "REJECTED" && Array.isArray(property.rejectionReasons) && property.rejectionReasons.length > 0 && (
          <View style={styles.rejectionBox}>
            <AlertTriangle size={12} color="#b91c1c" />
            <AppText variant="caption" style={styles.rejectionText} numberOfLines={2}>
              {property.rejectionReasons[0]}
            </AppText>
          </View>
        )}

        {!isDraft && (property.type || price) ? (
          <View style={styles.typeAndPrice}>
            {property.type ? (
              <View style={styles.typeBadge}>
                <AppText style={styles.typeBadgeText}>{property.type}</AppText>
              </View>
            ) : null}
            {price ? (
              <AppText style={styles.cardPrice} numberOfLines={1}>{price}</AppText>
            ) : null}
          </View>
        ) : null}

        {property.status === "APPROVED" && property._count.bookings > 0 && (
          <AppText style={styles.bookingCount}>
            {property._count.bookings} booking{property._count.bookings !== 1 ? "s" : ""}
          </AppText>
        )}
      </View>

      {/* ── Draft: progress steps ── */}
      {isDraft && (
        <View style={styles.progressWrap}>
          <View style={styles.progressHeader}>
            <AppText variant="caption" weight="semiBold">Progress</AppText>
            <AppText variant="caption" tone="muted">{doneCount} of {PROGRESS_STEPS.length} sections</AppText>
          </View>
          <View style={styles.progressSteps}>
            {PROGRESS_STEPS.map((step, i) => {
              const done    = stepsDone[step];
              const current = !done && i === PROGRESS_STEPS.findIndex(s => !stepsDone[s]);
              return (
                <View key={step} style={styles.progressStep}>
                  {done
                    ? <CheckCircle2 size={18} color={colors.accent.green} />
                    : current
                    ? <Circle size={18} color="#f59e0b" fill="#fef3c7" />
                    : <Circle size={18} color={colors.border} />
                  }
                  <AppText style={[
                    styles.progressStepLabel,
                    done    && { color: colors.accent.green },
                    current && { color: "#b45309" },
                  ]}>
                    {step}
                  </AppText>
                  {current && <View style={styles.progressStepUnderline} />}
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* ── CTAs ── */}
      {isDraft ? (
        <View style={styles.cardCtaWrap}>
          <Pressable onPress={onEdit} style={styles.ctaPrimary} accessibilityRole="button">
            <PenLine size={14} color={colors.white} />
            <AppText variant="caption" weight="semiBold" style={{ color: colors.white }}>Continue editing</AppText>
            <ArrowRight size={14} color={colors.white} />
          </Pressable>
        </View>
      ) : (
        <View style={styles.cardFooter}>
          <View style={styles.cardDateRow}>
            <Clock size={10} color={colors.softText} />
            <AppText style={styles.cardDateText}>{formatDate(property.createdAt)}</AppText>
          </View>
          <Pressable onPress={onManage} style={styles.cardManageBtn} accessibilityRole="button">
            <AppText style={styles.cardManageText}>Manage</AppText>
            <ChevronRight size={11} color={colors.primary} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────

function EmptyState({ onAdd, tab }: { onAdd: () => void; tab: TabKey }) {
  const msg = tab === "ALL"
    ? "No properties yet. Add your first property to get started."
    : `No ${STATUS_META[tab]?.label.toLowerCase() ?? tab.toLowerCase()} properties.`;

  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Building2 size={32} color={colors.softText} />
      </View>
      <AppText variant="bodySmall" weight="semiBold" style={styles.emptyTitle}>
        {tab === "ALL" ? "No properties" : `No ${STATUS_META[tab]?.label ?? tab} properties`}
      </AppText>
      <AppText variant="caption" tone="muted" style={styles.emptyMsg}>{msg}</AppText>
      {tab === "ALL" ? (
        <Pressable onPress={onAdd} style={styles.emptyAdd} accessibilityRole="button">
          <Plus size={15} color={colors.white} />
          <AppText variant="caption" weight="semiBold" style={{ color: colors.white }}>Add property</AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-TZ", { day: "numeric", month: "short", year: "numeric" });
  } catch { return ""; }
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing[3], paddingVertical: spacing[3],
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  backBtn: { width: 36, height: 36, borderRadius: radius.full, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  headerTitle: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  addBtn: { width: 36, height: 36, borderRadius: radius.full, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary },
  // List
  list: { padding: spacing[3], gap: spacing[2] },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing[2] },
  retryBtn: { flexDirection: "row", alignItems: "center", gap: spacing[1], marginTop: spacing[1] },
  listRow: { gap: spacing[2] },
  // Card
  card: {
    width: CARD_W,
    borderRadius: radius.xl, borderWidth: 1,
    borderColor: colors.border, backgroundColor: colors.white, overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: spacing[2], paddingTop: spacing[2], paddingBottom: spacing[1], gap: spacing[1],
  },
  cardDeleteBtn: {
    width: 28, height: 28, borderRadius: radius.md,
    backgroundColor: colors.surface, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: colors.border,
  },
  cardPhoto: { height: PHOTO_H, position: "relative", borderRadius: radius.md, overflow: "hidden", marginHorizontal: spacing[2], marginTop: spacing[1] },
  cardPhotoImg: { width: "100%", height: PHOTO_H },
  cardPhotoEmpty: {
    width: "100%", height: PHOTO_H,
    backgroundColor: colors.primaryDeep,
    alignItems: "center", justifyContent: "center",
    overflow: "hidden",
  },
  photoBlobTl: {
    position: "absolute", top: -20, left: -20,
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: "rgba(93,202,165,0.18)",
  },
  photoBlobBr: {
    position: "absolute", bottom: -10, right: -10,
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: "rgba(93,202,165,0.12)",
  },
  photoLogoWrap: {
    width: 52, height: 52, borderRadius: 14,
    borderWidth: 2, borderColor: "rgba(93,202,165,0.5)",
    alignItems: "center", justifyContent: "center",
  },
  photoLogoInner: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: "rgba(93,202,165,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  photoLogoText: {
    color: colors.onHeroSoft, fontSize: 18, fontWeight: "800", letterSpacing: 1,
  },
  photoGradientOverlay: {
    position: "absolute", bottom: 0, left: 0, right: 0, height: 50,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  statusBadge: {
    position: "absolute", bottom: spacing[2], left: spacing[2],
    flexDirection: "row", alignItems: "center", gap: 3,
    paddingHorizontal: spacing[2], paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  statusText: { fontSize: 9, fontWeight: "700", color: colors.white },
  verifyBadge: {
    position: "absolute", top: spacing[2], right: spacing[2],
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.white,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  cardInfo: {
    paddingHorizontal: spacing[2], paddingTop: spacing[2], paddingBottom: spacing[1], gap: spacing[1],
  },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  cardLocation: { flex: 1, fontSize: 10, color: colors.softText },
  typeBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.brand[50],
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  typeBadgeText: { fontSize: 9, fontWeight: "700", color: colors.primary, letterSpacing: 0.4 },
  typeAndPrice: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardPrice: { fontSize: 12, fontWeight: "700", color: colors.primary, flexShrink: 1 },
  bookingCount: { fontSize: 10, color: colors.softText },
  cardDateRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  cardDateText: { fontSize: 10, color: colors.softText },
  rejectionBox: {
    flexDirection: "row", alignItems: "flex-start", gap: spacing[1],
    backgroundColor: "#fee2e2", borderRadius: radius.sm, padding: spacing[2],
  },
  rejectionText: { flex: 1, color: "#b91c1c", fontSize: 10 },
  // Progress
  progressWrap: {
    paddingHorizontal: spacing[2], paddingBottom: spacing[2], gap: spacing[1],
    borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing[2],
  },
  progressHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  progressSteps: { flexDirection: "row", justifyContent: "space-around" },
  progressStep: { alignItems: "center", gap: 2, position: "relative" },
  progressStepLabel: { fontSize: 9, color: colors.softText },
  progressStepUnderline: {
    position: "absolute", bottom: -4,
    left: 0, right: 0, height: 2,
    backgroundColor: "#f59e0b", borderRadius: radius.full,
  },
  // CTA
  cardCtaWrap: { paddingHorizontal: spacing[2], paddingBottom: spacing[2] },
  ctaPrimary: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing[1],
    backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: spacing[2] + 2,
  },
  cardFooter: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing[3], paddingVertical: spacing[2] + 1,
    borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface,
  },
  cardManageBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
  cardManageText: { fontSize: 11, fontWeight: "600", color: colors.primary },
  // Empty
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing[6], gap: spacing[3] },
  emptyIcon: { width: 64, height: 64, borderRadius: radius.full, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  emptyTitle: { textAlign: "center" },
  emptyMsg: { textAlign: "center", lineHeight: 18 },
  emptyAdd: {
    flexDirection: "row", alignItems: "center", gap: spacing[2],
    backgroundColor: colors.primary, paddingHorizontal: spacing[4],
    paddingVertical: spacing[2], borderRadius: radius.full, marginTop: spacing[1],
  },
});
