import { AppButton, AppInput, AppText, colors, radius, spacing, apiRequest } from "@nolsaf/native-ui";
import {
  Bed,
  Building2,
  ChevronDown,
  Grid3X3,
  Home,
  Layers,
  MapPin,
  Star,
  Tent,
  TreePine,
  Users
} from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View
} from "react-native";

import { useAuth } from "../../../auth";
import { BUILDING_TYPES, HOTEL_STARS, PROPERTY_TYPES, REGION_NAMES, TZ_REGIONS, getWards, getStreets } from "../data";
import { MapPicker } from "../MapPicker";
import type { PropertyDraft, TourismSite } from "../types";

// ── Icon map ───────────────────────────────────────────────────────────────

type IconComponent = React.ComponentType<{ size: number; color: string }>;

const TYPE_ICONS: Record<string, IconComponent> = {
  VILLA:       Home,
  APARTMENT:   Building2,
  HOTEL:       Building2,
  LODGE:       Tent,
  CONDO:       Layers,
  GUEST_HOUSE: Home,
  BUNGALOW:    Home,
  CABIN:       TreePine,
  HOMESTAY:    Users,
  TOWNHOUSE:   Building2,
  HOUSE:       Home,
  OTHER:       Grid3X3,
};

// Card dimensions — fixed so every card is identical
const CARD_W  = 82;
const CARD_H  = 90;
const ICON_SZ = 26;

// Building card: fit exactly 2 on screen with a ~20px peek of the 3rd
const SCREEN_W        = Dimensions.get("window").width;
const BUILDING_CARD_W = (SCREEN_W - spacing[4] * 2 - spacing[2] - 20) / 2;

// ── Props ──────────────────────────────────────────────────────────────────

type Props = {
  draft: PropertyDraft;
  setDraft: React.Dispatch<React.SetStateAction<PropertyDraft>>;
  onNext: (d: PropertyDraft) => Promise<void>;
  saving: boolean;
};

// ── Component ──────────────────────────────────────────────────────────────

