import { AppButton, AppText, colors, radius, spacing } from "@nolsaf/native-ui";
import {
  AlertTriangle,
  Bed,
  BedDouble,
  Camera,
  CheckCircle2,
  ClipboardList,
  Image as ImageIcon,
  MapPin,
  PenLine,
  Settings,
  Tag,
  XCircle,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { PROPERTY_TYPES } from "../data";
import type { PropertyDraft } from "../types";

// ── Props ──────────────────────────────────────────────────────────────────

type Props = {
  draft: PropertyDraft;
  savedId: number | null;
  saving: boolean;
  onJumpTo: (step: number) => void;
  onSubmit: () => void;
};

// ── Component ──────────────────────────────────────────────────────────────

export function ReviewStep({ draft, savedId, saving, onJumpTo, onSubmit }: Props) {

  const checks = {
    title:     draft.title.trim().length >= 3,
    type:      !!draft.type,
    location:  !!draft.regionName && !!draft.district && !!draft.street,
    rooms:     draft.roomsSpec.length > 0,
    bathrooms: !!draft.totalBathrooms,
    photos:    draft.photos.length >= 3,
  };
  const allOk    = Object.values(checks).every(Boolean);
  const doneCount = Object.values(checks).filter(Boolean).length;
  const totalCount = Object.values(checks).length;

  const typeLabel  = PROPERTY_TYPES.find(t => t.key === draft.type)?.label ?? draft.type;
  const location   = [draft.street, draft.ward, draft.district, draft.regionName].filter(Boolean).join(", ");
  const totalRooms = draft.roomsSpec.reduce((s, r) => s + Number(r.count || 1), 0);
  const totalBeds  = draft.roomsSpec.reduce((s, r) => {
    const beds = Object.values(r.beds).reduce((a, b) => a + b, 0);
    return s + beds * Number(r.count || 1);
  }, 0);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

      {/* ── Checklist card ── */}
      <View style={[styles.checkCard, allOk && styles.checkCardDone]}>
        <View style={styles.checkCardHeader}>
          <View style={[styles.checkCardIconWrap, allOk && { backgroundColor: colors.accent.greenSoft }]}>
            <ClipboardList size={16} color={allOk ? colors.accent.green : colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="bodySmall" weight="semiBold">Submission checklist</AppText>
            <AppText variant="caption" tone="muted">
              {doneCount} of {totalCount} complete
            </AppText>
          </View>
          <View style={[styles.checkBadge, allOk ? styles.checkBadgeDone : styles.checkBadgePending]}>
            <AppText variant="caption" weight="semiBold" style={allOk ? styles.checkBadgeDoneText : styles.checkBadgePendingText}>
              {allOk ? "Ready" : `${totalCount - doneCount} missing`}
            </AppText>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.checkProgress}>
          <View style={[styles.checkProgressFill, {
            width: `${(doneCount / totalCount) * 100}%` as any,
            backgroundColor: allOk ? colors.accent.green : colors.primary,
          }]} />
        </View>

        <View style={styles.checkList}>
          <CheckRow label="Property title"               ok={checks.title} />
          <CheckRow label="Property type"                ok={checks.type} />
          <CheckRow label="Location (region, district, street)" ok={checks.location} />
          <CheckRow label="At least 1 room type"         ok={checks.rooms} />
          <CheckRow label="Total bathrooms"              ok={checks.bathrooms} />
          <CheckRow label="At least 3 property photos"   ok={checks.photos} />
        </View>
      </View>

      {/* ── Basics ── */}
      <SectionCard title="Basics" icon={Tag} step={1} onEdit={() => onJumpTo(1)}>
        <InfoRow label="Title"    value={draft.title || "Not set"} />
        <InfoRow label="Type"     value={typeLabel   || "Not set"} />
        {draft.buildingType ? (
          <InfoRow label="Building" value={
            draft.buildingType === "multi_storey"
              ? `Multi storey (${draft.totalFloors || "?"} floors)`
              : draft.buildingType === "separate_units" ? "Separate units" : "Single storey"
          } />
        ) : null}
        {draft.hotelStar ? <InfoRow label="Star rating" value={draft.hotelStar} /> : null}
      </SectionCard>

      {/* ── Location ── */}
      <SectionCard title="Location" icon={MapPin} step={1} onEdit={() => onJumpTo(1)}>
        <InfoRow label="Address" value={location || "Not set"} />
        {draft.zip ? <InfoRow label="Postcode" value={draft.zip} /> : null}
        {draft.latitude && draft.longitude
          ? <InfoRow label="Coordinates" value={`${draft.latitude}, ${draft.longitude}`} />
          : null
        }
        {draft.tourismSiteId ? (
          <InfoRow
            label="Tourism site"
            value={`${draft.tourismSiteName || "Selected site"} · ${draft.parkPlacement === "INSIDE" ? "Inside the park" : "Nearby the park"}`}
          />
        ) : null}
      </SectionCard>

      {/* ── Rooms ── */}
      <SectionCard title={`Rooms (${draft.roomsSpec.length} types)`} icon={Bed} step={2} onEdit={() => onJumpTo(2)}>
        <View style={styles.statRow}>
          <StatChip label="Room types" value={String(draft.roomsSpec.length)} />
          <StatChip label="Total rooms" value={String(totalRooms)} />
          <StatChip label="Total beds"  value={String(totalBeds)} />
        </View>
        {draft.roomsSpec.map((r, i) => {
          const bedSummary = Object.entries(r.beds)
            .filter(([, v]) => v > 0)
            .map(([k, v]) => `${v} ${k.charAt(0).toUpperCase() + k.slice(1)}`)
            .join(", ");
          return (
            <View key={i} style={styles.roomReviewCard}>
              {/* Photo strip */}
              {r.photos.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.roomPhotoStrip}>
                  {r.photos.map((url, pi) => (
                    <Image key={pi} source={{ uri: url }} style={styles.roomPhotoThumb} resizeMode="cover" />
                  ))}
                </ScrollView>
              ) : (
                <View style={styles.roomPhotoEmpty}>
                  <BedDouble size={18} color={colors.softText} />
                  <AppText variant="caption" tone="muted">No photos</AppText>
                </View>
              )}
              {/* Info */}
              <View style={styles.roomReviewInfo}>
                <View style={styles.roomReviewRow}>
                  <AppText variant="bodySmall" weight="semiBold">{r.type}</AppText>
                  <View style={styles.roomCountBadge}>
                    <AppText variant="caption" style={styles.roomCountText}>x{r.count} rooms</AppText>
                  </View>
                </View>
                {bedSummary ? <AppText variant="caption" tone="muted">{bedSummary}</AppText> : null}
                <AppText variant="caption" weight="semiBold" style={{ color: colors.primary }}>
                  TZS {Number(r.pricePerNight || 0).toLocaleString()}/night
                </AppText>
                <View style={styles.roomReviewMeta}>
                  <Camera size={11} color={colors.softText} />
                  <AppText variant="caption" tone="muted">{r.photos.length} photos</AppText>
                  {(r.amenities ?? []).length > 0 ? (
                    <AppText variant="caption" tone="muted"> · {(r.amenities ?? []).length} amenities</AppText>
                  ) : null}
                </View>
              </View>
            </View>
          );
        })}
      </SectionCard>

      {/* ── Services ── */}
      <SectionCard title="Services" icon={Settings} step={3} onEdit={() => onJumpTo(3)}>
        {draft.services.parking
          ? <InfoRow label="Parking" value={draft.services.parking === "free" ? "Free" : draft.services.parking === "paid" ? "Paid" : "None"} />
          : null
        }
        {draft.services.pool        ? <InfoRow label="Pool"        value="Available" /> : null}
        {draft.services.restaurant  ? <InfoRow label="Restaurant"  value="On-site"   /> : null}
        {draft.services.gym         ? <InfoRow label="Gym"         value="On-site"   /> : null}
        {draft.services.security24  ? <InfoRow label="Security"    value="24 / 7"    /> : null}
        {draft.services.nearbyFacilities.length > 0
          ? <InfoRow label="Nearby facilities" value={`${draft.services.nearbyFacilities.length} added`} />
          : null
        }
      </SectionCard>

      {/* ── Details ── */}
      <SectionCard title="Details" icon={ClipboardList} step={4} onEdit={() => onJumpTo(4)}>
        <View style={styles.statRow}>
          <StatChip label="Bedrooms"   value={draft.totalBedrooms  || "0"} />
          <StatChip label="Bathrooms"  value={draft.totalBathrooms || "0"} />
          <StatChip label="Max guests" value={draft.maxGuests      || "0"} />
        </View>
        {draft.houseRules.checkInFrom
          ? <InfoRow label="Check-in"  value={`From ${draft.houseRules.checkInFrom}`} />
          : null
        }
        {draft.houseRules.checkOutFrom
          ? <InfoRow label="Check-out" value={`By ${draft.houseRules.checkOutFrom}`} />
          : null
        }
        <InfoRow label="Free cancellation" value={draft.freeCancellation    ? "Yes" : "No"} />
        <InfoRow label="Group bookings"    value={draft.acceptGroupBookings ? "Accepted" : "Not accepted"} />
        {draft.paymentModes.length > 0
          ? <InfoRow label="Payment" value={draft.paymentModes.join(", ")} />
          : null
        }
      </SectionCard>

      {/* ── Photos ── */}
      <SectionCard title={`Photos (${draft.photos.length})`} icon={Camera} step={5} onEdit={() => onJumpTo(5)}>
        {draft.photos.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoStrip}>
            {draft.photos.map((url, i) => (
              <View key={i} style={styles.photoThumb}>
                <Image source={{ uri: url }} style={styles.photoImg} resizeMode="cover" />
                {i === 0 ? (
                  <View style={styles.coverBadge}>
                    <AppText variant="caption" style={styles.coverText}>Cover</AppText>
                  </View>
                ) : null}
              </View>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.noPhotos}>
            <ImageIcon size={20} color={colors.softText} />
            <AppText variant="caption" tone="muted">No photos added yet</AppText>
          </View>
        )}
      </SectionCard>

      {/* ── Submit ── */}
      <View style={[styles.submitWrap, allOk && styles.submitWrapReady]}>
        {allOk ? (
          <View style={styles.readyRow}>
            <CheckCircle2 size={18} color={colors.accent.green} />
            <AppText variant="bodySmall" weight="semiBold" style={{ color: colors.accent.green, flex: 1 }}>
              All required information is complete
            </AppText>
          </View>
        ) : (
          <View style={styles.warnRow}>
            <AlertTriangle size={16} color="#b45309" />
            <AppText variant="caption" style={{ color: "#b45309", flex: 1 }}>
              Complete all required checklist items before submitting.
            </AppText>
          </View>
        )}

        <AppText variant="caption" tone="muted" style={styles.submitNote}>
          After submission your property will be reviewed within 3 to 5 business days. You will be notified once approved.
        </AppText>

        {saving ? (
          <View style={styles.savingRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <AppText variant="caption" tone="muted">Submitting...</AppText>
          </View>
        ) : (
          <AppButton
            title="Submit for review"
            onPress={onSubmit}
            disabled={!allOk || !savedId}
            variant="primary"
            style={{ alignSelf: "stretch" }}
          />
        )}
      </View>

    </ScrollView>
  );
}

