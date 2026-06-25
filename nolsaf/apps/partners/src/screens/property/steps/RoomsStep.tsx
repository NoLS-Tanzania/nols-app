import { AppButton, AppInput, AppText, colors, radius, spacing, getErrorMessage } from "@nolsaf/native-ui";
import * as ImagePicker from "expo-image-picker";
import {
  Armchair, Bed, BedDouble, BookOpen, Brush, Camera,
  CheckSquare, CloudRain, Coffee, Droplet, Droplets,
  EyeOff, FileText, Flame, Gamepad2, Grid3X3,
  Layers, LayoutGrid, Lightbulb, Lock,
  Monitor, Package, Phone, Plus, Scan, Shirt,
  Sparkles, Square, Star, Thermometer,
  Trash2, Tv, Users, Waves, Wifi, Wind, X, Zap,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View
} from "react-native";

import { useAuth } from "../../../auth";
import { BATHROOM_ITEMS, BED_TYPES, ROOM_AMENITIES, ROOM_TYPES } from "../data";

// ── Icon maps ──────────────────────────────────────────────────────────────

type ItemMeta = { icon: LucideIcon; color: string; bg: string };

const BATHROOM_META: Record<string, ItemMeta> = {
  "Free toiletries":  { icon: Sparkles,   color: "#854f0b", bg: "#fef3c7" },
  "Toilet paper":     { icon: FileText,   color: "#475569", bg: "#f1f5f9" },
  "Shower":           { icon: CloudRain,  color: "#1e40af", bg: "#dbeafe" },
  "Water Heater":     { icon: Flame,      color: "#b45309", bg: "#fef3c7" },
  "Toilet":           { icon: Droplet,    color: "#0e7490", bg: "#cffafe" },
  "Hairdryer":        { icon: Wind,       color: "#6b7280", bg: "#f3f4f6" },
  "Trash Bin":        { icon: Trash2,     color: "#374151", bg: "#f3f4f6" },
  "Toilet Brush":     { icon: Brush,      color: "#4f46e5", bg: "#ede9fe" },
  "Mirror":           { icon: Scan,       color: "#374151", bg: "#f3f4f6" },
  "Slippers":         { icon: Layers,     color: "#7c3aed", bg: "#ede9fe" },
  "Bathrobe":         { icon: Shirt,      color: "#db2777", bg: "#fce7f3" },
  "Bath Mat":         { icon: Layers,     color: "#0f766e", bg: "#ccfbf1" },
  "Towel":            { icon: Droplets,   color: "#0891b2", bg: "#cffafe" },
};

const AMENITY_META: Record<string, ItemMeta> = {
  "Free Wi-Fi":          { icon: Wifi,       color: "#0f766e", bg: "#ccfbf1" },
  "Table":               { icon: LayoutGrid, color: "#374151", bg: "#f3f4f6" },
  "Chair":               { icon: Armchair,   color: "#92400e", bg: "#fef3c7" },
  "Iron":                { icon: Zap,        color: "#b45309", bg: "#fef9c3" },
  "TV":                  { icon: Tv,         color: "#4f46e5", bg: "#ede9fe" },
  "Flat Screen TV":      { icon: Monitor,    color: "#4f46e5", bg: "#ede9fe" },
  "PS Station":          { icon: Gamepad2,   color: "#7c3aed", bg: "#f5f3ff" },
  "Wardrobe":            { icon: Shirt,      color: "#db2777", bg: "#fce7f3" },
  "Air Conditioning":    { icon: Wind,       color: "#0284c7", bg: "#e0f2fe" },
  "Mini Fridge":         { icon: Thermometer,color: "#0891b2", bg: "#cffafe" },
  "Coffee Maker":        { icon: Coffee,     color: "#b45309", bg: "#fef3c7" },
  "Phone":               { icon: Phone,      color: "#0f766e", bg: "#ccfbf1" },
  "Mirror":              { icon: Scan,       color: "#374151", bg: "#f3f4f6" },
  "Bedside Lamps":       { icon: Lightbulb,  color: "#b45309", bg: "#fef9c3" },
  "Heating":             { icon: Flame,      color: "#dc2626", bg: "#fee2e2" },
  "Desk":                { icon: BookOpen,   color: "#374151", bg: "#f3f4f6" },
  "Safe":                { icon: Lock,       color: "#374151", bg: "#f3f4f6" },
  "Clothes Rack":        { icon: Shirt,      color: "#db2777", bg: "#fce7f3" },
  "Blackout Curtains":   { icon: EyeOff,     color: "#1e293b", bg: "#f1f5f9" },
  "Couches":             { icon: Armchair,   color: "#92400e", bg: "#fef3c7" },
};

