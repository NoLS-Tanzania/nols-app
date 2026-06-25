import { AppButton, AppInput, AppText, colors, radius, spacing } from "@nolsaf/native-ui";
import {
  Ban, Bell, Bike, Building2, Bus, Car, ChefHat, CheckSquare, CreditCard,
  Dumbbell, Flame, Fuel, HeartPulse, MapPin, Plane, Plus, Shield,
  ShoppingBag, Shirt, Square, Store, Trophy, Trash2,
  Utensils, Waves, Wine, X, Users,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from "react-native";

import { FACILITY_TYPES, PARKING_OPTIONS, REACH_MODES, SERVICE_TOGGLES } from "../data";
import type { Facility, PropertyDraft, ReachMode, ServicesData } from "../types";

// ── Meta maps ──────────────────────────────────────────────────────────────

type Meta = { icon: LucideIcon; color: string; bg: string };

const PARKING_META: Record<string, Meta & { label: string; desc: string }> = {
  no:   { icon: Ban,        color: "#475569", bg: "#f1f5f9", label: "No parking",   desc: "Not available"     },
  free: { icon: Car,        color: "#059669", bg: "#f0fdf4", label: "Free parking", desc: "Included for guests" },
  paid: { icon: CreditCard, color: "#b45309", bg: "#fffbeb", label: "Paid parking", desc: "Extra charge applies" },
};

const FOOD_META: Array<{ key: keyof ServicesData; label: string; desc: string; icon: LucideIcon; color: string; bg: string }> = [
  { key: "breakfastIncluded",  label: "Breakfast included",      desc: "Included in room rate",   icon: ChefHat,  color: "#b45309", bg: "#fef3c7" },
  { key: "breakfastAvailable", label: "Breakfast available",     desc: "Available for extra cost", icon: Utensils, color: "#854d0e", bg: "#fef9c3" },
  { key: "restaurant",         label: "Restaurant on-site",      desc: "Full dining service",      icon: ChefHat,  color: "#0f766e", bg: "#ccfbf1" },
  { key: "bar",                label: "Bar / Lounge",            desc: "Drinks and socialising",   icon: Wine,     color: "#7c3aed", bg: "#f5f3ff" },
];

const FACILITY_TYPE_META: Record<string, Meta> = {
  "Hospital":          { icon: HeartPulse, color: "#dc2626", bg: "#fee2e2" },
  "Pharmacy":          { icon: ShoppingBag,color: "#059669", bg: "#f0fdf4" },
  "Polyclinic":        { icon: HeartPulse, color: "#0891b2", bg: "#cffafe" },
  "Clinic":            { icon: HeartPulse, color: "#4f46e5", bg: "#ede9fe" },
  "Airport":           { icon: Plane,      color: "#0284c7", bg: "#e0f2fe" },
  "Bus station":       { icon: Bus,        color: "#b45309", bg: "#fef3c7" },
  "Petrol station":    { icon: Fuel,       color: "#ea580c", bg: "#fff7ed" },
  "Police station":    { icon: Shield,     color: "#1e40af", bg: "#dbeafe" },
  "Conference center": { icon: Building2,  color: "#374151", bg: "#f3f4f6" },
  "Stadium":           { icon: Trophy,     color: "#059669", bg: "#f0fdf4" },
  "Main road":         { icon: MapPin,     color: "#02665e", bg: "#e9f5f4" },
};

const REACH_META: Record<string, Meta & { label: string }> = {
  "Walking":          { icon: Users, label: "Walking",          color: "#059669", bg: "#f0fdf4" },
  "Boda":             { icon: Bike,  label: "Boda",             color: "#b45309", bg: "#fef3c7" },
  "Public Transport": { icon: Bus,   label: "Public Transport", color: "#0284c7", bg: "#e0f2fe" },
  "Car/Taxi":         { icon: Car,   label: "Car / Taxi",       color: "#374151", bg: "#f3f4f6" },
};

const AMENITY_META: Record<string, Meta> = {
  pool:             { icon: Waves,       color: "#0284c7", bg: "#e0f2fe" },
  sauna:            { icon: Flame,       color: "#b45309", bg: "#fef3c7" },
  laundry:          { icon: Shirt,       color: "#0f766e", bg: "#ccfbf1" },
  roomService:      { icon: Bell,        color: "#4f46e5", bg: "#ede9fe" },
  security24:       { icon: Shield,      color: "#374151", bg: "#f3f4f6" },
  firstAid:         { icon: HeartPulse,  color: "#dc2626", bg: "#fee2e2" },
  fireExtinguisher: { icon: Flame,       color: "#dc2626", bg: "#fee2e2" },
  onSiteShop:       { icon: Store,       color: "#0891b2", bg: "#cffafe" },
  nearbyMall:       { icon: ShoppingBag, color: "#7c3aed", bg: "#f5f3ff" },
  socialHall:       { icon: Users,       color: "#0f766e", bg: "#ccfbf1" },
  sportsGames:      { icon: Trophy,      color: "#b45309", bg: "#fef3c7" },
  gym:              { icon: Dumbbell,    color: "#374151", bg: "#f3f4f6" },
};

// ── Props ──────────────────────────────────────────────────────────────────

type Props = {
  draft: PropertyDraft;
  setDraft: React.Dispatch<React.SetStateAction<PropertyDraft>>;
  onNext: (d: PropertyDraft) => Promise<void>;
  saving: boolean;
};

// ── Component ──────────────────────────────────────────────────────────────

export function ServicesStep({ draft, setDraft, onNext, saving }: Props) {
  const [facilityModal, setFacilityModal] = useState(false);
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null);

  const s = draft.services;

  const setServices = (patch: Partial<ServicesData>) =>
    setDraft(d => ({ ...d, services: { ...d.services, ...patch } }));

  const openAddFacility = () => {
    setEditingFacility({
      _localId: Math.random().toString(36).slice(2),
      type: "", name: "", ownership: "", distanceKm: "", reachableBy: [], url: ""
    });
    setFacilityModal(true);
  };

  const openEditFacility = (f: Facility) => { setEditingFacility({ ...f }); setFacilityModal(true); };

  const saveFacility = (f: Facility) => {
    setDraft(d => {
      const exists = d.services.nearbyFacilities.some(x => x._localId === f._localId);
      return {
        ...d,
        services: {
          ...d.services,
          nearbyFacilities: exists
            ? d.services.nearbyFacilities.map(x => x._localId === f._localId ? f : x)
            : [...d.services.nearbyFacilities, f]
        }
      };
    });
    setFacilityModal(false);
  };

  const removeFacility = (localId: string) => {
    setDraft(d => ({
      ...d,
      services: { ...d.services, nearbyFacilities: d.services.nearbyFacilities.filter(f => f._localId !== localId) }
    }));
  };

  return (
    <>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Parking ── */}
        <SectionCard icon={Car} title="Parking" iconColor="#059669" iconBg="#f0fdf4">
          <View style={styles.parkingRow}>
            {PARKING_OPTIONS.map(o => {
              const active = s.parking === o.key;
              const meta   = PARKING_META[o.key];
              const Icon   = meta.icon;
              return (
                <Pressable
                  key={o.key}
                  onPress={() => setServices({ parking: o.key as ServicesData["parking"] })}
                  style={[styles.parkCard, active && { borderColor: meta.color, backgroundColor: meta.bg }]}
                  accessibilityRole="radio"
                >
                  <View style={[styles.parkIconWrap, { backgroundColor: active ? meta.bg : colors.surface }]}>
                    <Icon size={18} color={active ? meta.color : colors.softText} />
                  </View>
                  <AppText
                    variant="caption"
                    weight={active ? "semiBold" : "regular"}
                    style={[styles.parkLabel, active && { color: meta.color }]}
                    numberOfLines={1}
                  >
                    {meta.label}
                  </AppText>
                  <AppText variant="caption" tone="muted" style={styles.parkDesc} numberOfLines={2}>
                    {meta.desc}
                  </AppText>
                  {active && <View style={[styles.activeDot, { backgroundColor: meta.color }]} />}
                </Pressable>
              );
            })}
          </View>
          {s.parking === "paid" && (
            <View style={styles.paidPriceWrap}>
              <AppInput
                label="Parking price (TZS/day)"
                value={s.parkingPrice}
                onChangeText={v => setServices({ parkingPrice: v.replace(/\D/g, "") })}
                keyboardType="number-pad"
                placeholder="e.g. 5,000"
              />
            </View>
          )}
        </SectionCard>

        {/* ── Food & Drink ── */}
        <SectionCard icon={Utensils} title="Food & Drink" iconColor="#b45309" iconBg="#fef3c7">
          {FOOD_META.map((item, i) => (
            <View key={item.key}>
              {i > 0 && <View style={styles.divider} />}
              <IconToggleRow
                icon={item.icon}
                iconColor={item.color}
                iconBg={item.bg}
                label={item.label}
                desc={item.desc}
                value={(s as Record<string, unknown>)[item.key] as boolean}
                onChange={v => setServices({ [item.key]: v })}
              />
            </View>
          ))}
        </SectionCard>

        {/* ── Amenities chip grid ── */}
        <SectionCard icon={Trophy} title="Property Amenities" iconColor="#7c3aed" iconBg="#f5f3ff">
          <View style={styles.chipGrid}>
            {SERVICE_TOGGLES.map(svc => {
              const active = (s as Record<string, unknown>)[svc.key] as boolean;
              const meta   = AMENITY_META[svc.key] ?? { icon: Bell, color: colors.primary, bg: colors.brand[50] };
              const Icon   = meta.icon;
              return (
                <Pressable
                  key={svc.key}
                  onPress={() => setServices({ [svc.key]: !active })}
                  style={[styles.amenityChip, active && { borderColor: meta.color, backgroundColor: meta.bg }]}
                  accessibilityRole="checkbox"
                >
                  <View style={[styles.amenityIconWrap, { backgroundColor: active ? meta.bg : colors.surface }]}>
                    <Icon size={17} color={active ? meta.color : colors.softText} />
                  </View>
                  <AppText
                    variant="caption"
                    weight={active ? "semiBold" : "regular"}
                    style={[styles.amenityLabel, active && { color: meta.color }]}
                    numberOfLines={2}
                  >
                    {svc.label}
                  </AppText>
                  {active && <View style={[styles.activeDotSmall, { backgroundColor: meta.color }]} />}
                </Pressable>
              );
            })}
          </View>
        </SectionCard>

        {/* ── Nearby Facilities ── */}
        <SectionCard icon={Plus} title="Nearby Facilities" iconColor={colors.primary} iconBg={colors.brand[50]} optional>
          <AppText variant="caption" tone="muted" style={styles.facilityNote}>
            Add hospitals, transport hubs, and other points of interest near your property.
          </AppText>
          {s.nearbyFacilities.map(f => (
            <FacilityCard key={f._localId} facility={f} onEdit={() => openEditFacility(f)} onRemove={() => removeFacility(f._localId)} />
          ))}
          <Pressable onPress={openAddFacility} style={styles.addBtn} accessibilityRole="button">
            <Plus size={14} color={colors.primary} />
            <AppText variant="caption" weight="semiBold" style={{ color: colors.primary }}>Add nearby facility</AppText>
          </Pressable>
        </SectionCard>

        <View style={styles.footer}>
          <AppButton
            title={saving ? "Saving..." : "Continue to Details"}
            onPress={() => onNext(draft)}
            disabled={saving}
            variant="primary"
            style={{ alignSelf: "stretch" }}
          />
        </View>
      </ScrollView>

      {facilityModal && editingFacility ? (
        <FacilityFormModal
          facility={editingFacility}
          onSave={saveFacility}
          onClose={() => setFacilityModal(false)}
        />
      ) : null}
    </>
  );
}