// ── SectionCard ────────────────────────────────────────────────────────────

function SectionCard({
  title, icon: Icon, step, onEdit, children
}: {
  title: string; icon: LucideIcon; step: number;
  onEdit: () => void; children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <View style={styles.sectionHeadLeft}>
          <View style={styles.sectionIconWrap}>
            <Icon size={14} color={colors.primary} />
          </View>
          <AppText variant="bodySmall" weight="semiBold">{title}</AppText>
        </View>
        <Pressable onPress={onEdit} style={styles.editBtn} accessibilityRole="button">
          <PenLine size={13} color={colors.primary} />
          <AppText variant="caption" weight="semiBold" style={{ color: colors.primary }}>Edit</AppText>
        </Pressable>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

// ── InfoRow ────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoLabelCol}>
        <AppText variant="caption" style={styles.infoLabel}>{label}</AppText>
      </View>
      <View style={styles.infoValueCol}>
        <AppText variant="caption" weight="semiBold" numberOfLines={3}>{value}</AppText>
      </View>
    </View>
  );
}

// ── StatChip ───────────────────────────────────────────────────────────────

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statChip}>
      <AppText variant="bodySmall" weight="bold" style={{ color: colors.primary }}>{value}</AppText>
      <AppText variant="caption" tone="muted" style={{ fontSize: 10 }}>{label}</AppText>
    </View>
  );
}