// ── Room type metadata ─────────────────────────────────────────────────────

type RoomTypeMeta = { key: string; label: string; desc: string; icon: LucideIcon };

const ROOM_TYPE_META: RoomTypeMeta[] = [
  { key: "Single", label: "Single",  desc: "One bed, compact and private",        icon: Bed        },
  { key: "Double", label: "Double",  desc: "Two guests, ideal for couples",        icon: BedDouble  },
  { key: "Studio", label: "Studio",  desc: "Open-plan with kitchenette area",      icon: LayoutGrid },
  { key: "Suite",  label: "Suite",   desc: "Luxury with a separate living area",   icon: Star       },
  { key: "Family", label: "Family",  desc: "Large room with multiple beds",        icon: Users      },
  { key: "Other",  label: "Other",   desc: "Custom or non-standard room type",     icon: Grid3X3    },
];

const ROOM_CARD_W = (Dimensions.get("window").width - spacing[4] * 2 - spacing[2] - 20) / 2;
import type { PropertyDraft, RoomBeds, RoomSpec } from "../types";

// ── Props ──────────────────────────────────────────────────────────────────

type Props = {
  draft: PropertyDraft;
  setDraft: React.Dispatch<React.SetStateAction<PropertyDraft>>;
  onNext: (d: PropertyDraft) => Promise<void>;
  saving: boolean;
};

// ── Empty room ─────────────────────────────────────────────────────────────

const emptyRoom = (): RoomSpec => ({
  _localId: Math.random().toString(36).slice(2),
  type: "",
  otherType: "",
  count: "1",
  beds: { twin: 0, full: 0, queen: 0, king: 0 },
  pricePerNight: "",
  bathroomPrivate: true,
  smokingAllowed: false,
  bathroomItems: [],
  amenities: [],
  description: "",
  photos: [],
});

// ── Component ──────────────────────────────────────────────────────────────

export function RoomsStep({ draft, setDraft, onNext, saving }: Props) {
  const [editingRoom, setEditingRoom] = useState<RoomSpec | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const openAdd = () => { setEditingRoom(emptyRoom()); setAddOpen(true); };
  const openEdit = (room: RoomSpec) => { setEditingRoom({ ...room }); setAddOpen(true); };

  const saveRoom = (room: RoomSpec) => {
    setDraft(d => {
      const exists = d.roomsSpec.some(r => r._localId === room._localId);
      return {
        ...d,
        roomsSpec: exists
          ? d.roomsSpec.map(r => r._localId === room._localId ? room : r)
          : [...d.roomsSpec, room]
      };
    });
    setAddOpen(false);
    setEditingRoom(null);
  };

  const removeRoom = (localId: string) => {
    Alert.alert("Remove room type?", "This room type will be deleted.", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () =>
        setDraft(d => ({ ...d, roomsSpec: d.roomsSpec.filter(r => r._localId !== localId) }))
      }
    ]);
  };

  const handleNext = () => {
    if (draft.roomsSpec.length === 0) {
      Alert.alert("Required", "Add at least one room type before continuing.");
      return;
    }
    onNext(draft);
  };

  const totalBeds = draft.roomsSpec.reduce((s, r) => {
    const beds = Object.values(r.beds).reduce((a, b) => a + b, 0);
    return s + beds * Number(r.count || 1);
  }, 0);
  const totalRooms = draft.roomsSpec.reduce((s, r) => s + Number(r.count || 1), 0);

  return (
    <>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <AppText variant="titleSm" weight="bold">{totalRooms}</AppText>
            <AppText variant="caption" tone="muted">Total rooms</AppText>
          </View>
          <View style={styles.summaryCard}>
            <AppText variant="titleSm" weight="bold">{totalBeds}</AppText>
            <AppText variant="caption" tone="muted">Total beds</AppText>
          </View>
          <View style={styles.summaryCard}>
            <AppText variant="titleSm" weight="bold">{draft.roomsSpec.length}</AppText>
            <AppText variant="caption" tone="muted">Room types</AppText>
          </View>
        </View>

        {draft.roomsSpec.length === 0 ? (
          <View style={styles.emptyBox}>
            <Bed size={28} color={colors.softText} />
            <AppText variant="bodySmall" weight="semiBold" style={{ textAlign: "center" }}>No room types yet</AppText>
            <AppText variant="caption" tone="muted" style={{ textAlign: "center" }}>
              Add at least one room type with beds and pricing.
            </AppText>
          </View>
        ) : (
          <View style={styles.roomList}>
            {draft.roomsSpec.map(room => (
              <RoomCard key={room._localId} room={room} onEdit={() => openEdit(room)} onRemove={() => removeRoom(room._localId)} />
            ))}
          </View>
        )}

        <Pressable onPress={openAdd} style={styles.addRoomBtn} accessibilityRole="button">
          <Plus size={16} color={colors.primary} />
          <AppText variant="bodySmall" weight="semiBold" style={{ color: colors.primary }}>Add room type</AppText>
        </Pressable>

        <View style={styles.footer}>
          <AppButton
            title={saving ? "Saving..." : "Continue to Services"}
            onPress={handleNext}
            disabled={saving}
            variant="primary"
            style={{ alignSelf: "stretch" }}
          />
        </View>
      </ScrollView>

      {/* Add/edit room modal */}
      {addOpen && editingRoom ? (
        <RoomFormModal
          room={editingRoom}
          isMultiStorey={draft.buildingType === "multi_storey"}
          onSave={saveRoom}
          onClose={() => { setAddOpen(false); setEditingRoom(null); }}
        />
      ) : null}
    </>
  );
}

