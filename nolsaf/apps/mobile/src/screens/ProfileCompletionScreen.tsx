import { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  CalendarDays,
  Camera,
  CheckCircle2,
  Fingerprint,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  User
} from "lucide-react-native";
import * as DocumentPicker from "expo-document-picker";
import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, View } from "react-native";

import { useAuth } from "../auth";
import { AppButton, AppCard, AppInput, AppStack, AppText, SafeScreen, ScreenHeader } from "../components";
import { apiUploadFile } from "../lib/apiClient";
import { RootStackParamList } from "../navigation/types";
import { colors, radius, shadows, spacing } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "ProfileCompletion">;
type IconType = typeof User;

function fmtDate(value?: string | null) {
  if (!value) return "Not recorded";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "Not recorded" : d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

export function ProfileCompletionScreen({ navigation }: Props) {
  const { token, user, updateProfile } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName || user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [address, setAddress] = useState(user?.address || "");
  const [tin, setTin] = useState(user?.tin || "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const displayName = fullName.trim() || user?.fullName || user?.name || user?.email || "NoLSAF customer";
  const initial = String(displayName).trim().charAt(0).toUpperCase() || "N";
  const completion = useMemo(() => {
    const checks = [user?.avatarUrl, fullName.trim(), email.trim(), phone.trim(), user?.emailVerifiedAt, user?.phoneVerifiedAt, user?.twoFactorEnabled];
    const done = checks.filter(Boolean).length;
    return { done, total: checks.length, percent: Math.round((done / checks.length) * 100) };
  }, [email, fullName, phone, user?.avatarUrl, user?.emailVerifiedAt, user?.phoneVerifiedAt, user?.twoFactorEnabled]);

  async function uploadTravellerPhoto() {
    if (!token) {
      Alert.alert("Profile photo", "Please sign in to update your profile photo.");
      return;
    }
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ["image/jpeg", "image/png"],
        multiple: false,
        copyToCacheDirectory: true
      });
      if (picked.canceled || !picked.assets?.[0]) return;
      const asset = picked.assets[0];
      setUploadingPhoto(true);
      const uploaded = await apiUploadFile<{ secure_url?: string; url?: string }>("/api/uploads/cloudinary/upload", {
        token,
        file: {
          uri: asset.uri,
          name: asset.name || `traveller-${user?.id || "profile"}.jpg`,
          type: asset.mimeType || "image/jpeg",
          file: (asset as any).file || null
        },
        fields: { folder: "avatars" }
      });
      const avatarUrl = uploaded.secure_url || uploaded.url;
      if (!avatarUrl) throw new Error("Upload completed without a photo URL.");
      await updateProfile({ avatarUrl });
    } catch (err) {
      Alert.alert("Profile photo", err instanceof Error ? err.message : "Could not update your profile photo.");
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      await updateProfile({
        fullName: fullName.trim() || undefined,
        name: fullName.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        tin: tin.trim() || undefined
      });
      Alert.alert("Profile saved", "Your traveller profile has been updated.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update profile.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeScreen contentStyle={styles.screen}>
      <AppStack gap={4}>
        <ScreenHeader
          title="My Profile"
          subtitle="Traveller identity, contacts, verification, and account readiness."
          onBack={() => navigation.goBack()}
        />

        <AppCard style={styles.hero}>
          <View style={styles.heroRow}>
            <Pressable accessibilityRole="button" onPress={uploadTravellerPhoto} style={styles.avatarWrap}>
              <View style={styles.avatar}>
                {user?.avatarUrl ? (
                  <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
                ) : (
                  <AppText variant="headline" weight="extraBold" tone="inverse">
                    {initial}
                  </AppText>
                )}
                {uploadingPhoto ? (
                  <View style={styles.avatarOverlay}>
                    <ActivityIndicator color={colors.white} />
                  </View>
                ) : null}
              </View>
              <View style={styles.cameraBadge}>
                <Camera color={colors.white} size={15} />
              </View>
            </Pressable>
            <View style={styles.flex}>
              <AppText variant="title" weight="extraBold" numberOfLines={2}>
                {displayName}
              </AppText>
              <AppText variant="bodySmall" tone="muted">
                {String(user?.role || "CUSTOMER").toUpperCase()} account
              </AppText>
              <View style={styles.progressWrap}>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${completion.percent}%` }]} />
                </View>
                <AppText variant="caption" weight="extraBold" tone="primary">
                  {completion.percent}% ready
                </AppText>
              </View>
            </View>
          </View>
        </AppCard>

        <ScrollStatusCards
          items={[
            { Icon: Mail, label: "Email", value: user?.email || "Not added", verified: Boolean(user?.emailVerifiedAt) },
            { Icon: Phone, label: "Phone", value: user?.phone || "Not added", verified: Boolean(user?.phoneVerifiedAt) },
            { Icon: Fingerprint, label: "2FA / MFA", value: user?.twoFactorEnabled ? "Enabled" : "Not enabled", verified: Boolean(user?.twoFactorEnabled) },
            { Icon: CalendarDays, label: "Joined", value: fmtDate(user?.createdAt), verified: Boolean(user?.createdAt) }
          ]}
        />

        <AppCard>
          <AppStack gap={4}>
            <View style={styles.sectionTitle}>
              <View style={styles.sectionIcon}>
                <User color={colors.primary} size={18} />
              </View>
              <View style={styles.flex}>
                <AppText variant="titleSm" weight="extraBold">
                  Identity and contacts
                </AppText>
                <AppText variant="caption" tone="muted">
                  Used for bookings, receipts, tour documents, and customer support.
                </AppText>
              </View>
            </View>
            <AppInput label="Full name" value={fullName} onChangeText={setFullName} placeholder="Full name" textContentType="name" />
            <AppInput label="Email" value={email} onChangeText={setEmail} placeholder="name@example.com" keyboardType="email-address" textContentType="emailAddress" autoCapitalize="none" />
            <AppInput label="Phone" value={phone} onChangeText={setPhone} placeholder="+255..." keyboardType="phone-pad" textContentType="telephoneNumber" />
            <AppInput label="Address" value={address} onChangeText={setAddress} placeholder="City, country or billing address" />
            <AppInput label="TIN / tax ID (optional)" value={tin} onChangeText={setTin} placeholder="Optional tax reference" autoCapitalize="characters" />
            {error ? (
              <AppText variant="bodySmall" tone="danger">
                {error}
              </AppText>
            ) : null}
            <AppButton title="Save profile" loading={loading} onPress={submit} />
          </AppStack>
        </AppCard>

        <AppCard style={styles.accountCard}>
          <AppStack gap={3}>
            <View style={styles.sectionTitle}>
              <View style={styles.sectionIcon}>
                <ShieldCheck color={colors.primary} size={18} />
              </View>
              <View style={styles.flex}>
                <AppText variant="titleSm" weight="extraBold">
                  Account record
                </AppText>
                <AppText variant="caption" tone="muted">
                  Read-only details NoLSAF uses to connect your sessions and support history.
                </AppText>
              </View>
            </View>
            <ProfileFact Icon={CheckCircle2} label="Profile status" value={`${completion.done}/${completion.total} checks complete`} />
            <ProfileFact Icon={ShieldCheck} label="Role" value={String(user?.role || "CUSTOMER").toUpperCase()} />
            <ProfileFact Icon={CalendarDays} label="Created" value={fmtDate(user?.createdAt)} />
            <ProfileFact Icon={MapPin} label="Profile photo" value={user?.avatarUrl ? "Uploaded" : "Not uploaded"} />
          </AppStack>
        </AppCard>
      </AppStack>
    </SafeScreen>
  );
}

function ScrollStatusCards({
  items
}: {
  items: Array<{ Icon: IconType; label: string; value: string; verified: boolean }>;
}) {
  return (
    <View style={styles.statusRail}>
      {items.map((item) => (
        <View key={item.label} style={styles.statusCard}>
          <View style={styles.statusTop}>
            <View style={[styles.statusIcon, item.verified && styles.statusIconVerified]}>
              <item.Icon color={item.verified ? colors.success : colors.softText} size={15} />
            </View>
            {item.verified ? (
              <View style={styles.verifiedPill}>
                <CheckCircle2 color={colors.success} size={12} />
                <AppText variant="caption" weight="extraBold" tone="success">
                  Verified
                </AppText>
              </View>
            ) : null}
          </View>
          <AppText variant="caption" weight="bold" tone="soft" style={styles.infoLabel}>
            {item.label}
          </AppText>
          <AppText variant="bodySmall" weight="extraBold" numberOfLines={2}>
            {item.value}
          </AppText>
        </View>
      ))}
    </View>
  );
}

function ProfileFact({ Icon, label, value }: { Icon: IconType; label: string; value: string }) {
  return (
    <View style={styles.factRow}>
      <View style={styles.factIcon}>
        <Icon color={colors.primary} size={16} />
      </View>
      <View style={styles.flex}>
        <AppText variant="caption" weight="bold" tone="soft" style={styles.infoLabel}>
          {label}
        </AppText>
        <AppText variant="bodySmall" weight="extraBold">
          {value}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingBottom: spacing[8]
  },
  flex: {
    flex: 1,
    minWidth: 0
  },
  hero: {
    borderColor: colors.brand[100],
    backgroundColor: "#f7fffc"
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[4],
    minWidth: 0
  },
  avatarWrap: {
    position: "relative"
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: colors.primaryDeep,
    borderWidth: 1,
    borderColor: colors.brand[100]
  },
  avatarImage: {
    width: "100%",
    height: "100%"
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(2,6,23,0.42)"
  },
  cameraBadge: {
    position: "absolute",
    right: 2,
    bottom: 4,
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.white
  },
  progressWrap: {
    gap: spacing[1],
    marginTop: spacing[2]
  },
  progressTrack: {
    height: 8,
    overflow: "hidden",
    borderRadius: radius.full,
    backgroundColor: "#dbe7e5"
  },
  progressFill: {
    height: "100%",
    borderRadius: radius.full,
    backgroundColor: colors.primary
  },
  statusRail: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[2]
  },
  statusCard: {
    width: "48.5%",
    minHeight: 106,
    gap: spacing[1],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: spacing[3]
  },
  statusTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[2]
  },
  statusIcon: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#f8fafc"
  },
  statusIconVerified: {
    borderColor: colors.brand[100],
    backgroundColor: "#e9f7ef"
  },
  verifiedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
    borderRadius: radius.full,
    backgroundColor: "#e9f7ef",
    paddingHorizontal: spacing[2],
    paddingVertical: 2
  },
  infoLabel: {
    textTransform: "uppercase",
    letterSpacing: 1
  },
  sectionTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    minWidth: 0
  },
  sectionIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.brand[100],
    backgroundColor: colors.brand[50]
  },
  accountCard: {
    backgroundColor: "#fbfaff",
    borderColor: "#ede9fe"
  },
  factRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[3]
  },
  factIcon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
    backgroundColor: colors.brand[50]
  }
});
