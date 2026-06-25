import { AppText, colors, radius, spacing, apiRequest, getErrorMessage } from "@nolsaf/native-ui";
import { AlertCircle, ArrowLeft, BedDouble, Camera, Check, CheckCircle, ClipboardList, Eye, Home, Save, Star } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../../auth";
import { EMPTY_DRAFT, PropertyDraft } from "./types";
import { BasicsStep }   from "./steps/BasicsStep";
import { RoomsStep }    from "./steps/RoomsStep";
import { ServicesStep } from "./steps/ServicesStep";
import { TotalsStep }   from "./steps/TotalsStep";
import { PhotosStep }   from "./steps/PhotosStep";
import { ReviewStep }   from "./steps/ReviewStep";

// ── Step meta ──────────────────────────────────────────────────────────────

type StepMeta = {
  num: number;
  label: string;
  icon: LucideIcon;
  hint: string;
};

const STEPS: StepMeta[] = [
  { num: 1, label: "Basics",   icon: Home,          hint: "Name, type, and location of your property" },
  { num: 2, label: "Rooms",    icon: BedDouble,      hint: "Room types, layouts, and sleeping capacity" },
  { num: 3, label: "Services", icon: Star,           hint: "Amenities, parking, meals, and extras" },
  { num: 4, label: "Details",  icon: ClipboardList,  hint: "Guest limits, pricing, and house rules" },
  { num: 5, label: "Photos",   icon: Camera,         hint: "Upload clear photos that showcase your space" },
  { num: 6, label: "Review",   icon: Eye,            hint: "Check everything before you submit for approval" },
];

// ── Props ──────────────────────────────────────────────────────────────────

type Props = {
  visible: boolean;
  onClose: () => void;
  propertyId?: number;
  onSuccess?: () => void;
};

// ── Component ──────────────────────────────────────────────────────────────

const DRAFT_STORAGE_KEY = "nolsaf_wizard_draft";

// Coordinates arrive from the API as a number, string, or a serialized Prisma
// Decimal (a plain object). String(decimalObject) yields "[object Object]", so
// coerce through parseFloat and drop anything non-finite.
function coordToString(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "object") {
    const n = parseFloat(String((v as { toString?: () => string }).toString?.() ?? ""));
    return Number.isFinite(n) ? String(n) : "";
  }
  const n = parseFloat(String(v));
  return Number.isFinite(n) ? String(n) : "";
}

function webSaveDraft(draft: PropertyDraft, step: number, savedId: number | null) {
  if (Platform.OS !== "web") return;
  try { localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ draft, step, savedId })); } catch {}
}

function webLoadDraft(): { draft: PropertyDraft; step: number; savedId: number | null } | null {
  if (Platform.OS !== "web") return null;
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.draft?.title) return null;
    return parsed;
  } catch { return null; }
}

function webClearDraft() {
  if (Platform.OS !== "web") return;
  try { localStorage.removeItem(DRAFT_STORAGE_KEY); } catch {}
}

// The API expects hotelStar as a number (1-5); the wizard keeps the string key
// from the star picker (basic/simple/moderate/high/luxury). Map before sending.
const HOTEL_STAR_TO_NUMBER: Record<string, number> = {
  basic: 1, simple: 2, moderate: 3, high: 4, luxury: 5,
};

// The public property page and the web owner form read each room with a specific
// set of field names (roomType, roomsCount, bathItems, bathPrivate "yes"/"no",
// smoking "yes"/"no", otherAmenities, roomDescription, roomImages). The native
// wizard uses its own names (type, count, bathroomItems, bathroomPrivate bool,
// smokingAllowed bool, amenities, description, photos). We persist BOTH so the
// public page renders correctly AND the native wizard can still reload its draft.
function toApiRoomsSpec(rooms: PropertyDraft["roomsSpec"]) {
  return rooms.map((r) => ({
    ...r, // keep native field names for the wizard's own reload/edit
    // web + public-page compatible aliases (derived fresh from native fields)
    roomType:        r.type === "Other" ? (r.otherType || r.type) : r.type,
    roomsCount:      Number(r.count) || 0,
    pricePerNight:   Number(r.pricePerNight) || 0,
    bathPrivate:     r.bathroomPrivate ? "yes" : "no",
    bathItems:       r.bathroomItems ?? [],
    smoking:         r.smokingAllowed ? "yes" : "no",
    otherAmenities:  r.amenities ?? [],
    roomDescription: r.description ?? "",
    roomImages:      r.photos ?? [],
  }));
}