// ── Room summary card ──────────────────────────────────────────────────────

function RoomCard({ room, onEdit, onRemove }: { room: RoomSpec; onEdit: () => void; onRemove: () => void }) {
  const beds          = room.beds ?? { twin: 0, full: 0, queen: 0, king: 0 };
  const photos        = room.photos ?? [];
  const bedSummary = BED_TYPES
    .filter(b => (beds[b.key] ?? 0) > 0)
    .map(b => `${beds[b.key]} ${b.label}`)
    .join(", ");
  const price         = room.pricePerNight ? `TZS ${Number(room.pricePerNight).toLocaleString()}/night` : null;
  const amenityCount  = (room.amenities ?? []).length;
  const roomTypeMeta  = ROOM_TYPE_META.find(m => m.key === room.type);
  const TypeIcon      = roomTypeMeta?.icon ?? Bed;

  return (
    <View style={styles.roomCard}>
      {/* Thumbnail */}
      <View style={styles.roomThumbWrap}>
        {photos[0] ? (
          <Image source={{ uri: photos[0] }} style={styles.roomThumbImg} resizeMode="cover" />
        ) : (
          <View style={styles.roomThumbEmpty}>
            <TypeIcon size={22} color={colors.softText} />
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.roomCardInfo}>
        <AppText variant="bodySmall" weight="semiBold" numberOfLines={1}>
          {room.type || "Unnamed"}{Number(room.count) > 1 ? ` (×${room.count})` : ""}
        </AppText>
        {bedSummary ? (
          <AppText variant="caption" tone="muted" numberOfLines={1}>{bedSummary}</AppText>
        ) : null}
        {price ? (
          <AppText variant="caption" weight="semiBold" style={styles.roomPrice}>{price}</AppText>
        ) : null}
        <AppText variant="caption" tone="muted">
          {photos.length} photo{photos.length !== 1 ? "s" : ""}
          {amenityCount > 0 ? ` · ${amenityCount} amenities` : ""}
          {room.bathroomPrivate ? " · Private bath" : ""}
        </AppText>
      </View>

      {/* Actions */}
      <View style={styles.roomCardActions}>
        <Pressable onPress={onEdit} style={styles.roomAction} accessibilityRole="button">
          <AppText variant="caption" weight="semiBold" style={{ color: colors.primary }}>Edit</AppText>
        </Pressable>
        <Pressable onPress={onRemove} style={styles.roomActionDanger} accessibilityRole="button">
          <Trash2 size={14} color={colors.danger} />
        </Pressable>
      </View>
    </View>
  );
}

// ── Room form modal ────────────────────────────────────────────────────────

function RoomFormModal({
  room: initial, isMultiStorey, onSave, onClose
}: {
  room: RoomSpec;
  isMultiStorey: boolean;
  onSave: (r: RoomSpec) => void;
  onClose: () => void;
}) {
  const { token } = useAuth();
  const [room, setRoom] = useState<RoomSpec>({ ...initial });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const set = <K extends keyof RoomSpec>(key: K, val: RoomSpec[K]) =>
    setRoom(r => ({ ...r, [key]: val }));

  const setBed = (bedKey: keyof RoomBeds, val: number) =>
    setRoom(r => ({ ...r, beds: { ...r.beds, [bedKey]: Math.max(0, val) } }));

  const toggleBathroomItem = (item: string) => {
    setRoom(r => ({
      ...r,
      bathroomItems: r.bathroomItems.includes(item)
        ? r.bathroomItems.filter(i => i !== item)
        : [...r.bathroomItems, item]
    }));
  };

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert("Permission needed", "Allow photo access to upload room photos."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"] as any,
      quality: 0.85,
      allowsMultipleSelection: false,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > 4 * 1024 * 1024) {
      Alert.alert("File too large", "Each photo must be 4 MB or less. Please choose a smaller image.");
      return;
    }
    setUploadingPhoto(true);
    setPhotoError(null);
    try {
      // Upload via our own API proxy — it streams the file to Cloudinary
      // server-side, so we avoid fragile client-side signature matching.
      const fd = new FormData();
      fd.append("folder", "properties/room-photos");
      if (Platform.OS === "web") {
        const blob = await fetch(asset.uri).then(r => r.blob());
        fd.append("file", blob, "room.jpg");
      } else {
        fd.append("file", { uri: asset.uri, type: "image/jpeg", name: "room.jpg" } as unknown as Blob);
      }

      const upResp = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/uploads/cloudinary/upload`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd }
      );
      const up = await upResp.json().catch(() => ({})) as { secure_url?: string; error?: string; message?: string };
      if (!upResp.ok) throw new Error(up.message || up.error || `Upload failed (${upResp.status})`);
      if (!up.secure_url) throw new Error("No URL returned from server.");

      setRoom(r => ({ ...r, photos: [...r.photos, up.secure_url!] }));
    } catch (e) {
      const msg = getErrorMessage(e, "Could not upload the photo. Please try again.");
      setPhotoError(msg);
      Alert.alert("Upload failed", msg);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const removePhoto = (url: string) => setRoom(r => ({ ...r, photos: r.photos.filter(p => p !== url) }));

  const totalBeds = Object.values(room.beds).reduce((a, b) => a + b, 0);

  const handleSave = () => {
    if (!room.type) { setSaveError("Select a room type."); return; }
    const count = Number(room.count);
    if (!count || count < 1) { setSaveError("Enter the number of rooms (at least 1)."); return; }
    if (totalBeds === 0) { setSaveError("Add at least one bed."); return; }
    const price = Number(room.pricePerNight);
    if (!room.pricePerNight || price < 5000) { setSaveError("Price per night must be at least TZS 5,000."); return; }
    if (room.photos.length < 3) { setSaveError(`Add at least 3 photos for this room type (${room.photos.length}/3).`); return; }
    setSaveError(null);
    onSave(room);
  };

  return (
    <Modal visible animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.formRoot}>
        <View style={styles.formHeader}>
          <View style={styles.formHeaderText}>
            <AppText variant="bodySmall" weight="semiBold">Add Room Type</AppText>
            <AppText variant="caption" tone="muted">
              Define a room category. Choose the type, how many rooms exist, bed layout, amenities, pricing, and at least 3 photos.
            </AppText>
          </View>
          <Pressable onPress={onClose} style={styles.closeBtn} accessibilityRole="button">
            <X size={18} color={colors.mutedText} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled">

          <FieldLabel label="ROOM TYPE" required />
          <View style={styles.roomTypeSliderWrap}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.roomTypeSliderContent}
            >
              {ROOM_TYPE_META.map(m => {
                const active = room.type === m.key;
                const Icon   = m.icon;
                return (
                  <Pressable
                    key={m.key}
                    onPress={() => set("type", m.key)}
                    style={[styles.roomTypeCard, active && styles.roomTypeCardActive]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                  >
                    <View style={[styles.roomTypeIconWrap, active && styles.roomTypeIconWrapActive]}>
                      <Icon size={20} color={active ? colors.primary : colors.softText} />
                    </View>
                    <AppText
                      variant="bodySmall"
                      weight={active ? "semiBold" : "regular"}
                      style={[styles.roomTypeLabel, active && styles.roomTypeLabelActive]}
                    >
                      {m.label}
                    </AppText>
                    <AppText variant="caption" tone="muted" style={styles.roomTypeDesc} numberOfLines={2}>
                      {m.desc}
                    </AppText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <FieldLabel
            label={room.type ? `NUMBER OF ${(room.type === "Other" ? room.otherType || "CUSTOM" : room.type).toUpperCase()} ROOMS` : "NUMBER OF ROOMS"}
            required
          />
          <AppInput
            label=""
            value={room.count}
            onChangeText={v => set("count", v.replace(/\D/g, ""))}
            keyboardType="number-pad"
            placeholder={room.type ? `How many ${room.type === "Other" ? (room.otherType || "custom") : room.type.toLowerCase()} rooms?` : "Select a room type first"}
          />

          <FieldLabel
            label={room.type
              ? `BED CONFIGURATION types of beds available in ${room.type === "Other" ? (room.otherType || "custom") : room.type.toLowerCase()} room`
              : "BED CONFIGURATION"}
            required
          />
          <View style={styles.bedGrid}>
            {BED_TYPES.map(b => {
              const count = room.beds[b.key as keyof RoomBeds];
              const active = count > 0;
              return (
                <View
                  key={b.key}
                  style={[styles.bedCard, active && styles.bedCardActive]}
                >
                  {/* Info */}
                  <View style={[styles.bedIconWrap, active && styles.bedIconWrapActive]}>
                    <Bed size={16} color={active ? colors.primary : colors.softText} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText
                      variant="bodySmall"
                      weight={active ? "semiBold" : "regular"}
                      style={active ? { color: colors.primary } : undefined}
                    >
                      {b.label}
                    </AppText>
                    <AppText variant="caption" tone="muted">{b.dim}</AppText>
                    <AppText variant="caption" tone="muted">{b.desc}</AppText>
                  </View>

                  {/* Counter */}
                  <View style={styles.bedCounter}>
                    <Pressable
                      onPress={() => setBed(b.key as keyof RoomBeds, count - 1)}
                      style={[styles.bedCountBtn, styles.bedCountBtnMinus]}
                      accessibilityLabel={`Decrease ${b.label}`}
                    >
                      <AppText variant="bodySmall" weight="bold" style={{ color: count > 0 ? colors.danger : colors.softText }}>−</AppText>
                    </Pressable>
                    <AppText
                      variant="bodySmall"
                      weight="semiBold"
                      style={[styles.bedCountNum, active && { color: colors.primary }]}
                    >
                      {count}
                    </AppText>
                    <Pressable
                      onPress={() => setBed(b.key as keyof RoomBeds, count + 1)}
                      style={[styles.bedCountBtn, styles.bedCountBtnPlus]}
                      accessibilityLabel={`Increase ${b.label}`}
                    >
                      <AppText variant="bodySmall" weight="bold" style={{ color: colors.primary }}>+</AppText>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
          {totalBeds > 0 && (
            <View style={styles.bedTotal}>
              <Bed size={13} color={colors.primary} />
              <AppText variant="caption" weight="semiBold" style={{ color: colors.primary }}>
                {totalBeds} bed{totalBeds !== 1 ? "s" : ""} total
              </AppText>
            </View>
          )}

          <FieldLabel label="PRICE PER NIGHT (TZS)" required />
          <AppInput
            label=""
            value={room.pricePerNight}
            onChangeText={v => set("pricePerNight", v.replace(/\D/g, ""))}
            keyboardType="number-pad"
            placeholder="Minimum 5,000"
          />

          {/* ── Bathroom card ── */}
          <View style={styles.amenityCard}>
            <View style={styles.amenityCardHeader}>
              <CloudRain size={16} color={colors.primary} />
              <AppText variant="bodySmall" weight="semiBold">Bathroom</AppText>
            </View>
            <View style={styles.amenityCardDivider} />
            <View style={styles.amenityCardBody}>
              {/* Private toggle */}
              <View style={styles.toggleRow}>
                <View>
                  <AppText variant="bodySmall" weight="medium">Private bathroom</AppText>
                  <AppText variant="caption" tone="muted">Room has its own dedicated bathroom</AppText>
                </View>
                <Switch
                  value={room.bathroomPrivate}
                  onValueChange={v => set("bathroomPrivate", v)}
                  trackColor={{ true: colors.primary }}
                />
              </View>
              {/* Bathroom items */}
              <AppText variant="caption" style={styles.amenitySubLabel}>INCLUDED ITEMS</AppText>
              <View style={styles.iconChipGrid}>
                {BATHROOM_ITEMS.map(item => {
                  const checked = room.bathroomItems.includes(item);
                  const meta  = BATHROOM_META[item] ?? { icon: Sparkles, color: colors.primary, bg: colors.brand[50] };
                  const Icon  = meta.icon;
                  return (
                    <Pressable
                      key={item}
                      onPress={() => toggleBathroomItem(item)}
                      style={[styles.iconChip, checked && styles.iconChipActive]}
                      accessibilityRole="checkbox"
                    >
                      <View style={[styles.iconChipIconWrap, { backgroundColor: checked ? meta.bg : colors.surface }]}>
                        <Icon size={17} color={checked ? meta.color : colors.softText} />
                      </View>
                      <AppText
                        variant="caption"
                        weight={checked ? "semiBold" : "regular"}
                        style={[styles.iconChipLabel, checked && { color: meta.color }]}
                        numberOfLines={2}
                      >
                        {item}
                      </AppText>
                      {checked && <View style={[styles.iconChipCheck, { backgroundColor: meta.color }]} />}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          {/* ── Room amenities card ── */}
          <View style={styles.amenityCard}>
            <View style={styles.amenityCardHeader}>
              <Star size={16} color={colors.accent.gold} />
              <AppText variant="bodySmall" weight="semiBold">Room Amenities</AppText>
            </View>
            <View style={styles.amenityCardDivider} />
            <View style={styles.amenityCardBody}>
              <View style={styles.iconChipGrid}>
                {ROOM_AMENITIES.map(item => {
                  const checked = (room.amenities ?? []).includes(item);
                  const meta  = AMENITY_META[item] ?? { icon: Package, color: colors.primary, bg: colors.brand[50] };
                  const Icon  = meta.icon;
                  return (
                    <Pressable
                      key={item}
                      onPress={() => {
                        const current = room.amenities ?? [];
                        set("amenities", checked
                          ? current.filter(a => a !== item)
                          : [...current, item]);
                      }}
                      style={[styles.iconChip, checked && styles.iconChipActive]}
                      accessibilityRole="checkbox"
                    >
                      <View style={[styles.iconChipIconWrap, { backgroundColor: checked ? meta.bg : colors.surface }]}>
                        <Icon size={17} color={checked ? meta.color : colors.softText} />
                      </View>
                      <AppText
                        variant="caption"
                        weight={checked ? "semiBold" : "regular"}
                        style={[styles.iconChipLabel, checked && { color: meta.color }]}
                        numberOfLines={2}
                      >
                        {item}
                      </AppText>
                      {checked && <View style={[styles.iconChipCheck, { backgroundColor: meta.color }]} />}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          <FieldLabel label="SMOKING" />
          <View style={styles.toggleRow}>
            <AppText variant="bodySmall">Smoking allowed</AppText>
            <Switch
              value={room.smokingAllowed}
              onValueChange={v => set("smokingAllowed", v)}
              trackColor={{ true: colors.primary }}
            />
          </View>

          <FieldLabel label="ROOM DESCRIPTION (OPTIONAL)" />
          <AppInput
            label=""
            value={room.description}
            onChangeText={v => set("description", v)}
            placeholder={"e.g. A bright and spacious double room with a king-size bed, private en-suite bathroom, air conditioning, flat-screen TV, and a scenic garden view. Ideal for couples seeking comfort and privacy."}
            multiline
            numberOfLines={3}
          />

          <FieldLabel label={`ROOM PHOTOS (${room.photos.length}/3 min)`} required />
          <AppText variant="caption" tone="muted" style={styles.photoNote}>
            Upload at least 3 clear photos of this room type. JPEG only, max 4 MB each.
          </AppText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.photoGrid}
          >
            {/* Uploader always first — left anchor */}
            <Pressable onPress={pickPhoto} style={styles.photoAdd} disabled={uploadingPhoto} accessibilityRole="button">
              {uploadingPhoto ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <View style={styles.photoAddIconWrap}>
                    <Camera size={22} color={colors.primary} />
                  </View>
                  <AppText variant="caption" weight="semiBold" style={styles.photoAddLabel}>Add photo</AppText>
                  <AppText variant="caption" tone="muted" style={styles.photoAddHint}>JPEG · max 4 MB</AppText>
                </>
              )}
            </Pressable>
            {room.photos.map((url, i) => (
              <View key={i} style={styles.photoThumb}>
                <Image source={{ uri: url }} style={styles.photoImg} resizeMode="cover" />
                <Pressable onPress={() => removePhoto(url)} style={styles.photoRemove} accessibilityRole="button">
                  <X size={12} color={colors.white} />
                </Pressable>
              </View>
            ))}
          </ScrollView>
          {photoError ? (
            <AppText variant="caption" style={styles.photoErrorText}>{photoError}</AppText>
          ) : null}

          <View style={styles.formFooter}>
            {saveError ? (
              <AppText variant="caption" style={styles.saveErrorText}>{saveError}</AppText>
            ) : null}
            <AppButton title="Save room type" onPress={handleSave} variant="primary" style={{ alignSelf: "stretch" }} />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <AppText variant="caption" style={styles.fieldLabel}>
      {label}{required ? <AppText variant="caption" style={{ color: colors.danger }}> *</AppText> : null}
    </AppText>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { padding: spacing[4], paddingBottom: spacing[8], gap: spacing[3] },
  summaryRow: { flexDirection: "row", gap: spacing[2] },
  summaryCard: {
    flex: 1, alignItems: "center", padding: spacing[3],
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, gap: 2
  },
  emptyBox: { alignItems: "center", justifyContent: "center", padding: spacing[6], gap: spacing[2], borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, borderStyle: "dashed" },
  roomList: { gap: spacing[3], paddingBottom: spacing[1] },
  roomCard: {
    flexDirection: "row",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    overflow: "hidden",
  },
  roomThumbWrap: { width: 88, position: "relative" },
  roomThumbImg: { width: 88, height: "100%" },
  roomThumbEmpty: {
    width: 88,
    minHeight: 88,
    height: "100%",
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  roomCountBadge: {
    position: "absolute",
    bottom: spacing[1],
    left: spacing[1],
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: radius.sm,
    paddingHorizontal: spacing[1] + 2,
    paddingVertical: 2,
  },
  roomCountBadgeText: { color: colors.white, fontSize: 10, fontWeight: "700" },
  roomCardOverlay: {
    position: "absolute",
    top: spacing[1],
    right: spacing[1],
    flexDirection: "row",
    gap: spacing[1],
  },
  roomCardInfo: { flex: 1, padding: spacing[3], gap: 3 },
  roomMetaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  roomPrice: { color: colors.primary },
  roomCardActions: {
    justifyContent: "center",
    alignItems: "center",
    gap: spacing[2],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[2],
  },
  roomAction: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.md,
    backgroundColor: colors.brand[50],
    borderWidth: 1,
    borderColor: colors.brand[100],
  },
  roomActionDanger: {
    width: 34, height: 34,
    borderRadius: radius.md,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "#fee2e2",
  },
  addRoomBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing[2],
    borderWidth: 1, borderColor: colors.primary, borderRadius: radius.lg, borderStyle: "dashed",
    paddingVertical: spacing[3]
  },
  footer: { paddingTop: spacing[2] },
  // Form modal
  formRoot: { flex: 1, backgroundColor: colors.white },
  formHeader: {
    flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between",
    paddingHorizontal: spacing[4], paddingTop: spacing[10], paddingBottom: spacing[3],
    borderBottomWidth: 1, borderBottomColor: colors.border,
    gap: spacing[3],
  },
  formHeaderText: { flex: 1, gap: spacing[1] },
  closeBtn: { width: 32, height: 32, borderRadius: radius.full, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  formScroll: { padding: spacing[4], paddingBottom: spacing[8], gap: spacing[3] },
  fieldLabel: { color: colors.softText, letterSpacing: 1.1, fontSize: 10 },
  roomTypeSliderWrap: { marginHorizontal: -spacing[3] },
  roomTypeSliderContent: { paddingHorizontal: spacing[3], gap: spacing[2], paddingBottom: spacing[1] },
  roomTypeCard: {
    width: ROOM_CARD_W,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: spacing[3],
    gap: spacing[2],
  },
  roomTypeCardActive: { borderColor: colors.primary, backgroundColor: colors.brand[50] },
  roomTypeIconWrap: {
    width: 36, height: 36, borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: "center", justifyContent: "center",
  },
  roomTypeIconWrapActive: { backgroundColor: colors.white },
  roomTypeLabel: { color: colors.softText, fontSize: 13 },
  roomTypeLabelActive: { color: colors.primary },
  roomTypeDesc: { fontSize: 10, lineHeight: 14 },
  bedGrid: { gap: spacing[2] },
  bedCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    padding: spacing[3],
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  bedCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.brand[50],
  },
  bedIconWrap: {
    width: 36, height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: "center", justifyContent: "center",
  },
  bedIconWrapActive: {
    backgroundColor: colors.white,
  },
  bedCounter: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing[1],
    paddingVertical: spacing[1],
  },
  bedCountBtn: {
    width: 28, height: 28,
    borderRadius: radius.sm,
    alignItems: "center", justifyContent: "center",
  },
  bedCountBtnMinus: { backgroundColor: "#fee2e2" },
  bedCountBtnPlus:  { backgroundColor: colors.brand[50] },
  bedCountNum: {
    minWidth: 24,
    textAlign: "center",
    color: colors.softText,
  },
  bedTotal: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
    marginTop: spacing[1],
  },
  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing[1] },
  // ── Amenity / bathroom cards ──
  amenityCard: {
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
    overflow: "hidden",
  },
  amenityCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2] + 2,
    backgroundColor: colors.surface,
  },
  amenityCardDivider: { height: 1, backgroundColor: colors.border },
  amenityCardBody: {
    padding: spacing[3],
    gap: spacing[3],
  },
  amenitySubLabel: {
    color: colors.softText,
    letterSpacing: 0.8,
    fontSize: 10,
    fontWeight: "600",
  },
  iconChipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[2],
  },
  iconChip: {
    width: "31%",
    alignItems: "center",
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[1],
    gap: spacing[2],
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  iconChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.brand[50],
  },
  iconChipIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  iconChipLabel: { color: colors.softText, fontSize: 11, textAlign: "center" },
  iconChipCheck: {
    position: "absolute",
    top: spacing[1],
    right: spacing[1],
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  photoNote: { marginTop: -spacing[1] },
  photoGrid: { flexDirection: "row", gap: spacing[2], alignItems: "flex-start" },
  photoThumb: { width: 104, height: 130, borderRadius: radius.lg, overflow: "hidden", position: "relative", backgroundColor: colors.surface },
  photoImg: { width: 104, height: 130 },
  photoRemove: {
    position: "absolute", top: 5, right: 5,
    backgroundColor: "rgba(0,0,0,0.6)", borderRadius: radius.full,
    width: 22, height: 22, alignItems: "center", justifyContent: "center"
  },
  photoAdd: {
    width: 104, height: 130, borderRadius: radius.lg, borderWidth: 1.5,
    borderColor: colors.primary, borderStyle: "dashed",
    alignItems: "center", justifyContent: "center",
    backgroundColor: colors.brand[50],
    gap: spacing[1],
    paddingVertical: spacing[2],
  },
  photoAddIconWrap: {
    width: 40, height: 40, borderRadius: radius.full,
    backgroundColor: colors.white,
    alignItems: "center", justifyContent: "center",
  },
  photoAddLabel: { color: colors.primary, fontSize: 11 },
  photoAddHint:  { fontSize: 9, textAlign: "center" },
  photoErrorText: { color: colors.danger, marginTop: spacing[1] },
  saveErrorText: { color: colors.danger, textAlign: "center", marginBottom: spacing[2] },
  formFooter: { paddingTop: spacing[4] },
});