export function BasicsStep({ draft, setDraft, onNext, saving }: Props) {
  const { token } = useAuth();
  const [tourismSites, setTourismSites] = useState<TourismSite[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const set = <K extends keyof PropertyDraft>(key: K, val: PropertyDraft[K]) =>
    setDraft(d => ({ ...d, [key]: val }));

  useEffect(() => {
    apiRequest("/api/public/tourism-sites?country=Tanzania", { method: "GET", token })
      .then(r => setTourismSites(((r as { items: TourismSite[] }).items) ?? []))
      .catch(() => undefined);
  }, [token]);

  // Resolve tourismSiteName when sites load and the draft has an ID but no name
  useEffect(() => {
    if (!tourismSites.length || !draft.tourismSiteId || draft.tourismSiteName) return;
    const site = tourismSites.find(s => s.id === draft.tourismSiteId);
    if (site) setDraft(d => ({ ...d, tourismSiteName: site.name }));
  }, [tourismSites, draft.tourismSiteId, draft.tourismSiteName, setDraft]);

  const districts = draft.regionName ? (TZ_REGIONS[draft.regionName] ?? []) : [];
  const wards     = draft.district   ? getWards(draft.regionName, draft.district)           : [];
  const streets   = draft.ward       ? getStreets(draft.regionName, draft.district, draft.ward) : [];

  const validate = (): string | null => {
    if (!draft.title.trim()) return "Property title is required.";
    if (draft.title.trim().length < 3) return "Title must be at least 3 characters.";
    if (!draft.type) return "Select a property type.";
    if (draft.type === "OTHER" && !draft.otherType.trim()) return "Enter the property type name.";
    if (!draft.buildingType) return "Select a building type.";
    if (draft.buildingType === "multi_storey") {
      const floors = Number(draft.totalFloors);
      if (!draft.totalFloors || floors < 2) return "Multi storey requires at least 2 floors.";
    }
    if (!draft.regionName) return "Select a region.";
    if (!draft.district) return "Select a district.";
    if (!draft.ward) return "Select a ward.";
    if (!draft.street.trim()) return "Select a street.";
    if (draft.latitude && isNaN(Number(draft.latitude))) return "Latitude must be a valid number.";
    if (draft.longitude && isNaN(Number(draft.longitude))) return "Longitude must be a valid number.";
    return null;
  };

  const handleNext = () => {
    const err = validate();
    if (err) {
      setFormError(err);
      return;
    }
    setFormError(null);
    onNext(draft);
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── Name ── */}
      <SectionLabel label="PROPERTY NAME" />
      <AppInput
        label="Property title"
        value={draft.title}
        onChangeText={v => set("title", v)}
        placeholder="e.g. Serengeti View Lodge"
        maxLength={200}
        required
      />

      {/* ── Property type slider ── */}
      <SectionLabel label="PROPERTY TYPE" />

      {/* Negative margin breaks out of scroll padding so cards bleed edge-to-edge */}
      <View style={styles.sliderWrap}>
        <FlatList
          horizontal
          data={[...PROPERTY_TYPES]}
          keyExtractor={item => item.key}
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          contentContainerStyle={styles.sliderContent}
          renderItem={({ item }) => {
            const active = draft.type === item.key;
            const Icon   = TYPE_ICONS[item.key] ?? Home;
            return (
              <Pressable
                onPress={() => set("type", item.key)}
                style={[styles.typeCard, active && styles.typeCardActive]}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
              >
                <View style={[styles.typeIconWrap, active && styles.typeIconWrapActive]}>
                  <Icon size={ICON_SZ} color={active ? colors.primary : colors.softText} />
                </View>
                <AppText
                  variant="caption"
                  weight={active ? "semiBold" : "regular"}
                  numberOfLines={2}
                  style={[styles.typeLabel, active && styles.typeLabelActive]}
                >
                  {item.label}
                </AppText>
              </Pressable>
            );
          }}
        />
      </View>

      {draft.type === "OTHER" ? (
        <AppInput
          label="Specify type"
          value={draft.otherType}
          onChangeText={v => set("otherType", v)}
          placeholder="e.g. Eco Resort"
          required
        />
      ) : null}

      {draft.type === "HOTEL" ? (
        <>
          <SectionLabel label="HOTEL STAR RATING" />
          <StarRatingPicker selected={draft.hotelStar} onSelect={v => set("hotelStar", v)} />
        </>
      ) : null}

      {/* ── Building layout ── */}
      <SectionLabel label="BUILDING LAYOUT" />
      <BuildingTypePicker selected={draft.buildingType} onSelect={v => set("buildingType", v)} />
      {draft.buildingType === "multi_storey" ? (
        <AppInput
          label="Total floors"
          value={draft.totalFloors}
          onChangeText={v => set("totalFloors", v.replace(/\D/g, ""))}
          keyboardType="number-pad"
          placeholder="e.g. 3"
          required
        />
      ) : null}

      {/* ── Location ── */}
      <SectionLabel label="LOCATION" />
      <PickerRow
        label="Region"
        value={draft.regionName}
        options={REGION_NAMES}
        onSelect={v => setDraft(d => ({ ...d, regionName: v, district: "", ward: "", street: "", zip: "" }))}
        placeholder="Select region"
        required
      />
      <PickerRow
        label="District"
        value={draft.district}
        options={districts}
        onSelect={v => setDraft(d => ({ ...d, district: v, ward: "", street: "", zip: "" }))}
        placeholder={draft.regionName ? "Select district" : "Select region first"}
        disabled={!draft.regionName}
        required
      />
      <PickerRow
        label="Ward"
        value={draft.ward}
        options={wards.map(w => w.name)}
        onSelect={v => {
          const w = wards.find(w => w.name === v);
          setDraft(d => ({ ...d, ward: v, street: "", zip: w?.postcode ?? d.zip }));
        }}
        placeholder={draft.district ? "Select ward" : "Select district first"}
        disabled={!draft.district}
        required
      />
      <PickerRow
        label="Street"
        value={draft.street}
        options={streets}
        onSelect={v => set("street", v)}
        placeholder={draft.ward ? "Select street" : "Select ward first"}
        disabled={!draft.ward}
        required
      />
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <AppInput
            label="City"
            value={draft.city}
            onChangeText={v => set("city", v)}
            placeholder="City or town"
          />
        </View>
        <View style={{ flex: 1 }}>
          <AppInput
            label="ZIP / Postcode"
            value={draft.zip}
            onChangeText={() => undefined}
            placeholder="Auto-filled from ward"
            editable={false}
          />
        </View>
      </View>

      {/* ── Map pin ── */}
      <SectionLabel label="MAP PIN COORDINATES" />
      <MapPicker
        latitude={draft.latitude}
        longitude={draft.longitude}
        onChange={(lat, lng) => setDraft(d => ({ ...d, latitude: lat, longitude: lng }))}
      />

      {/* ── Tourism site ── */}
      {tourismSites.length > 0 ? (
        <View style={styles.tourismCard}>
          {/* Card header */}
          <View style={styles.tourismHeader}>
            <View style={styles.tourismIconWrap}>
              <TreePine size={18} color={colors.accent.green} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="bodySmall" weight="semiBold">Tourism Site</AppText>
              <AppText variant="caption" tone="muted">
                Does your property belong to a park or reserve? If not, skip this.
              </AppText>
            </View>
            <View style={styles.optionalBadge}>
              <AppText variant="caption" style={styles.optionalText}>Optional</AppText>
            </View>
          </View>

          <View style={styles.tourismDivider} />

          {/* Picker */}
          <View style={styles.tourismBody}>
            <PickerRow
              label="Park or reserve"
              value={draft.tourismSiteId
                ? (tourismSites.find(t => t.id === draft.tourismSiteId)?.name ?? "")
                : ""}
              options={["None", ...tourismSites.map(t => t.name)]}
              onSelect={v => {
                if (v === "None") {
                  setDraft(d => ({ ...d, tourismSiteId: null, tourismSiteName: "", parkPlacement: "" }));
                } else {
                  const site = tourismSites.find(t => t.name === v);
                  setDraft(d => ({ ...d, tourismSiteId: site?.id ?? null, tourismSiteName: site?.name ?? v }));
                }
              }}
              placeholder="Select park or reserve"
            />

            {/* Placement cards */}
            {draft.tourismSiteId ? (
              <View style={styles.placementRow}>
                {(["INSIDE", "NEARBY"] as const).map(p => {
                  const active = draft.parkPlacement === p;
                  const Icon   = p === "INSIDE" ? TreePine : MapPin;
                  const color  = p === "INSIDE" ? colors.accent.green : colors.primary;
                  const bgColor = p === "INSIDE" ? colors.accent.greenSoft : colors.brand[50];
                  return (
                    <Pressable
                      key={p}
                      onPress={() => set("parkPlacement", p)}
                      style={[
                        styles.placementCard,
                        active && { borderColor: color, backgroundColor: bgColor },
                      ]}
                      accessibilityRole="radio"
                    >
                      <Icon size={16} color={active ? color : colors.softText} />
                      <AppText
                        variant="caption"
                        weight={active ? "semiBold" : "regular"}
                        style={active ? { color } : undefined}
                      >
                        {p === "INSIDE" ? "Inside the park" : "Nearby the park"}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>
        </View>
      ) : null}

      <View style={styles.footer}>
        {formError ? (
          <AppText variant="caption" style={styles.formError}>{formError}</AppText>
        ) : null}
        <AppButton
          title={saving ? "Saving..." : "Continue to Rooms"}
          onPress={handleNext}
          disabled={saving}
          variant="primary"
          style={{ alignSelf: "stretch" }}
        />
      </View>
    </ScrollView>
  );
}

// ── StarRatingPicker ───────────────────────────────────────────────────────

const STAR_TIER_COLORS = [
  { border: "#cbd5e1", bg: "#f8fafc", star: "#94a3b8", text: "#475569" }, // 1 — slate
  { border: "#93c5fd", bg: "#eff6ff", star: "#3b82f6", text: "#1e40af" }, // 2 — blue
  { border: "#6ee7b7", bg: "#f0fdf4", star: "#059669", text: "#065f46" }, // 3 — green
  { border: "#fdba74", bg: "#fff7ed", star: "#ea580c", text: "#7c2d12" }, // 4 — orange
  { border: "#fcd34d", bg: "#fffbeb", star: "#d97706", text: "#78350f" }, // 5 — gold
];

function StarRatingPicker({
  selected, onSelect,
}: {
  selected: string;
  onSelect: (k: string) => void;
}) {
  return (
    <View style={styles.starSliderWrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.starSliderContent}
      >
        {HOTEL_STARS.map((s, i) => {
          const active = selected === s.key;
          const c      = STAR_TIER_COLORS[i];
          const count  = i + 1;
          return (
            <Pressable
              key={s.key}
              onPress={() => onSelect(s.key)}
              style={[
                styles.starCard,
                { borderColor: active ? c.border : colors.border },
                active && { backgroundColor: c.bg },
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
            >
              {/* Coloured top accent strip */}
              <View style={[styles.starAccent, { backgroundColor: active ? c.border : colors.border }]} />

              <View style={styles.starIconRow}>
                {Array.from({ length: count }).map((_, si) => (
                  <Star
                    key={si}
                    size={14}
                    color={active ? c.star : colors.softText}
                    fill={active ? c.star : "transparent"}
                  />
                ))}
              </View>
              <AppText
                variant="caption"
                weight={active ? "semiBold" : "regular"}
                numberOfLines={1}
                style={[styles.starLabel, active && { color: c.text }]}
              >
                {s.label}
              </AppText>
              <AppText
                variant="caption"
                tone="muted"
                numberOfLines={2}
                style={styles.starDesc}
              >
                {s.desc}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ── BuildingTypePicker ─────────────────────────────────────────────────────

const BUILDING_OPTIONS = [
  {
    key:    "single_storey",
    label:  "Single storey",
    desc:   "One level, ground floor only",
    Icon:   Home,
    color:  colors.primary,
    bg:     colors.brand[50],
    iconBg: colors.brand[100],
  },
  {
    key:    "multi_storey",
    label:  "Multi storey",
    desc:   "Two or more floors",
    Icon:   Building2,
    color:  "#1e40af",
    bg:     "#eff6ff",
    iconBg: "#dbeafe",
  },
  {
    key:    "separate_units",
    label:  "Separate units",
    desc:   "Scattered blocks or bungalows",
    Icon:   Grid3X3,
    color:  "#ea580c",
    bg:     "#fff7ed",
    iconBg: "#fed7aa",
  },
];

function BuildingTypePicker({
  selected, onSelect,
}: {
  selected: string;
  onSelect: (k: string) => void;
}) {
  return (
    <View style={styles.buildingSliderWrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.buildingSliderContent}
      >
        {BUILDING_OPTIONS.map(o => {
          const active = selected === o.key;
          const Icon   = o.Icon;
          return (
            <Pressable
              key={o.key}
              onPress={() => onSelect(o.key)}
              style={[
                styles.buildingCard,
                active && { borderColor: o.color, backgroundColor: o.bg },
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
            >
              <View style={styles.buildingCardInner}>
                <View style={[
                  styles.buildingIconWrap,
                  { backgroundColor: active ? o.iconBg : colors.surface },
                ]}>
                  <Icon size={18} color={active ? o.color : colors.softText} />
                </View>
                <AppText
                  variant="bodySmall"
                  weight={active ? "semiBold" : "regular"}
                  style={[styles.buildingLabel, active && { color: o.color }]}
                >
                  {o.label}
                </AppText>
                <AppText variant="caption" tone="muted" style={styles.buildingDesc} numberOfLines={2}>
                  {o.desc}
                </AppText>
              </View>

              {active && (
                <View style={[styles.buildingDot, { backgroundColor: o.color }]} />
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ── PillGrid — kept for any remaining pill selections ──────────────────────

function PillGrid({
  options, selected, onSelect
}: {
  options: { key: string; label: string }[];
  selected: string;
  onSelect: (k: string) => void;
}) {
  return (
    <View style={styles.pillGrid}>
      {options.map(o => {
        const active = selected === o.key;
        return (
          <Pressable
            key={o.key}
            onPress={() => onSelect(o.key)}
            style={[styles.pill, active && styles.pillActive]}
            accessibilityRole="radio"
          >
            <AppText
              variant="caption"
              weight={active ? "semiBold" : "regular"}
              style={[styles.pillText, active && styles.pillTextActive]}
              numberOfLines={1}
            >
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── PickerRow ──────────────────────────────────────────────────────────────

function PickerRow({
  label, value, options, onSelect, placeholder, disabled, required
}: {
  label: string;
  value: string;
  options: string[];
  onSelect: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <View style={styles.pickerWrap}>
        <AppText variant="caption" weight="medium" style={styles.pickerLabel}>
          {label}
          {required
            ? <AppText variant="caption" style={{ color: colors.danger }}> *</AppText>
            : null}
        </AppText>
        <Pressable
          onPress={() => !disabled && setOpen(true)}
          style={[styles.pickerRow, disabled && styles.pickerDisabled]}
          accessibilityRole="button"
        >
          <AppText
            variant="bodySmall"
            style={!value ? { color: colors.softText } : undefined}
            numberOfLines={1}
          >
            {value || placeholder || "Select..."}
          </AppText>
          <ChevronDown size={16} color={colors.softText} />
        </Pressable>
      </View>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)} />
        <View style={styles.pickerSheet}>
          <View style={styles.pickerHandle} />
          <AppText variant="bodySmall" weight="semiBold" style={styles.pickerSheetTitle}>{label}</AppText>
          <ScrollView style={styles.pickerList} keyboardShouldPersistTaps="handled">
            {options.map(opt => (
              <Pressable
                key={opt}
                style={[styles.pickerOption, opt === value && styles.pickerOptionActive]}
                onPress={() => { onSelect(opt); setOpen(false); }}
                accessibilityRole="menuitem"
              >
                <AppText
                  variant="bodySmall"
                  weight={opt === value ? "semiBold" : "regular"}
                  style={opt === value ? { color: colors.primary } : undefined}
                >
                  {opt}
                </AppText>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

// ── SectionLabel ───────────────────────────────────────────────────────────

function SectionLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
      <AppText variant="caption" style={styles.sectionLabel}>{label}</AppText>
      {required && <AppText variant="caption" style={{ color: colors.danger, fontSize: 10 }}>*</AppText>}
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { padding: spacing[4], paddingBottom: spacing[8], gap: spacing[3] },
  sectionLabel: { color: colors.softText, letterSpacing: 1.1, fontSize: 10, marginTop: spacing[1] },
  row: { flexDirection: "row", gap: spacing[2] },
  mapNote: { flexDirection: "row", alignItems: "flex-start", gap: spacing[2] },

  // ── Type slider ──
  sliderWrap: {
    marginHorizontal: -spacing[4],   // break out of scroll padding
  },
  sliderContent: {
    paddingHorizontal: spacing[4],
    gap: spacing[2],
    paddingBottom: spacing[1],       // tiny shadow room
  },
  typeCard: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[1],
    gap: spacing[2],
  },
  typeCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.brand[50],
  },
  typeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  typeIconWrapActive: {
    backgroundColor: colors.white,
  },
  typeLabel: {
    fontSize: 11,
    color: colors.softText,
    textAlign: "center",
    lineHeight: 14,
  },
  typeLabelActive: {
    color: colors.primary,
  },

  // ── Star rating picker ──
  starSliderWrap: { marginHorizontal: -spacing[4] },
  starSliderContent: {
    paddingHorizontal: spacing[4],
    gap: spacing[2],
    paddingBottom: spacing[1],
  },
  starCard: {
    width: 108,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: "center",
    overflow: "hidden",
    paddingBottom: spacing[3],
    gap: spacing[1],
  },
  starAccent: {
    width: "100%",
    height: 4,
    marginBottom: spacing[2],
  },
  starIconRow: { flexDirection: "row", gap: 2, justifyContent: "center" },
  starLabel:   { fontSize: 11, color: colors.softText, textAlign: "center", paddingHorizontal: spacing[1] },
  starDesc:    { fontSize: 9, textAlign: "center", lineHeight: 12, paddingHorizontal: spacing[2] },

  // ── Building type picker ──
  buildingSliderWrap: { marginHorizontal: -spacing[4] },
  buildingSliderContent: {
    paddingHorizontal: spacing[4],
    gap: spacing[2],
    paddingBottom: spacing[1],
  },
  buildingCard: {
    width: BUILDING_CARD_W,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  buildingCardInner: {
    alignItems: "flex-start",
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[2],
    gap: spacing[1],
  },
  buildingIconWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  buildingLabel: { color: colors.softText, fontSize: 12 },
  buildingDesc:  { fontSize: 10, lineHeight: 14 },
  buildingDot: {
    position: "absolute",
    top: spacing[2],
    right: spacing[2],
    width: 8,
    height: 8,
    borderRadius: radius.full,
  },

  // ── Pills (kept for other selections) ──
  pillGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2] },
  pill: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  pillActive: { borderColor: colors.primary, backgroundColor: colors.brand[50] },
  pillText:   { color: colors.softText },
  pillTextActive: { color: colors.primary },

  // ── Picker ──
  pickerWrap: { gap: spacing[1] },
  pickerLabel: { color: colors.text },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    backgroundColor: colors.white,
  },
  pickerDisabled: { backgroundColor: colors.surface, opacity: 0.6 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  pickerSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: "70%",
    paddingBottom: spacing[4],
  },
  pickerHandle: {
    width: 36, height: 4, borderRadius: radius.full,
    backgroundColor: colors.border,
    alignSelf: "center", marginTop: spacing[2],
  },
  pickerSheetTitle: { padding: spacing[4], paddingBottom: spacing[2] },
  pickerList: { maxHeight: 400 },
  pickerOption: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerOptionActive: { backgroundColor: colors.brand[50] },

  // ── Tourism site card ──
  tourismCard: {
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.accent.greenSoft,
    backgroundColor: colors.white,
    overflow: "hidden",
  },
  tourismHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    padding: spacing[3],
    backgroundColor: colors.accent.greenSoft,
  },
  tourismIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  tourismDivider: { height: 1, backgroundColor: colors.accent.greenSoft },
  tourismBody: { padding: spacing[3], gap: spacing[3] },
  optionalBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: colors.white,
  },
  optionalText: { color: colors.accent.green, fontSize: 10, fontWeight: "600" },

  // ── Park placement ──
  placementRow: { flexDirection: "row", gap: spacing[2] },
  placementCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },

  footer: { paddingTop: spacing[4], gap: spacing[2] },
  formError: { color: colors.danger, textAlign: "center" },
});
