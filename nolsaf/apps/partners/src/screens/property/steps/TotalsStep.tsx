import { AppButton, AppInput, AppText, colors, radius, spacing } from "@nolsaf/native-ui";
import {
  BedDouble, Banknote, Clock, CreditCard, Droplets,
  PawPrint, RefreshCw, Smartphone, Users,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from "react-native";

import { PAYMENT_MODES } from "../data";
import type { HouseRules, PropertyDraft } from "../types";

// ── Props ──────────────────────────────────────────────────────────────────

type Props = {
  draft: PropertyDraft;
  setDraft: React.Dispatch<React.SetStateAction<PropertyDraft>>;
  onNext: (d: PropertyDraft) => Promise<void>;
  saving: boolean;
};

// ── Payment meta ────────────────────────────────────────────────────────────

type PMeta = { icon: LucideIcon; color: string; bg: string };
const PAYMENT_META: Record<string, PMeta> = {
  CASH:         { icon: Banknote,    color: "#059669", bg: "#f0fdf4" },
  CARD:         { icon: CreditCard,  color: "#4f46e5", bg: "#ede9fe" },
  MOBILE_MONEY: { icon: Smartphone,  color: "#b45309", bg: "#fef3c7" },
};

// ── Component ──────────────────────────────────────────────────────────────

export function TotalsStep({ draft, setDraft, onNext, saving }: Props) {
  const [formError, setFormError] = useState<string | null>(null);

  const set = <K extends keyof PropertyDraft>(key: K, val: PropertyDraft[K]) =>
    setDraft(d => ({ ...d, [key]: val }));

  const setRule = <K extends keyof HouseRules>(key: K, val: HouseRules[K]) =>
    setDraft(d => ({ ...d, houseRules: { ...d.houseRules, [key]: val } }));

  useEffect(() => {
    if (!draft.totalBedrooms && draft.roomsSpec.length > 0) {
      const totalRooms = draft.roomsSpec.reduce((s, r) => s + Number(r.count || 1), 0);
      const totalBeds  = draft.roomsSpec.reduce((s, r) => {
        const beds = Object.values(r.beds).reduce((a, b) => a + b, 0);
        return s + beds * Number(r.count || 1);
      }, 0);
      setDraft(d => ({
        ...d,
        totalBedrooms: d.totalBedrooms || String(totalRooms),
        maxGuests:     d.maxGuests     || String(totalBeds),
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const togglePaymentMode = (key: string) =>
    setDraft(d => ({
      ...d,
      paymentModes: d.paymentModes.includes(key)
        ? d.paymentModes.filter(m => m !== key)
        : [...d.paymentModes, key]
    }));

  const handleNext = () => {
    if (!draft.totalBathrooms || Number(draft.totalBathrooms) < 1) {
      setFormError("Total bathrooms is required.");
      return;
    }
    if (!draft.maxGuests || Number(draft.maxGuests) < 1) {
      setFormError("Max guests must be at least 1.");
      return;
    }
    setFormError(null);
    onNext(draft);
  };

  const r = draft.houseRules;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

      {/* ── Room counts ── */}
      <SectionCard icon={BedDouble} title="Room Counts" iconColor="#0284c7" iconBg="#e0f2fe">
        <View style={styles.countGrid}>
          <CounterCard
            icon={BedDouble} iconColor="#0284c7" iconBg="#e0f2fe"
            label="Bedrooms" value={draft.totalBedrooms}
            onChange={v => set("totalBedrooms", v)}
            readOnly
            hint="Auto-computed from rooms"
          />
          <CounterCard
            icon={Droplets} iconColor="#0891b2" iconBg="#cffafe"
            label="Bathrooms" value={draft.totalBathrooms}
            onChange={v => set("totalBathrooms", v)}
            required
          />
          <CounterCard
            icon={Users} iconColor="#059669" iconBg="#f0fdf4"
            label="Max guests" value={draft.maxGuests}
            onChange={v => set("maxGuests", v)}
            readOnly
            hint="Auto-computed from rooms"
          />
        </View>
      </SectionCard>

      {/* ── Description ── */}
      <SectionCard icon={BedDouble} title="Property Description" iconColor={colors.softText} iconBg={colors.surface} optional>
        <AppInput
          label=""
          value={draft.description}
          onChangeText={v => set("description", v)}
          placeholder="Location highlights, unique features, surroundings, nearby attractions..."
          multiline
          numberOfLines={5}
          maxLength={10000}
        />
        {draft.description ? (
          <AppText variant="caption" tone="muted" style={{ textAlign: "right", marginTop: -spacing[1] }}>
            {draft.description.length} / 10,000
          </AppText>
        ) : null}
      </SectionCard>

      {/* ── Group bookings ── */}
      <SectionCard icon={Users} title="Group Bookings" iconColor="#7c3aed" iconBg="#f5f3ff">
        <IconToggle
          icon={Users} iconColor="#7c3aed" iconBg="#f5f3ff"
          label="Accept group bookings"
          desc="Allow coordinated bookings for multiple guests"
          value={draft.acceptGroupBookings}
          onChange={v => set("acceptGroupBookings", v)}
        />
      </SectionCard>

      {/* ── House Rules ── */}
      <SectionCard icon={Clock} title="House Rules" iconColor="#374151" iconBg="#f3f4f6" optional>
        {/* Check-in / Check-out */}
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <AppInput
              label="Check-in from"
              value={r.checkInFrom}
              onChangeText={v => setRule("checkInFrom", v)}
              placeholder="e.g. 14:00"
            />
          </View>
          <View style={{ flex: 1 }}>
            <AppInput
              label="Check-out by"
              value={r.checkOutFrom}
              onChangeText={v => setRule("checkOutFrom", v)}
              placeholder="e.g. 11:00"
            />
          </View>
        </View>

        {/* Pets */}
        <View style={styles.ruleGroup}>
          <View style={styles.ruleGroupHeader}>
            <PawPrint size={14} color={colors.softText} />
            <AppText variant="caption" style={styles.ruleGroupLabel}>Pets allowed?</AppText>
          </View>
          <View style={styles.tripleRow}>
            {([{ v: true, l: "Yes" }, { v: false, l: "No" }, { v: null, l: "Ask us" }] as const).map(opt => (
              <Pressable
                key={String(opt.v)}
                onPress={() => setRule("petsAllowed", opt.v)}
                style={[styles.tripPill, r.petsAllowed === opt.v && styles.tripPillActive]}
                accessibilityRole="radio"
              >
                <AppText variant="caption" weight={r.petsAllowed === opt.v ? "semiBold" : "regular"}
                  style={r.petsAllowed === opt.v ? styles.tripPillTextActive : undefined}>
                  {opt.l}
                </AppText>
              </Pressable>
            ))}
          </View>
          {r.petsAllowed === true && (
            <AppInput
              label="Pets note"
              value={r.petsNote}
              onChangeText={v => setRule("petsNote", v)}
              placeholder="e.g. Small pets only, max 2"
            />
          )}
        </View>

        {/* Smoking */}
        <View style={styles.ruleGroup}>
          <View style={styles.ruleGroupHeader}>
            <Clock size={14} color={colors.softText} />
            <AppText variant="caption" style={styles.ruleGroupLabel}>Smoking policy</AppText>
          </View>
          <View style={styles.tripleRow}>
            {([{ v: true, l: "No smoking" }, { v: false, l: "Allowed" }, { v: null, l: "Designated" }] as const).map(opt => (
              <Pressable
                key={String(opt.v)}
                onPress={() => setRule("smokingNotAllowed", opt.v)}
                style={[styles.tripPill, r.smokingNotAllowed === opt.v && styles.tripPillActive]}
                accessibilityRole="radio"
              >
                <AppText variant="caption" weight={r.smokingNotAllowed === opt.v ? "semiBold" : "regular"}
                  style={r.smokingNotAllowed === opt.v ? styles.tripPillTextActive : undefined}>
                  {opt.l}
                </AppText>
              </Pressable>
            ))}
          </View>
        </View>

        <AppInput
          label="Other rules (optional)"
          value={r.other}
          onChangeText={v => setRule("other", v)}
          placeholder="Any other house rules for guests..."
          multiline
          numberOfLines={2}
        />
      </SectionCard>

      {/* ── Cancellation ── */}
      <SectionCard icon={RefreshCw} title="Cancellation Policy" iconColor="#0f766e" iconBg="#ccfbf1">
        <IconToggle
          icon={RefreshCw} iconColor="#0f766e" iconBg="#ccfbf1"
          label="Free cancellation"
          desc="Guests can cancel for free before check-in"
          value={draft.freeCancellation}
          onChange={v => set("freeCancellation", v)}
        />
      </SectionCard>

      {/* ── Payment modes ── */}
      <SectionCard icon={CreditCard} title="Accepted Payment Modes" iconColor="#4f46e5" iconBg="#ede9fe">
        <View style={styles.paymentGrid}>
          {PAYMENT_MODES.map(pm => {
            const checked = draft.paymentModes.includes(pm.key);
            const meta    = PAYMENT_META[pm.key] ?? { icon: CreditCard, color: colors.primary, bg: colors.brand[50] };
            const Icon    = meta.icon;
            return (
              <Pressable
                key={pm.key}
                onPress={() => togglePaymentMode(pm.key)}
                style={[styles.paymentChip, checked && { borderColor: meta.color, backgroundColor: meta.bg }]}
                accessibilityRole="checkbox"
              >
                <View style={[styles.paymentIconWrap, { backgroundColor: checked ? meta.bg : colors.surface }]}>
                  <Icon size={20} color={checked ? meta.color : colors.softText} />
                </View>
                <AppText
                  variant="caption"
                  weight={checked ? "semiBold" : "regular"}
                  style={[styles.paymentLabel, checked && { color: meta.color }]}
                >
                  {pm.label}
                </AppText>
                {checked && <View style={[styles.paymentDot, { backgroundColor: meta.color }]} />}
              </Pressable>
            );
          })}
        </View>
      </SectionCard>

      {formError ? (
        <AppText variant="caption" style={styles.formError}>{formError}</AppText>
      ) : null}

      <View style={styles.footer}>
        <AppButton
          title={saving ? "Saving..." : "Continue to Photos"}
          onPress={handleNext}
          disabled={saving}
          variant="primary"
          style={{ alignSelf: "stretch" }}
        />
      </View>
    </ScrollView>
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

// ── CounterCard ────────────────────────────────────────────────────────────

function CounterCard({
  icon: Icon, iconColor, iconBg, label, value, onChange, required, readOnly, hint
}: {
  icon: LucideIcon; iconColor: string; iconBg: string;
  label: string; value: string; onChange: (v: string) => void;
  required?: boolean; readOnly?: boolean; hint?: string;
}) {
  const num = Number(value) || 0;
  return (
    <View style={[styles.counterCard, readOnly && styles.counterCardReadOnly]}>
      <View style={[styles.counterIconWrap, { backgroundColor: iconBg }]}>
        <Icon size={18} color={iconColor} />
      </View>
      <View style={styles.counterMiddle}>
        <AppText variant="caption" style={styles.counterLabel}>
          {label}{required ? <AppText variant="caption" style={{ color: colors.danger }}> *</AppText> : null}
        </AppText>
        <AppText variant="bodySmall" weight="bold" style={{ color: readOnly ? colors.softText : iconColor }}>
          {num || (readOnly ? "0" : "0")}
        </AppText>
        {readOnly && hint ? (
          <AppText variant="caption" tone="muted" style={{ fontSize: 9 }}>{hint}</AppText>
        ) : null}
      </View>
      {!readOnly && (
        <View style={styles.counterBtns}>
          <Pressable
            onPress={() => onChange(String(Math.max(0, num - 1)))}
            style={[styles.counterBtn, styles.counterBtnMinus]}
          >
            <AppText variant="bodySmall" weight="bold" style={{ color: num > 0 ? colors.danger : colors.softText }}>-</AppText>
          </Pressable>
          <Pressable
            onPress={() => onChange(String(num + 1))}
            style={[styles.counterBtn, styles.counterBtnPlus]}
          >
            <AppText variant="bodySmall" weight="bold" style={{ color: colors.primary }}>+</AppText>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ── IconToggle ─────────────────────────────────────────────────────────────

function IconToggle({
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

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { padding: spacing[4], paddingBottom: spacing[8], gap: spacing[4] },

  // Section card
  sectionCard: {
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
    overflow: "hidden",
  },
  sectionCardHeader: {
    flexDirection: "row", alignItems: "center", gap: spacing[3],
    paddingHorizontal: spacing[3], paddingVertical: spacing[2] + 2,
    backgroundColor: colors.surface,
  },
  sectionIconWrap: {
    width: 30, height: 30, borderRadius: radius.md,
    alignItems: "center", justifyContent: "center",
  },
  sectionCardDivider: { height: 1, backgroundColor: colors.border },
  sectionCardBody: { padding: spacing[3], gap: spacing[3] },
  optionalBadge: {
    paddingHorizontal: spacing[2], paddingVertical: 2,
    borderRadius: radius.full, backgroundColor: colors.brand[50],
  },
  optionalText: { color: colors.primary, fontSize: 10, fontWeight: "600" },

  row: { flexDirection: "row", gap: spacing[2] },

  // Counter cards
  countGrid: { gap: spacing[2] },
  counterCard: {
    flexDirection: "row", alignItems: "center", gap: spacing[3],
    padding: spacing[3], borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  counterCardReadOnly: { opacity: 0.7 },
  counterIconWrap: {
    width: 40, height: 40, borderRadius: radius.md,
    alignItems: "center", justifyContent: "center",
  },
  counterMiddle: { flex: 1, gap: 2 },
  counterLabel: { color: colors.softText, fontSize: 10, letterSpacing: 0.5 },
  counterBtns: { flexDirection: "row", gap: spacing[1] },
  counterBtn: {
    width: 32, height: 32, borderRadius: radius.sm,
    alignItems: "center", justifyContent: "center",
  },
  counterBtnMinus: { backgroundColor: "#fee2e2" },
  counterBtnPlus:  { backgroundColor: colors.brand[50] },

  // Icon toggle
  iconToggleRow: {
    flexDirection: "row", alignItems: "center", gap: spacing[3],
  },
  iconToggleIconWrap: {
    width: 38, height: 38, borderRadius: radius.md,
    alignItems: "center", justifyContent: "center",
  },

  // House rules
  ruleGroup: { gap: spacing[2] },
  ruleGroupHeader: { flexDirection: "row", alignItems: "center", gap: spacing[1] },
  ruleGroupLabel: { color: colors.softText, letterSpacing: 0.8, fontSize: 10, fontWeight: "600" },
  tripleRow: { flexDirection: "row", gap: spacing[2] },
  tripPill: {
    flex: 1, alignItems: "center", paddingVertical: spacing[2],
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white,
  },
  tripPillActive: { borderColor: colors.primary, backgroundColor: colors.brand[50] },
  tripPillTextActive: { color: colors.primary },

  // Payment chips
  paymentGrid: { flexDirection: "row", gap: spacing[2] },
  paymentChip: {
    flex: 1, alignItems: "center", paddingVertical: spacing[3], gap: spacing[2],
    borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.white,
  },
  paymentIconWrap: {
    width: 44, height: 44, borderRadius: radius.full,
    alignItems: "center", justifyContent: "center",
  },
  paymentLabel: { fontSize: 11, color: colors.softText, textAlign: "center" },
  paymentDot: {
    position: "absolute", top: spacing[1], right: spacing[1],
    width: 8, height: 8, borderRadius: radius.full,
  },

  formError: { color: colors.danger, textAlign: "center" },
  footer: { paddingTop: spacing[1] },
});