// Inverse of toApiRoomsSpec: normalize whatever the API returns (could be in
// native names, web names, or both) back into a clean native RoomSpec so the
// wizard never crashes on a missing field (e.g. room.photos was undefined when
// a property was last saved by the web form, which uses roomImages).
function fromApiRoomsSpec(raw: unknown): PropertyDraft["roomsSpec"] {
  if (!Array.isArray(raw)) return [];
  return raw.map((r: any) => ({
    _localId:        String(r?._localId ?? Math.random().toString(36).slice(2)),
    type:            String(r?.type ?? r?.roomType ?? ""),
    otherType:       String(r?.otherType ?? ""),
    count:           String(r?.count ?? r?.roomsCount ?? "1"),
    beds: {
      twin:  Number(r?.beds?.twin)  || 0,
      full:  Number(r?.beds?.full)  || 0,
      queen: Number(r?.beds?.queen) || 0,
      king:  Number(r?.beds?.king)  || 0,
    },
    pricePerNight:   r?.pricePerNight != null ? String(r.pricePerNight) : "",
    bathroomPrivate: typeof r?.bathroomPrivate === "boolean"
      ? r.bathroomPrivate
      : r?.bathPrivate === "no" ? false : true,
    smokingAllowed:  typeof r?.smokingAllowed === "boolean"
      ? r.smokingAllowed
      : r?.smoking === "yes",
    bathroomItems:   Array.isArray(r?.bathroomItems) ? r.bathroomItems
                   : Array.isArray(r?.bathItems)     ? r.bathItems : [],
    amenities:       Array.isArray(r?.amenities)      ? r.amenities
                   : Array.isArray(r?.otherAmenities) ? r.otherAmenities : [],
    description:     String(r?.description ?? r?.roomDescription ?? ""),
    photos:          Array.isArray(r?.photos)     ? r.photos
                   : Array.isArray(r?.roomImages) ? r.roomImages : [],
  }));
}