// ── CheckRow ───────────────────────────────────────────────────────────────

function CheckRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <View style={styles.checkRow}>
      {ok
        ? <CheckCircle2 size={15} color={colors.accent.green} />
        : <XCircle      size={15} color={colors.accent.amber} />
      }
      <AppText
        variant="caption"
        style={ok ? styles.checkRowDone : styles.checkRowMiss}
      >
        {label}
      </AppText>
    </View>
  );
}

// 2 photos visible + ~16px peek of the 3rd  (scroll padding 32 + sectionBody padding 24 = 56)
const SCREEN_W       = Dimensions.get("window").width;
const ROOM_PHOTO_W   = Math.floor((SCREEN_W - 56 - 2 - 16) / 2);
const ROOM_PHOTO_H   = Math.round(ROOM_PHOTO_W * 0.72);

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { padding: spacing[4], paddingBottom: spacing[8], gap: spacing[3] },

  // Checklist card
  checkCard: {
    borderRadius: radius.xl, borderWidth: 1.5,
    borderColor: colors.border, backgroundColor: colors.white,
    overflow: "hidden",
  },
  checkCardDone: { borderColor: colors.accent.green },
  checkCardHeader: {
    flexDirection: "row", alignItems: "center", gap: spacing[3],
    padding: spacing[3], backgroundColor: colors.surface,
  },
  checkCardIconWrap: {
    width: 34, height: 34, borderRadius: radius.md,
    backgroundColor: colors.brand[50], alignItems: "center", justifyContent: "center",
  },
  checkBadge: {
    paddingHorizontal: spacing[3], paddingVertical: spacing[1],
    borderRadius: radius.full,
  },
  checkBadgeDone:        { backgroundColor: colors.accent.greenSoft },
  checkBadgePending:     { backgroundColor: "#fef3c7" },
  checkBadgeDoneText:    { color: colors.accent.green, fontSize: 11 },
  checkBadgePendingText: { color: "#b45309", fontSize: 11 },
  checkProgress: {
    height: 3, backgroundColor: colors.border, marginHorizontal: spacing[3],
  },
  checkProgressFill: { height: 3, borderRadius: radius.full },
  checkList: { padding: spacing[3], gap: spacing[2] },
  checkRow: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  checkRowDone: { color: colors.accent.green, flex: 1 },
  checkRowMiss: { color: "#b45309", flex: 1 },

  // Section card
  section: {
    borderRadius: radius.xl, borderWidth: 1,
    borderColor: colors.border, backgroundColor: colors.white, overflow: "hidden",
  },
  sectionHead: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing[3], paddingVertical: spacing[2] + 2,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  sectionHeadLeft: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  sectionIconWrap: {
    width: 28, height: 28, borderRadius: radius.sm,
    backgroundColor: colors.brand[50], alignItems: "center", justifyContent: "center",
  },
  editBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  sectionBody: { gap: spacing[2], padding: spacing[3] },

  // Info row — table style
  infoRow: {
    flexDirection: "row",
    borderRadius: radius.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoLabelCol: {
    width: 110,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    backgroundColor: colors.surface,
    justifyContent: "center",
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  infoLabel: { color: colors.softText, fontSize: 11 },
  infoValueCol: {
    flex: 1,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    backgroundColor: colors.white,
    justifyContent: "center",
  },

  // Stat chips
  statRow: { flexDirection: "row", gap: spacing[2] },
  statChip: {
    flex: 1, alignItems: "center", paddingVertical: spacing[2],
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface, gap: 2,
  },

  // Room review card
  roomReviewCard: {
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.white, overflow: "hidden",
  },
  roomPhotoStrip:  { gap: 2 },
  roomPhotoThumb:  { width: ROOM_PHOTO_W, height: ROOM_PHOTO_H },
  roomPhotoEmpty: {
    height: 80, backgroundColor: colors.surface,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing[2],
  },
  roomReviewInfo:  { padding: spacing[3], gap: 3 },
  roomReviewRow:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  roomCountBadge:  { paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: radius.full, backgroundColor: colors.brand[50] },
  roomCountText:   { color: colors.primary, fontSize: 10 },
  roomReviewMeta:  { flexDirection: "row", alignItems: "center", gap: 4 },

  // Property photo strip
  photoStrip: { gap: spacing[2] },
  photoThumb: { width: ROOM_PHOTO_W, height: ROOM_PHOTO_H, borderRadius: radius.lg, overflow: "hidden", position: "relative" },
  photoImg:   { width: ROOM_PHOTO_W, height: ROOM_PHOTO_H },
  coverBadge: {
    position: "absolute", bottom: 4, left: 4,
    backgroundColor: colors.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.full,
  },
  coverText: { color: colors.white, fontSize: 9 },
  noPhotos: { flexDirection: "row", alignItems: "center", gap: spacing[2] },

  // Submit area
  submitWrap: {
    gap: spacing[3], paddingVertical: spacing[4], paddingHorizontal: spacing[3],
    borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.white,
  },
  submitWrapReady: { borderColor: colors.accent.green, backgroundColor: colors.accent.greenSoft },
  readyRow: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  warnRow:  { flexDirection: "row", alignItems: "center", gap: spacing[2], backgroundColor: "#fef3c7", borderRadius: radius.lg, padding: spacing[3] },
  submitNote: { lineHeight: 18 },
  savingRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing[2] },
});