// ── SectionCard ────────────────────────────────────────────────────────────

function SectionCard({
  icon: Icon, title, iconColor, iconBg, optional, children
}: {
  icon: LucideIcon; title: string; iconColor: string; iconBg: string;
  optional?: boolean; children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionCardHeader}>
        <View style={[styles.sectionIconWrap, { backgroundColor: iconBg }]}>
          <Icon size={15} color={iconColor} />
        </View>
        <AppText variant="bodySmall" weight="semiBold" style={{ flex: 1 }}>{title}</AppText>
        {optional && (
          <View style={styles.optionalBadge}>
            <AppText variant="caption" style={styles.optionalText}>Optional</AppText>
          </View>
        )}
      </View>
      <View style={styles.sectionCardDivider} />
      <View style={styles.sectionCardBody}>{children}</View>
    </View>
  );
}

// ── IconToggleRow ──────────────────────────────────────────────────────────

function IconToggleRow({
  icon: Icon, iconColor, iconBg, label, desc, value, onChange
}: {
  icon: LucideIcon; iconColor: string; iconBg: string;
  label: string; desc: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.iconToggleRow}>
      <View style={[styles.iconToggleIconWrap, { backgroundColor: value ? iconBg : colors.surface }]}>
        <Icon size={16} color={value ? iconColor : colors.softText} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="bodySmall" weight={value ? "semiBold" : "regular"}>{label}</AppText>
        <AppText variant="caption" tone="muted">{desc}</AppText>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.primary }} />
    </View>
  );
}