export function PropertyWizardScreen({ visible, onClose, propertyId, onSuccess }: Props) {
  const { token } = useAuth();

  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<PropertyDraft>(EMPTY_DRAFT);
  const [savedId, setSavedId] = useState<number | null>(propertyId ?? null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // Refs to avoid stale closures in the auto-save timeout
  const draftRef    = useRef(draft);
  const savedIdRef  = useRef<number | null>(savedId);
  const savingRef   = useRef(false);
  const mountedRef  = useRef(false);
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // JSON snapshot of the last loaded/saved draft. The auto-save compares against
  // this so merely OPENING a property (which hydrates the draft) never triggers a
  // phantom PUT — only a genuine edit does. Prevents silent status churn.
  const lastSavedRef = useRef<string>("");

  useEffect(() => { draftRef.current = draft; },   [draft]);
  useEffect(() => { savedIdRef.current = savedId; }, [savedId]);
  useEffect(() => { savingRef.current = saving; },  [saving]);

  // Progress bar animation
  const progress = useRef(new Animated.Value(1)).current;

  // Step strip auto-scroll
  const stepListRef = useRef<FlatList>(null);

  useEffect(() => {
    stepListRef.current?.scrollToIndex({
      index: step - 1,
      animated: true,
      viewPosition: 0.5,
    });
  }, [step]);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: step,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [step, progress]);

  // Load existing property for editing — or restore web draft on refresh
  useEffect(() => {
    if (!visible) return;
    setDone(false);
    if (!propertyId) {
      const stored = webLoadDraft();
      if (stored) {
        setDraft(stored.draft);
        setStep(stored.step);
        setSavedId(stored.savedId);
        lastSavedRef.current = JSON.stringify(stored.draft);
      } else {
        setDraft(EMPTY_DRAFT);
        setStep(1);
        setSavedId(null);
        lastSavedRef.current = JSON.stringify(EMPTY_DRAFT);
      }
      return;
    }
    setStep(1);
    setSavedId(propertyId);
    setLoading(true);
    apiRequest(`/api/owner/properties/${propertyId}`, { method: "GET", token })
      .then((raw) => {
        const p = raw as Record<string, unknown>;
        const services = (p.services as Record<string, unknown>) ?? {};
        const houseRules = (services.houseRules as Record<string, unknown>) ?? {};
        const loaded: PropertyDraft = {
          title:           String(p.title ?? ""),
          type:            String(p.type ?? ""),
          otherType:       "",
          hotelStar:       String(p.hotelStar ?? ""),
          buildingType:    String(p.buildingType ?? "single_storey"),
          totalFloors:     p.totalFloors != null ? String(p.totalFloors) : "",
          regionName:      String(p.regionName ?? ""),
          district:        String(p.district ?? ""),
          ward:            String(p.ward ?? ""),
          street:          String(p.street ?? ""),
          city:            String(p.city ?? ""),
          zip:             String(p.zip ?? ""),
          country:         String(p.country ?? "Tanzania"),
          latitude:        coordToString(p.latitude),
          longitude:       coordToString(p.longitude),
          tourismSiteId:   (p.tourismSiteId as number) ?? null,
          tourismSiteName: String(p.tourismSiteName ?? ""),
          parkPlacement:   (p.parkPlacement as "INSIDE" | "NEARBY" | "") ?? "",
          roomsSpec:       fromApiRoomsSpec(p.roomsSpec),
          services: {
            parking:             (String(services.parking ?? "") as PropertyDraft["services"]["parking"]),
            parkingPrice:        String(services.parkingPrice ?? ""),
            breakfastIncluded:   Boolean(services.breakfastIncluded),
            breakfastAvailable:  Boolean(services.breakfastAvailable),
            restaurant:          Boolean(services.restaurant),
            bar:                 Boolean(services.bar),
            pool:                Boolean(services.pool),
            sauna:               Boolean(services.sauna),
            laundry:             Boolean(services.laundry),
            roomService:         Boolean(services.roomService),
            security24:          Boolean(services.security24),
            firstAid:            Boolean(services.firstAid),
            fireExtinguisher:    Boolean(services.fireExtinguisher),
            onSiteShop:          Boolean(services.onSiteShop),
            nearbyMall:          Boolean(services.nearbyMall),
            socialHall:          Boolean(services.socialHall),
            sportsGames:         Boolean(services.sportsGames),
            gym:                 Boolean(services.gym),
            nearbyFacilities:    (services.nearbyFacilities as PropertyDraft["services"]["nearbyFacilities"]) ?? [],
          },
          totalBedrooms:       p.totalBedrooms != null ? String(p.totalBedrooms) : "",
          totalBathrooms:      p.totalBathrooms != null ? String(p.totalBathrooms) : "",
          maxGuests:           p.maxGuests != null ? String(p.maxGuests) : "",
          description:         String(p.description ?? ""),
          acceptGroupBookings: Boolean((services as Record<string, unknown>).acceptGroupBookings),
          houseRules: {
            checkInFrom:      String(houseRules.checkInFrom ?? ""),
            checkOutFrom:     String(houseRules.checkOutFrom ?? ""),
            petsAllowed:      houseRules.petsAllowed != null ? Boolean(houseRules.petsAllowed) : null,
            petsNote:         String(houseRules.petsNote ?? ""),
            smokingNotAllowed:houseRules.smokingNotAllowed != null ? Boolean(houseRules.smokingNotAllowed) : null,
            other:            String(houseRules.other ?? ""),
          },
          freeCancellation:    Boolean((services as Record<string, unknown>).freeCancellation),
          paymentModes:        ((services as Record<string, unknown>).paymentModes as string[]) ?? [],
          photos:              (p.photos as string[]) ?? [],
        };
        setDraft(loaded);
        // Baseline snapshot so the auto-save doesn't fire until the owner edits.
        lastSavedRef.current = JSON.stringify(loaded);
      })
      .catch(() => Alert.alert("Error", "Could not load property."))
      .finally(() => setLoading(false));
  }, [visible, propertyId, token]);

  // ── Save to API ────────────────────────────────────────────────────────

  const buildBody = useCallback((d: PropertyDraft) => ({
    title:           d.title,
    type:            d.type === "OTHER" ? d.otherType || d.type : d.type,
    hotelStar:       HOTEL_STAR_TO_NUMBER[d.hotelStar] ?? undefined,
    buildingType:    d.buildingType,
    totalFloors:     d.buildingType === "multi_storey" && d.totalFloors ? Number(d.totalFloors) : undefined,
    regionName:      d.regionName,
    regionId:        d.regionName || undefined,   // submit guard checks !!regionId; API accepts string
    district:        d.district,
    ward:            d.ward,
    street:          d.street,
    city:            d.city,
    zip:             d.zip,
    country:         d.country,
    latitude:        d.latitude ? Number(d.latitude) : undefined,
    longitude:       d.longitude ? Number(d.longitude) : undefined,
    tourismSiteId:   d.tourismSiteId ?? undefined,
    tourismSiteName: d.tourismSiteName || undefined,
    parkPlacement:   d.parkPlacement || undefined,
    roomsSpec:       toApiRoomsSpec(d.roomsSpec),
    services: {
      ...d.services,
      parkingPrice: d.services.parkingPrice ? Number(d.services.parkingPrice) : undefined,
      houseRules: d.houseRules,
      acceptGroupBookings: d.acceptGroupBookings,
      freeCancellation: d.freeCancellation,
      paymentModes: d.paymentModes,
    },
    totalBedrooms:  d.totalBedrooms ? Number(d.totalBedrooms) : undefined,
    totalBathrooms: d.totalBathrooms ? Number(d.totalBathrooms) : undefined,
    maxGuests:      d.maxGuests ? Number(d.maxGuests) : undefined,
    description:    d.description || undefined,
    photos:         d.photos,
  }), []);

  const saveToApi = useCallback(async (d: PropertyDraft, id: number | null): Promise<number> => {
    const body = buildBody(d);
    if (!id) {
      const result = await apiRequest("/api/owner/properties", {
        method: "POST",
        token,
        body,
      }) as { id: number };
      return result.id;
    }
    await apiRequest(`/api/owner/properties/${id}`, {
      method: "PUT",
      token,
      body,
    });
    return id;
  }, [token, buildBody]);

  const saveDraft = async () => {
    if (saving) return;
    setSaving(true);
    setSaveStatus("saving");
    try {
      const id = await saveToApi(draft, savedId);
      setSavedId(id);
      lastSavedRef.current = JSON.stringify(draft);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(p => p === "saved" ? "idle" : p), 2500);
    } catch (e) {
      setSaveStatus("error");
      Alert.alert("Error", getErrorMessage(e));
      setTimeout(() => setSaveStatus(p => p === "error" ? "idle" : p), 3000);
    } finally {
      setSaving(false);
    }
  };

  // Persist wizard state to localStorage on web so refresh doesn't lose progress
  useEffect(() => {
    if (!visible || done) return;
    webSaveDraft(draft, step, savedId);
  }, [draft, step, savedId, visible, done]);

  // Auto-save — debounced 3 s after every draft change (placed after saveToApi is defined)
  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return; }
    if (done) return;
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(async () => {
      if (savingRef.current || !draftRef.current.title.trim()) return;
      // Skip if nothing actually changed since the last load/save (e.g. just opened).
      const snapshot = JSON.stringify(draftRef.current);
      if (snapshot === lastSavedRef.current) return;
      setSaveStatus("saving");
      try {
        const id = await saveToApi(draftRef.current, savedIdRef.current);
        setSavedId(id);
        savedIdRef.current = id;
        lastSavedRef.current = snapshot;
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus(p => p === "saved" ? "idle" : p), 2500);
      } catch {
        setSaveStatus("error");
        setTimeout(() => setSaveStatus(p => p === "error" ? "idle" : p), 3000);
      }
    }, 3000);
    return () => { if (autoSaveRef.current) clearTimeout(autoSaveRef.current); };
  }, [draft, done, saveToApi]);

  // ── Step navigation ────────────────────────────────────────────────────

  const goNext = async (updatedDraft?: PropertyDraft) => {
    const d = updatedDraft ?? draft;
    setSaving(true);
    try {
      const id = await saveToApi(d, savedId);
      setSavedId(id);
      lastSavedRef.current = JSON.stringify(d);
      if (step < 6) setStep(s => s + 1);
    } catch (e) {
      Alert.alert("Error", getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const goBack = () => {
    if (step > 1) {
      setStep(s => s - 1);
    } else if (savedId) {
      // Draft already persisted — safe to exit immediately
      onClose();
    } else {
      Alert.alert("Leave?", "This draft has not been saved yet.", [
        { text: "Stay", style: "cancel" },
        { text: "Leave", style: "destructive", onPress: onClose },
      ]);
    }
  };

  // ── Submit ─────────────────────────────────────────────────────────────

  const submit = async () => {
    if (!savedId) return;
    setSaving(true);
    try {
      await apiRequest(`/api/owner/properties/${savedId}/submit`, {
        method: "POST",
        token,
      });
      setDone(true);
      webClearDraft();
    } catch (e) {
      Alert.alert("Cannot submit", getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  // ── Progress width ─────────────────────────────────────────────────────

  const progressWidth = progress.interpolate({
    inputRange: [1, 6],
    outputRange: ["16.66%", "100%"],
  });

  // ── Render ─────────────────────────────────────────────────────────────

  const stepProps = { draft, setDraft, onNext: goNext, saving };

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={goBack}>
      <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>

        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable onPress={goBack} style={styles.navBtn} accessibilityRole="button">
            <ArrowLeft size={18} color={colors.text} />
          </Pressable>
          <View style={styles.topCenter}>
            <AppText variant="caption" weight="semiBold">
              {propertyId ? "Edit Property" : "Add Property"}
            </AppText>
            <AppText variant="caption" tone="muted">
              Step {step} of {STEPS.length} · {STEPS[step - 1].label}
            </AppText>
          </View>
          <Pressable onPress={saveDraft} style={styles.navBtn} accessibilityRole="button" disabled={saving}>
            {saving || saveStatus === "saving"
              ? <ActivityIndicator size="small" color={colors.primary} />
              : saveStatus === "saved"
              ? <Check size={17} color={colors.accent.green} />
              : saveStatus === "error"
              ? <AlertCircle size={17} color={colors.danger} />
              : <Save size={17} color={colors.primary} />
            }
          </Pressable>
        </View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </View>

        {/* Step strip — labelled, horizontally scrollable */}
        <View style={styles.stepStrip}>
          <FlatList
            ref={stepListRef}
            horizontal
            data={[...STEPS]}
            keyExtractor={s => String(s.num)}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.stepStripContent}
            onScrollToIndexFailed={() => undefined}
            renderItem={({ item: s }) => {
              const isDone   = s.num < step;
              const isActive = s.num === step;
              return (
                <View style={[
                  styles.stepChip,
                  isDone   && styles.stepChipDone,
                  isActive && styles.stepChipActive,
                ]}>
                  {/* Number / check badge */}
                  <View style={[
                    styles.stepBadge,
                    isDone   && styles.stepBadgeDone,
                    isActive && styles.stepBadgeActive,
                  ]}>
                    <AppText style={[styles.stepBadgeText, (isDone || isActive) && styles.stepBadgeTextOn]}>
                      {isDone ? "✓" : s.num}
                    </AppText>
                  </View>
                  {/* Label */}
                  <AppText
                    variant="caption"
                    weight={isActive ? "semiBold" : "regular"}
                    numberOfLines={1}
                    style={[
                      styles.stepLabel,
                      isDone   && styles.stepLabelDone,
                      isActive && styles.stepLabelActive,
                    ]}
                  >
                    {s.label}
                  </AppText>
                </View>
              );
            }}
          />
        </View>

        {/* Step context banner */}
        {!done && !loading && <StepBanner meta={STEPS[step - 1]} />}

        {/* Loading state */}
        {loading ? (
          <View style={styles.loadingCenter}>
            <ActivityIndicator color={colors.primary} size="large" />
            <AppText variant="caption" tone="muted">Loading property...</AppText>
          </View>
        ) : done ? (
          <SuccessView onClose={() => { setDone(false); webClearDraft(); onSuccess?.(); onClose(); }} />
        ) : (
          <>
            {step === 1 && <BasicsStep   {...stepProps} />}
            {step === 2 && <RoomsStep    {...stepProps} />}
            {step === 3 && <ServicesStep {...stepProps} />}
            {step === 4 && <TotalsStep   {...stepProps} />}
            {step === 5 && <PhotosStep   {...stepProps} />}
            {step === 6 && (
              <ReviewStep
                draft={draft}
                savedId={savedId}
                saving={saving}
                onJumpTo={setStep}
                onSubmit={submit}
              />
            )}
          </>
        )}
      </SafeAreaView>
    </Modal>
  );
}

// ── Step banner ────────────────────────────────────────────────────────────

function StepBanner({ meta }: { meta: StepMeta }) {
  const Icon = meta.icon;
  return (
    <View style={bannerStyles.wrap}>
      <View style={bannerStyles.iconWrap}>
        <Icon size={20} color={colors.primary} />
      </View>
      <View style={bannerStyles.text}>
        <AppText variant="bodySmall" weight="semiBold">{meta.label}</AppText>
        <AppText variant="caption" tone="muted">{meta.hint}</AppText>
      </View>
    </View>
  );
}

const bannerStyles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: colors.brand[50],
    borderBottomWidth: 1,
    borderBottomColor: colors.brand[100],
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.brand[100],
  },
  text: { flex: 1, gap: 2 },
  stepPill: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  stepPillText: { color: colors.white, fontSize: 11 },
});

