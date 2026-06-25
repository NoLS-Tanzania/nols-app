import { AppButton, AppText, colors, radius, spacing, getErrorMessage } from "@nolsaf/native-ui";
import * as ImagePicker from "expo-image-picker";
import { Camera, GripVertical, ImageIcon, X } from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View
} from "react-native";

import { useAuth } from "../../../auth";
import type { PropertyDraft } from "../types";

// ── Props ──────────────────────────────────────────────────────────────────

type Props = {
  draft: PropertyDraft;
  setDraft: React.Dispatch<React.SetStateAction<PropertyDraft>>;
  onNext: (d: PropertyDraft) => Promise<void>;
  saving: boolean;
};

const MIN_PHOTOS = 3;
const MAX_PHOTOS = 5;
const MAX_FILE_BYTES = 4 * 1024 * 1024;

// ── Component ──────────────────────────────────────────────────────────────

export function PhotosStep({ draft, setDraft, onNext, saving }: Props) {
  const { token } = useAuth();
  const [uploading, setUploading] = useState(false);

  const photos = draft.photos ?? [];

  const addPhoto = async () => {
    if (photos.length >= MAX_PHOTOS) {
      Alert.alert("Limit reached", `You can upload up to ${MAX_PHOTOS} property photos.`);
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Allow photo access to upload property photos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"] as any,
      quality: 0.85,
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - photos.length,
    });
    if (result.canceled || !result.assets.length) return;

    // Validate file sizes before starting uploads
    const oversized = result.assets.filter(a => a.fileSize && a.fileSize > MAX_FILE_BYTES);
    if (oversized.length > 0) {
      Alert.alert("File too large", `${oversized.length} photo(s) exceed 4 MB. Please choose smaller images.`);
      return;
    }

    setUploading(true);
    const uploaded: string[] = [];
    try {
      for (const asset of result.assets) {
        const fd = new FormData();
        fd.append("folder", "properties/property-photos");
        if (Platform.OS === "web") {
          const blob = await fetch(asset.uri).then(r => r.blob());
          fd.append("file", blob, "property.jpg");
        } else {
          fd.append("file", { uri: asset.uri, type: "image/jpeg", name: "property.jpg" } as unknown as Blob);
        }
        const upResp = await fetch(
          `${process.env.EXPO_PUBLIC_API_URL}/api/uploads/cloudinary/upload`,
          { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd }
        );
        const up = await upResp.json().catch(() => ({})) as { secure_url?: string; error?: string; message?: string };
        if (!upResp.ok) throw new Error(up.message || up.error || `Upload failed (${upResp.status})`);
        if (!up.secure_url) throw new Error("No URL returned from server.");
        uploaded.push(up.secure_url);
      }
      setDraft(d => ({ ...d, photos: [...(d.photos ?? []), ...uploaded] }));
    } catch (e) {
      Alert.alert("Upload failed", getErrorMessage(e, "Could not upload the photo. Please try again."));
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    Alert.alert("Remove photo?", "This photo will be removed from your property listing.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => setDraft(d => ({ ...d, photos: d.photos.filter((_, i) => i !== index) }))
      }
    ]);
  };

  const setFirst = (index: number) => {
    if (index === 0) return;
    setDraft(d => {
      const arr = [...d.photos];
      const [item] = arr.splice(index, 1);
      arr.unshift(item);
      return { ...d, photos: arr };
    });
  };

  const handleNext = () => {
    if (photos.length < MIN_PHOTOS) {
      Alert.alert("Photos required", `Add at least ${MIN_PHOTOS} property photos (${photos.length}/${MIN_PHOTOS}).`);
      return;
    }
    onNext(draft);
  };

  const pct = Math.min(100, Math.round((photos.length / MIN_PHOTOS) * 100));
  const ready = photos.length >= MIN_PHOTOS;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

      {/* Progress */}
      <View style={styles.progressBox}>
        <View style={styles.progressHead}>
          <AppText variant="bodySmall" weight="semiBold">
            {photos.length} / {MIN_PHOTOS} minimum
          </AppText>
          <AppText variant="caption" tone={ready ? "default" : "muted"} style={ready ? { color: colors.accent.green } : undefined}>
            {ready ? "Ready" : `${MIN_PHOTOS - photos.length} more needed`}
          </AppText>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: ready ? colors.accent.green : colors.primary }]} />
        </View>
        <AppText variant="caption" tone="muted">
          Accepted: JPEG, PNG, WebP. Max 4 MB each. Upload up to {MAX_PHOTOS} photos.
        </AppText>
      </View>

      {/* Grid */}
      {photos.length > 0 ? (
        <View style={styles.grid}>
          {photos.map((url, i) => (
            <View key={i} style={[styles.thumb, i === 0 && styles.thumbCover]}>
              <Image source={{ uri: url }} style={styles.thumbImg} resizeMode="cover" />
              {/* Cover badge */}
              {i === 0 ? (
                <View style={styles.coverBadge}>
                  <AppText variant="caption" style={styles.coverText}>Cover</AppText>
                </View>
              ) : null}
              {/* Set as cover */}
              {i !== 0 ? (
                <Pressable onPress={() => setFirst(i)} style={styles.setFirstBtn} accessibilityRole="button" accessibilityLabel="Set as cover photo">
                  <GripVertical size={12} color={colors.white} />
                </Pressable>
              ) : null}
              {/* Remove */}
              <Pressable onPress={() => removePhoto(i)} style={styles.removeBtn} accessibilityRole="button" accessibilityLabel="Remove photo">
                <X size={12} color={colors.white} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyBox}>
          <ImageIcon size={36} color={colors.softText} />
          <AppText variant="bodySmall" weight="semiBold" style={{ textAlign: "center" }}>No photos yet</AppText>
          <AppText variant="caption" tone="muted" style={{ textAlign: "center" }}>
            Add at least {MIN_PHOTOS} high-quality photos of your property.
          </AppText>
        </View>
      )}

      {/* Add button */}
      <Pressable onPress={addPhoto} style={[styles.addBtn, uploading && { opacity: 0.6 }]} disabled={uploading} accessibilityRole="button">
        {uploading
          ? <ActivityIndicator size="small" color={colors.primary} />
          : <Camera size={18} color={colors.primary} />
        }
        <AppText variant="bodySmall" weight="semiBold" style={{ color: colors.primary }}>
          {uploading ? "Uploading..." : "Add photos"}
        </AppText>
      </Pressable>

      <AppText variant="caption" tone="muted" style={styles.tip}>
        Tip: The first photo will be shown as the cover image on listing cards. Tap the grid icon on any photo to set it as cover.
      </AppText>

      <View style={styles.footer}>
        <AppButton
          title={saving ? "Saving..." : "Continue to Review"}
          onPress={handleNext}
          disabled={saving || uploading}
          variant="primary"
          style={{ alignSelf: "stretch" }}
        />
      </View>
    </ScrollView>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { padding: spacing[4], paddingBottom: spacing[8], gap: spacing[3] },
  progressBox: { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, padding: spacing[3], gap: spacing[2] },
  progressHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  progressTrack: { height: 6, borderRadius: radius.full, backgroundColor: colors.border, overflow: "hidden" },
  progressFill: { height: 6, borderRadius: radius.full, backgroundColor: colors.primary },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2] },
  thumb: {
    width: "30%", aspectRatio: 1,
    borderRadius: radius.md, overflow: "hidden", position: "relative"
  },
  thumbCover: { width: "100%", aspectRatio: 16 / 9 },
  thumbImg: { width: "100%", height: "100%" },
  coverBadge: {
    position: "absolute", bottom: spacing[1], left: spacing[1],
    backgroundColor: colors.primary, paddingHorizontal: spacing[2], paddingVertical: 2,
    borderRadius: radius.full
  },
  coverText: { color: colors.white, fontSize: 9 },
  setFirstBtn: {
    position: "absolute", bottom: spacing[1], left: spacing[1],
    backgroundColor: "rgba(0,0,0,0.55)", borderRadius: radius.full,
    width: 22, height: 22, alignItems: "center", justifyContent: "center"
  },
  removeBtn: {
    position: "absolute", top: spacing[1], right: spacing[1],
    backgroundColor: "rgba(0,0,0,0.55)", borderRadius: radius.full,
    width: 22, height: 22, alignItems: "center", justifyContent: "center"
  },
  emptyBox: {
    alignItems: "center", justifyContent: "center", padding: spacing[8],
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.white, borderStyle: "dashed", gap: spacing[2]
  },
  addBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing[2],
    borderWidth: 1, borderColor: colors.primary, borderRadius: radius.lg, borderStyle: "dashed",
    paddingVertical: spacing[3]
  },
  tip: { lineHeight: 17 },
  footer: { paddingTop: spacing[2] },
});