// ── FacilityCard ───────────────────────────────────────────────────────────

function FacilityCard({ facility, onEdit, onRemove }: { facility: Facility; onEdit: () => void; onRemove: () => void }) {
  const reach = facility.reachableBy.join(", ");
  return (
    <View style={styles.facilityCard}>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="bodySmall" weight="semiBold" numberOfLines={1}>{facility.name || "Unnamed"}</AppText>
        <AppText variant="caption" tone="muted" numberOfLines={1}>
          {facility.type}{facility.distanceKm ? ` · ${facility.distanceKm} km` : ""}
          {reach ? ` · ${reach}` : ""}
        </AppText>
      </View>
      <Pressable onPress={onEdit} style={styles.facilityAction}>
        <AppText variant="caption" weight="semiBold" style={{ color: colors.primary }}>Edit</AppText>
      </Pressable>
      <Pressable onPress={onRemove} style={[styles.facilityAction, { backgroundColor: "#fee2e2" }]}>
        <Trash2 size={14} color={colors.danger} />
      </Pressable>
    </View>
  );
}

// ── FacilityFormModal ──────────────────────────────────────────────────────

function FacilityFormModal({
  facility: initial, onSave, onClose
}: {
  facility: Facility;
  onSave: (f: Facility) => void;
  onClose: () => void;
}) {
  const [f, setF] = useState<Facility>({ ...initial });
  const [saveError, setSaveError] = useState<string | null>(null);
  const [typeExpanded, setTypeExpanded] = useState(!initial.type);

  const set = <K extends keyof Facility>(key: K, val: Facility[K]) => setF(p => ({ ...p, [key]: val }));

  const isMedical = ["Hospital", "Pharmacy", "Polyclinic", "Clinic"].includes(f.type);

  const toggleReach = (mode: ReachMode) =>
    setF(p => ({
      ...p,
      reachableBy: p.reachableBy.includes(mode)
        ? p.reachableBy.filter(m => m !== mode)
        : [...p.reachableBy, mode]
    }));

  const handleSave = () => {
    if (!f.type)       { setSaveError("Select a facility type."); return; }
    if (!f.name.trim()) { setSaveError("Enter the facility name."); return; }
    setSaveError(null);
    onSave(f);
  };

  const selectedMeta = f.type ? FACILITY_TYPE_META[f.type] : null;

  return (
    <Modal visible animationType="slide" statusBarTranslucent transparent onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <View style={styles.facilitySheet}>
        <View style={styles.facilitySheetHandle} />

        {/* Header */}
        <View style={styles.facilitySheetHeader}>
          <View style={styles.facilitySheetTitleWrap}>
            <View style={[styles.facilityHeaderIcon, selectedMeta && { backgroundColor: selectedMeta.bg }]}>
              {selectedMeta
                ? <selectedMeta.icon size={16} color={selectedMeta.color} />
                : <MapPin size={16} color={colors.primary} />
              }
            </View>
            <View>
              <AppText variant="bodySmall" weight="semiBold">
                {f.type || "Nearby Facility"}
              </AppText>
              <AppText variant="caption" tone="muted">Add a point of interest near your property</AppText>
            </View>
          </View>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <X size={18} color={colors.mutedText} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.facilityForm} keyboardShouldPersistTaps="handled">

          {/* ── Type grid ── */}
          <View style={styles.facilitySection}>
            <View style={styles.facilityTypeHeader}>
              <FormSectionLabel label="FACILITY TYPE" required />
              {f.type && !typeExpanded && (
                <Pressable onPress={() => setTypeExpanded(true)}>
                  <AppText variant="caption" style={{ color: colors.primary }}>Change</AppText>
                </Pressable>
              )}
            </View>

            {typeExpanded ? (
              <View style={styles.typeChipGrid}>
                {FACILITY_TYPES.map(t => {
                  const meta   = FACILITY_TYPE_META[t];
                  const Icon   = meta?.icon ?? MapPin;
                  const active = f.type === t;
                  return (
                    <Pressable
                      key={t}
                      onPress={() => { set("type", t); setTypeExpanded(false); }}
                      style={[styles.typeChip, active && { borderColor: meta?.color, backgroundColor: meta?.bg }]}
                      accessibilityRole="radio"
                    >
                      <View style={[styles.typeChipIcon, { backgroundColor: active ? meta?.bg : colors.surface }]}>
                        <Icon size={16} color={active ? meta?.color : colors.softText} />
                      </View>
                      <AppText
                        variant="caption"
                        weight={active ? "semiBold" : "regular"}
                        style={[styles.typeChipLabel, active && { color: meta?.color }]}
                        numberOfLines={2}
                      >
                        {t}
                      </AppText>
                      {active && <View style={[styles.typeChipDot, { backgroundColor: meta?.color }]} />}
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              /* Collapsed — only the selected chip */
              (() => {
                const meta = FACILITY_TYPE_META[f.type];
                const Icon = meta?.icon ?? MapPin;
                return (
                  <View style={[styles.typeChip, styles.typeChipSelected, { borderColor: meta?.color, backgroundColor: meta?.bg }]}>
                    <View style={[styles.typeChipIcon, { backgroundColor: meta?.bg }]}>
                      <Icon size={16} color={meta?.color} />
                    </View>
                    <AppText variant="caption" weight="semiBold" style={{ color: meta?.color }}>{f.type}</AppText>
                  </View>
                );
              })()
            )}
          </View>

          {/* ── Name ── */}
          <View style={styles.facilitySection}>
            <FormSectionLabel label="FACILITY NAME" required />
            <AppInput
              label=""
              value={f.name}
              onChangeText={v => set("name", v)}
              placeholder={f.type ? `e.g. ${f.type === "Hospital" ? "Aga Khan Hospital" : f.type === "Airport" ? "Julius Nyerere Airport" : `${f.type} name`}` : "Enter facility name"}
            />
          </View>

          {/* ── Ownership (medical only) ── */}
          {isMedical && (
            <View style={styles.facilitySection}>
              <FormSectionLabel label="OWNERSHIP" />
              <View style={styles.ownershipRow}>
                {(["Public/Government", "Private"] as const).map(o => {
                  const active = f.ownership === o;
                  return (
                    <Pressable
                      key={o}
                      onPress={() => set("ownership", o)}
                      style={[styles.ownershipCard, active && styles.ownershipCardActive]}
                    >
                      <AppText
                        variant="caption"
                        weight={active ? "semiBold" : "regular"}
                        style={active ? { color: colors.primary } : undefined}
                      >
                        {o}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* ── Distance ── */}
          <View style={styles.facilitySection}>
            <FormSectionLabel label="DISTANCE FROM PROPERTY" />
            <View style={styles.distanceWrap}>
              <AppInput
                label=""
                value={f.distanceKm}
                onChangeText={v => set("distanceKm", v.replace(/[^\d.]/g, ""))}
                keyboardType="decimal-pad"
                placeholder="e.g. 2.5"
              />
              <View style={styles.distanceUnit}>
                <AppText variant="caption" weight="semiBold" style={{ color: colors.primary }}>km</AppText>
              </View>
            </View>
          </View>

          {/* ── Reachable by ── */}
          <View style={styles.facilitySection}>
            <FormSectionLabel label="HOW TO GET THERE" />
            <View style={styles.reachGrid}>
              {REACH_MODES.map(mode => {
                const meta    = REACH_META[mode];
                const Icon    = meta?.icon ?? Car;
                const checked = f.reachableBy.includes(mode);
                return (
                  <Pressable
                    key={mode}
                    onPress={() => toggleReach(mode)}
                    style={[styles.reachCard, checked && { borderColor: meta?.color, backgroundColor: meta?.bg }]}
                    accessibilityRole="checkbox"
                  >
                    <View style={[styles.reachIconWrap, { backgroundColor: checked ? meta?.bg : colors.surface }]}>
                      <Icon size={18} color={checked ? meta?.color : colors.softText} />
                    </View>
                    <AppText
                      variant="caption"
                      weight={checked ? "semiBold" : "regular"}
                      style={checked ? { color: meta?.color } : undefined}
                      numberOfLines={1}
                    >
                      {meta?.label ?? mode}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* ── Website ── */}
          <View style={styles.facilitySection}>
            <FormSectionLabel label="WEBSITE (OPTIONAL)" />
            <AppInput label="" value={f.url} onChangeText={v => set("url", v)} placeholder="https://..." keyboardType="url" />
          </View>

          {saveError ? (
            <AppText variant="caption" style={styles.facilityError}>{saveError}</AppText>
          ) : null}

          <AppButton title="Save facility" onPress={handleSave} variant="primary" style={{ alignSelf: "stretch" }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <AppText variant="caption" style={styles.fieldLabel}>
      {label}{required ? <AppText variant="caption" style={{ color: colors.danger }}> *</AppText> : null}
    </AppText>
  );
}

function FormSectionLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 3, marginBottom: spacing[1] }}>
      <AppText variant="caption" style={styles.formSectionLabel}>{label}</AppText>
      {required && <AppText variant="caption" style={{ color: colors.danger, fontSize: 10 }}>*</AppText>}
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { padding: spacing[4], paddingBottom: spacing[8], gap: spacing[4] },

  // ── Section card ──
  sectionCard: {
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
    overflow: "hidden",
  },
  sectionCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2] + 2,
    backgroundColor: colors.surface,
  },
  sectionIconWrap: {
    width: 30, height: 30,
    borderRadius: radius.md,
    alignItems: "center", justifyContent: "center",
  },
  sectionCardDivider: { height: 1, backgroundColor: colors.border },
  sectionCardBody: { padding: spacing[3], gap: spacing[3] },
  optionalBadge: {
    paddingHorizontal: spacing[2], paddingVertical: 2,
    borderRadius: radius.full, backgroundColor: colors.brand[50],
  },
  optionalText: { color: colors.primary, fontSize: 10, fontWeight: "600" },

  // ── Parking ──
  parkingRow: { flexDirection: "row", gap: spacing[2] },
  parkCard: {
    flex: 1,
    alignItems: "center",
    padding: spacing[2],
    gap: spacing[1],
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  parkIconWrap: {
    width: 36, height: 36,
    borderRadius: radius.full,
    alignItems: "center", justifyContent: "center",
  },
  parkLabel: { fontSize: 11, color: colors.softText, textAlign: "center" },
  parkDesc:  { fontSize: 9, textAlign: "center", lineHeight: 12 },
  activeDot: {
    position: "absolute", top: spacing[1], right: spacing[1],
    width: 7, height: 7, borderRadius: radius.full,
  },
  paidPriceWrap: { marginTop: spacing[1] },

  // ── Food toggle rows ──
  iconToggleRow: {
    flexDirection: "row", alignItems: "center", gap: spacing[3],
    paddingHorizontal: spacing[1], paddingVertical: spacing[2],
  },
  iconToggleIconWrap: {
    width: 38, height: 38,
    borderRadius: radius.md,
    alignItems: "center", justifyContent: "center",
  },
  divider: { height: 1, backgroundColor: colors.border },

  // ── Amenity chip grid ──
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2] },
  amenityChip: {
    width: "31%",
    alignItems: "center",
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[1],
    gap: spacing[1],
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  amenityIconWrap: {
    width: 38, height: 38,
    borderRadius: radius.full,
    alignItems: "center", justifyContent: "center",
  },
  amenityLabel: { fontSize: 10, color: colors.softText, textAlign: "center", lineHeight: 13 },
  activeDotSmall: {
    position: "absolute", top: spacing[1], right: spacing[1],
    width: 6, height: 6, borderRadius: radius.full,
  },

  // ── Nearby facilities ──
  facilityNote: { marginTop: -spacing[1] },
  facilityCard: {
    flexDirection: "row", alignItems: "center", gap: spacing[2],
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface, padding: spacing[3],
  },
  facilityAction: {
    paddingHorizontal: spacing[2], paddingVertical: spacing[1],
    borderRadius: radius.sm, backgroundColor: colors.brand[50],
  },
  addBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing[2],
    borderWidth: 1, borderColor: colors.primary, borderRadius: radius.lg, borderStyle: "dashed",
    paddingVertical: spacing[2],
  },

  footer: { paddingTop: spacing[1] },

  // ── Facility modal ──
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  facilitySheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    maxHeight: "92%", paddingBottom: spacing[6],
  },
  facilitySheetHandle: {
    width: 36, height: 4, borderRadius: radius.full,
    backgroundColor: colors.border, alignSelf: "center", marginTop: spacing[2],
  },
  facilitySheetHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing[4], paddingVertical: spacing[3],
    borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing[3],
  },
  facilitySheetTitleWrap: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing[3] },
  facilityHeaderIcon: {
    width: 36, height: 36, borderRadius: radius.md,
    backgroundColor: colors.brand[50], alignItems: "center", justifyContent: "center",
  },
  closeBtn: { width: 32, height: 32, borderRadius: radius.full, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  facilityForm: { padding: spacing[4], gap: spacing[4], paddingBottom: spacing[8] },
  facilitySection: { gap: spacing[2] },
  formSectionLabel: { color: colors.softText, letterSpacing: 1.1, fontSize: 10, fontWeight: "600" },
  fieldLabel: { color: colors.softText, letterSpacing: 1.1, fontSize: 10 },

  facilityTypeHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  typeChipSelected: { flexDirection: "row", width: "auto", alignSelf: "flex-start", paddingHorizontal: spacing[3], paddingVertical: spacing[2], gap: spacing[2] },

  // Type chip grid
  typeChipGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2] },
  typeChip: {
    width: "31%", alignItems: "center", paddingVertical: spacing[2], paddingHorizontal: spacing[1],
    gap: spacing[1], borderRadius: radius.lg, borderWidth: 1.5,
    borderColor: colors.border, backgroundColor: colors.white,
  },
  typeChipIcon: {
    width: 34, height: 34, borderRadius: radius.full,
    alignItems: "center", justifyContent: "center",
  },
  typeChipLabel: { fontSize: 10, color: colors.softText, textAlign: "center", lineHeight: 13 },
  typeChipDot: {
    position: "absolute", top: spacing[1], right: spacing[1],
    width: 6, height: 6, borderRadius: radius.full,
  },

  // Ownership cards
  ownershipRow: { flexDirection: "row", gap: spacing[2] },
  ownershipCard: {
    flex: 1, alignItems: "center", paddingVertical: spacing[3],
    borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.white,
  },
  ownershipCardActive: { borderColor: colors.primary, backgroundColor: colors.brand[50] },

  // Distance
  distanceWrap: { position: "relative" },
  distanceUnit: {
    position: "absolute", right: spacing[3], top: 0, bottom: 0,
    justifyContent: "center",
  },

  // Reach grid
  reachGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2] },
  reachCard: {
    width: "48%", flexDirection: "row", alignItems: "center", gap: spacing[2],
    padding: spacing[3], borderRadius: radius.lg, borderWidth: 1.5,
    borderColor: colors.border, backgroundColor: colors.white,
  },
  reachIconWrap: {
    width: 36, height: 36, borderRadius: radius.md,
    alignItems: "center", justifyContent: "center",
  },

  facilityError: { color: colors.danger, textAlign: "center" },

  // Kept for chip usage
  chip: { paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.brand[50] },
  chipText: { color: colors.softText },
  chipTextActive: { color: colors.primary },
  reachRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2] },
  reachItem: { flexDirection: "row", alignItems: "center", gap: spacing[1], width: "48%" },
});