// ── Success ────────────────────────────────────────────────────────────────

function SuccessView({ onClose }: { onClose: () => void }) {
  return (
    <View style={styles.successWrap}>
      <CheckCircle size={56} color={colors.accent.green} />
      <AppText variant="titleSm" weight="bold" style={{ textAlign: "center" }}>
        Submitted for review
      </AppText>
      <AppText variant="bodySmall" tone="muted" style={styles.successMsg}>
        Your property is now under review. Admin will approve or respond within 3 to 5 business days.
      </AppText>
      <Pressable onPress={onClose} style={styles.successBtn} accessibilityRole="button">
        <AppText variant="bodySmall" weight="semiBold" style={{ color: colors.white }}>
          Go to My Properties
        </AppText>
      </Pressable>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  topBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing[3], paddingVertical: spacing[2],
    backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border
  },
  navBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: radius.full, backgroundColor: colors.surface },
  topCenter: { alignItems: "center", gap: 1 },
  progressTrack: { height: 3, backgroundColor: colors.border },
  progressFill: { height: 3, backgroundColor: colors.primary },
  // Step strip
  stepStrip: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stepStripContent: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    gap: spacing[2],
    alignItems: "center",
  },
  stepChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1] + 2,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  stepChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.brand[50],
  },
  stepChipDone: {
    borderColor: colors.accent.green,
    backgroundColor: colors.accent.greenSoft,
  },
  stepBadge: {
    width: 20,
    height: 20,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBadgeActive: { backgroundColor: colors.primary },
  stepBadgeDone:   { backgroundColor: colors.accent.green },
  stepBadgeText: {
    fontSize: 10,
    color: colors.softText,
    fontWeight: "700",
    lineHeight: 13,
  },
  stepBadgeTextOn: { color: colors.white },
  stepLabel:       { fontSize: 12, color: colors.softText },
  stepLabelActive: { color: colors.primary },
  stepLabelDone:   { color: colors.accent.green },
  loadingCenter: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing[3] },
  successWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing[6], gap: spacing[4] },
  successMsg: { textAlign: "center", lineHeight: 20 },
  successBtn: {
    marginTop: spacing[2], backgroundColor: colors.primary,
    paddingHorizontal: spacing[6], paddingVertical: spacing[3],
    borderRadius: radius.full
  },
});
