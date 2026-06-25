import {
  AppButton,
  AppInput,
  AppText,
  apiRequest,
  colors,
  getErrorMessage,
  radius,
  spacing
} from "@nolsaf/native-ui";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import {
  AlertCircle,
  Briefcase,
  Building2,
  Calendar,
  Camera,
  CheckCircle,
  FileText,
  Mail,
  MapPin,
  Receipt,
  Shield,
  Smartphone,
  Upload,
  User,
  UserPen,
  Wallet,
  X
} from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../auth";

// ── Types ──────────────────────────────────────────────────────────────────

type PayoutMethod = "bank" | "mobile";

type PickedFile = {
  uri: string;
  name: string;
  size: number;
  mimeType: string;
};

type DocState = {
  file: PickedFile | null;
  expiry: string;
  error: string | null;
  uploading: boolean;
  uploaded: boolean;
};

type Props = {
  visible: boolean;
  onClose: () => void;
};

type CloudinarySign = {
  timestamp: number;
  signature: string;
  folder: string;
  cloudName: string;
  apiKey: string;
};

// ── Constants ──────────────────────────────────────────────────────────────

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const ALLOWED_MIMES = ["image/jpeg", "application/pdf"] as const;

// Static requires must be literal — Metro needs them at bundle time.
const MOBILE_PROVIDERS = [
  { key: "Vodacom M-Pesa", label: "M-Pesa",       logo: require("../../assets/mpesa.png")   },
  { key: "Tigo Pesa",      label: "Tigo Pesa",     logo: require("../../assets/yas.png")     },
  { key: "Airtel Money",   label: "Airtel",         logo: require("../../assets/airtel.png")  },
  { key: "Halo Pesa",      label: "Halo Pesa",      logo: require("../../assets/halopesa.png")}
] as const;

const DOCS = [
  {
    key: "tin_certificate",
    label: "TIN Certificate",
    sub: "Tax registration proof from TRA",
    Icon: Receipt,
    iconBg: colors.accent.amberSoft,
    iconColor: colors.accent.amberDark,
    hasExpiry: true
  },
  {
    key: "business_licence",
    label: "Business Licence",
    sub: "BRELA certificate",
    Icon: Briefcase,
    iconBg: colors.brand[50],
    iconColor: colors.primary,
    hasExpiry: true
  }
];

const EMPTY_DOC: DocState = { file: null, expiry: "", error: null, uploading: false, uploaded: false };

// ── Component ──────────────────────────────────────────────────────────────

export function OwnerProfileSheet({ visible, onClose }: Props) {
  const { token, user, refreshProfile } = useAuth();
  const insets = useSafeAreaInsets();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [tin, setTin] = useState("");
  const [address, setAddress] = useState("");

  const [payoutMethod, setPayoutMethod] = useState<PayoutMethod>("bank");
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankBranch, setBankBranch] = useState("");
  const [mobileMoneyProvider, setMobileMoneyProvider] = useState("");
  const [mobileMoneyNumber, setMobileMoneyNumber] = useState("");

  const [docStates, setDocStates] = useState<Record<string, DocState>>({});
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPayout, setSavingPayout] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [payoutError, setPayoutError] = useState<string | null>(null);
  const [payoutSuccess, setPayoutSuccess] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (user) {
      setFullName(user.fullName ?? user.name ?? "");
      setPhone(user.phone ?? "");
    }
    setTin("");
    setAddress("");
    setDocStates({});
    setProfileError(null);
    setProfileSuccess(false);
    setPayoutError(null);
    setPayoutSuccess(false);
    loadPayoutPreference();
  }, [visible, user]);

  const loadPayoutPreference = async () => {
    if (!token) return;
    try {
      const me = await apiRequest<Record<string, any>>("/account/me", { token });
      // Payout data is stored as a JSON field and also flattened onto the user object
      const p: Record<string, string> =
        (me?.payout && typeof me.payout === "object" ? me.payout : {}) as Record<string, string>;

      const preferred = String(me?.payoutPreferred ?? p.payoutPreferred ?? "").toUpperCase();
      setPayoutMethod(preferred === "MOBILE_MONEY" ? "mobile" : "bank");
      setBankName(String(me?.bankName ?? p.bankName ?? ""));
      setBankAccountNumber(String(me?.bankAccountNumber ?? p.bankAccountNumber ?? ""));
      setBankAccountName(String(me?.bankAccountName ?? p.bankAccountName ?? ""));
      setBankBranch(String(me?.bankBranch ?? p.bankBranch ?? ""));
      setMobileMoneyProvider(String(me?.mobileMoneyProvider ?? p.mobileMoneyProvider ?? ""));
      setMobileMoneyNumber(String(me?.mobileMoneyNumber ?? p.mobileMoneyNumber ?? ""));
    } catch {
      // Silent — payout data not critical for sheet to open
    }
  };

  const initials = getInitials(fullName || user?.fullName || user?.name);

  const clearProfileFeedback = () => { setProfileError(null); setProfileSuccess(false); };
  const clearPayoutFeedback = () => { setPayoutError(null); setPayoutSuccess(false); };

  // ── Avatar upload ─────────────────────────────────────────────────────────

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"] as any,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    setAvatarUploading(true);
    try {
      const sig = await apiRequest<CloudinarySign>(
        `/api/uploads/cloudinary/sign?folder=avatars`,
        { token: token ?? undefined }
      );

      const fd = new FormData();
      const filename = asset.uri.split("/").pop() ?? "avatar.jpg";
      fd.append("file", { uri: asset.uri, name: filename, type: "image/jpeg" } as any);
      fd.append("timestamp", String(sig.timestamp));
      fd.append("api_key", sig.apiKey);
      fd.append("signature", sig.signature);
      fd.append("folder", sig.folder);
      fd.append("overwrite", "true");

      const cloudResp = await fetch(
        `https://api.cloudinary.com/v1_1/${sig.cloudName}/auto/upload`,
        { method: "POST", body: fd }
      );
      if (!cloudResp.ok) throw new Error("Photo upload failed.");
      const { secure_url: avatarUrl } = await cloudResp.json() as { secure_url: string };

      await apiRequest("/account/profile", {
        method: "PUT",
        token: token ?? undefined,
        body: { avatarUrl }
      });
      await refreshProfile();
    } catch {
      // Avatar failures are silent — the initials fallback stays visible
    } finally {
      setAvatarUploading(false);
    }
  };

  // ── Document upload (same flow as web) ────────────────────────────────────

  const setDocState = (key: string, patch: Partial<DocState>) =>
    setDocStates(prev => ({ ...prev, [key]: { ...(prev[key] ?? EMPTY_DOC), ...patch } }));

  const uploadDocument = async (docKey: string, file: PickedFile, expiry: string) => {
    setDocState(docKey, { uploading: true, error: null });
    try {
      // 1. Get Cloudinary signed params from the same endpoint the web uses
      const sig = await apiRequest<CloudinarySign>(
        `/api/uploads/cloudinary/sign?folder=owner-documents`,
        { token: token ?? undefined }
      );

      // 2. Upload directly to Cloudinary (client-side signed upload)
      const fd = new FormData();
      fd.append("file", { uri: file.uri, name: file.name, type: file.mimeType } as any);
      fd.append("timestamp", String(sig.timestamp));
      fd.append("api_key", sig.apiKey);
      fd.append("signature", sig.signature);
      fd.append("folder", sig.folder);
      fd.append("overwrite", "true");

      const cloudResp = await fetch(
        `https://api.cloudinary.com/v1_1/${sig.cloudName}/auto/upload`,
        { method: "POST", body: fd }
      );
      if (!cloudResp.ok) throw new Error("Storage upload failed.");
      const { secure_url: url } = await cloudResp.json() as { secure_url: string };

      // 3. Compute expiry metadata (matches web format exactly)
      let expiresAt: string | null = null;
      let expiresOn: string | null = null;
      if (expiry) {
        const [mm, yyyy] = expiry.split("/");
        const lastDay = new Date(Number(yyyy), Number(mm), 0); // day 0 = last of prev month
        expiresAt = new Date(Number(yyyy), Number(mm), 0, 23, 59, 59, 999).toISOString();
        expiresOn = `${yyyy}-${mm.padStart(2, "0")}-${String(lastDay.getDate()).padStart(2, "0")}`;
      }

      // 4. Save to the same API endpoint as the web → shared across all platforms
      await apiRequest("/api/account/documents", {
        method: "PUT",
        token: token ?? undefined,
        body: {
          type: docKey.toUpperCase(),
          url,
          metadata: {
            fileName: file.name,
            contentType: file.mimeType,
            size: file.size,
            uploadedAt: new Date().toISOString(),
            ...(expiresAt ? { expiresAt, expiresOn } : {})
          }
        }
      });

      setDocState(docKey, { uploading: false, uploaded: true });
    } catch (err) {
      setDocState(docKey, { uploading: false, error: getErrorMessage(err, "Upload failed. Please try again.") });
    }
  };

  const pickDocument = async (docKey: string) => {
    const ds = docStates[docKey] ?? EMPTY_DOC;

    // Validate expiry before opening picker so the user knows what to fill first
    const needsExpiry = DOCS.find(d => d.key === docKey)?.hasExpiry ?? false;
    if (needsExpiry && !ds.expiry) {
      setDocState(docKey, { error: "Enter the expiry date before uploading." });
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [...ALLOWED_MIMES],
        copyToCacheDirectory: true
      });
      if (result.canceled) return;

      const asset = result.assets[0];

      if (asset.size !== undefined && asset.size > MAX_FILE_BYTES) {
        setDocState(docKey, { file: null, uploaded: false, error: "File must be under 2 MB." });
        return;
      }

      const mime = asset.mimeType ?? "";
      if (!ALLOWED_MIMES.includes(mime as typeof ALLOWED_MIMES[number])) {
        setDocState(docKey, { file: null, uploaded: false, error: "Only JPG and PDF files are accepted." });
        return;
      }

      const pickedFile: PickedFile = { uri: asset.uri, name: asset.name, size: asset.size ?? 0, mimeType: mime };
      setDocState(docKey, { file: pickedFile, error: null, uploaded: false });

      await uploadDocument(docKey, pickedFile, ds.expiry);
    } catch {
      setDocState(docKey, { error: "Could not open file picker." });
    }
  };

  const updateDocExpiry = (key: string, raw: string) =>
    setDocState(key, { expiry: formatExpiry(raw), error: null });

  // ── Profile save ─────────────────────────────────────────────────────────

  const onSaveProfile = async () => {
    if (!fullName.trim()) { setProfileError("Full name is required."); return; }
    clearProfileFeedback();
    setSavingProfile(true);
    try {
      await apiRequest("/account/profile", {
        method: "PUT",
        token: token ?? undefined,
        body: { fullName: fullName.trim(), phone: phone.trim() || null, tin: tin.trim() || null, address: address.trim() || null }
      });
      await refreshProfile();
      setProfileSuccess(true);
    } catch (err) {
      setProfileError(getErrorMessage(err, "Could not save profile. Please try again."));
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Payout save ──────────────────────────────────────────────────────────

  const onSavePayout = async () => {
    clearPayoutFeedback();
    setSavingPayout(true);
    try {
      const body: Record<string, string> =
        payoutMethod === "bank"
          ? {
              payoutPreferred: "BANK",
              bankName: bankName.trim(),
              bankAccountNumber: bankAccountNumber.trim(),
              bankAccountName: bankAccountName.trim(),
              bankBranch: bankBranch.trim()
            }
          : {
              payoutPreferred: "MOBILE_MONEY",
              mobileMoneyProvider: mobileMoneyProvider.trim(),
              mobileMoneyNumber: mobileMoneyNumber.trim()
            };
      await apiRequest("/account/payouts", { method: "PUT", token: token ?? undefined, body });
      setPayoutSuccess(true);
    } catch (err) {
      setPayoutError(getErrorMessage(err, "Could not save payout details. Please try again."));
    } finally {
      setSavingPayout(false);
    }
  };

  const handleClose = () => { clearProfileFeedback(); clearPayoutFeedback(); onClose(); };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose} />

      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing[4]) }]}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIcon}><UserPen size={18} color={colors.primary} /></View>
            <AppText variant="bodySmall" weight="semiBold">My Profile</AppText>
          </View>
          <Pressable onPress={handleClose} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Close">
            <X size={18} color={colors.mutedText} />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

          {/* ── Avatar ── */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarWrap}>
              <Pressable
                onPress={pickAvatar}
                disabled={avatarUploading}
                style={({ pressed }) => [styles.avatar, pressed && { opacity: 0.8 }]}
                accessibilityRole="button"
                accessibilityLabel="Change profile photo"
              >
                {user?.avatarUrl
                  ? <Image source={{ uri: user.avatarUrl }} style={styles.avatarImg} />
                  : <AppText variant="title" weight="bold" style={styles.avatarText}>{initials}</AppText>
                }
              </Pressable>
              <View style={styles.cameraBadge}>
                {avatarUploading
                  ? <ActivityIndicator size={10} color={colors.white} />
                  : <Camera size={11} color={colors.white} />
                }
              </View>
            </View>
            <View style={styles.avatarMeta}>
              <AppText variant="bodySmall" weight="semiBold" numberOfLines={1}>{fullName || "Your name"}</AppText>
              <View style={styles.rolePill}>
                <AppText variant="caption" style={styles.roleText}>Property Owner</AppText>
              </View>
            </View>
          </View>

          {/* ── Email ── */}
          <SectionLabel icon={<Mail size={13} color={colors.softText} />} label="EMAIL ADDRESS" />
          <View style={styles.readOnlyCard}>
            <View style={styles.readOnlyIcon}><Mail size={16} color={colors.softText} /></View>
            <View style={styles.readOnlyText}>
              <AppText variant="bodySmall" numberOfLines={1}>{user?.email ?? "Not set"}</AppText>
              <AppText variant="caption" tone="muted">Contact support to update your email.</AppText>
            </View>
          </View>

          {/* ── Personal Details ── */}
          <SectionLabel icon={<User size={13} color={colors.softText} />} label="PERSONAL DETAILS" />
          <View style={styles.card}>
            <AppInput label="Full name" required autoCapitalize="words" autoComplete="name" textContentType="name"
              placeholder="Your full name" value={fullName}
              onChangeText={v => { setFullName(v); clearProfileFeedback(); }}
              error={!fullName.trim() && profileError ? profileError : undefined}
            />
            <AppInput label="Phone number" keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber"
              placeholder="+255 700 000 000" value={phone}
              onChangeText={v => { setPhone(v); clearProfileFeedback(); }}
            />
          </View>

          {/* ── Identity & Tax ── */}
          <SectionLabel icon={<Receipt size={13} color={colors.softText} />} label="IDENTITY & TAX" />
          <View style={styles.card}>
            <AppInput label="TIN / Tax ID Number" autoCapitalize="characters" autoComplete="off"
              placeholder="e.g. 123-456-789" value={tin}
              onChangeText={v => { setTin(v); clearProfileFeedback(); }}
            />
          </View>

          {/* ── Address ── */}
          <SectionLabel icon={<MapPin size={13} color={colors.softText} />} label="ADDRESS" />
          <View style={styles.card}>
            <AppInput label="Address" autoCapitalize="words" autoComplete="street-address" textContentType="fullStreetAddress"
              placeholder="e.g. Masaki, Plot 5, Dar es Salaam" value={address}
              onChangeText={v => { setAddress(v); clearProfileFeedback(); }}
            />
          </View>

          {profileError && fullName.trim() ? (
            <AppText variant="caption" style={styles.errorText}>{profileError}</AppText>
          ) : null}
          {profileSuccess ? (
            <View style={styles.feedbackRow}>
              <CheckCircle size={15} color={colors.success} />
              <AppText variant="caption" style={styles.successText}>Profile saved successfully.</AppText>
            </View>
          ) : null}
          <AppButton title={savingProfile ? "Saving…" : "Save profile"} loading={savingProfile} onPress={onSaveProfile} />

          {/* ── Payout Preferences ── */}
          <SectionLabel icon={<Wallet size={13} color={colors.softText} />} label="PAYOUT PREFERENCES" />

          <View style={styles.methodToggle}>
            <Pressable onPress={() => { setPayoutMethod("bank"); clearPayoutFeedback(); }}
              style={[styles.methodPill, payoutMethod === "bank" && styles.methodPillActive]}
              accessibilityRole="button" accessibilityLabel="Bank transfer"
            >
              <Building2 size={14} color={payoutMethod === "bank" ? colors.white : colors.mutedText} />
              <AppText variant="caption" weight="medium"
                style={payoutMethod === "bank" ? styles.methodLabelActive : styles.methodLabel}
              >Bank Transfer</AppText>
            </Pressable>
            <Pressable onPress={() => { setPayoutMethod("mobile"); clearPayoutFeedback(); }}
              style={[styles.methodPill, payoutMethod === "mobile" && styles.methodPillActive]}
              accessibilityRole="button" accessibilityLabel="Mobile money"
            >
              <Smartphone size={14} color={payoutMethod === "mobile" ? colors.white : colors.mutedText} />
              <AppText variant="caption" weight="medium"
                style={payoutMethod === "mobile" ? styles.methodLabelActive : styles.methodLabel}
              >Mobile Money</AppText>
            </Pressable>
          </View>

          {payoutMethod === "bank" ? (
            <View style={styles.card}>
              <AppInput label="Bank name" autoCapitalize="words" autoComplete="off" placeholder="e.g. CRDB Bank"
                value={bankName} onChangeText={v => { setBankName(v); clearPayoutFeedback(); }} />
              <AppInput label="Branch" autoCapitalize="words" autoComplete="off" placeholder="e.g. Posta Branch"
                value={bankBranch} onChangeText={v => { setBankBranch(v); clearPayoutFeedback(); }} />
              <AppInput label="Account number" keyboardType="numeric" autoComplete="off" placeholder="Your account number"
                value={bankAccountNumber} onChangeText={v => { setBankAccountNumber(v); clearPayoutFeedback(); }} />
              <AppInput label="Account name" autoCapitalize="words" autoComplete="off" placeholder="Name as on bank account"
                value={bankAccountName} onChangeText={v => { setBankAccountName(v); clearPayoutFeedback(); }} />
            </View>
          ) : (
            <View style={styles.card}>
              {/* Provider logo slider */}
              <View>
                <AppText variant="caption" tone="muted" style={styles.providerLabel}>Mobile money provider</AppText>
                <View style={styles.providerSlider}>
                  {MOBILE_PROVIDERS.map(p => {
                    const active = mobileMoneyProvider === p.key;
                    return (
                      <Pressable
                        key={p.key}
                        onPress={() => { setMobileMoneyProvider(p.key); clearPayoutFeedback(); }}
                        style={[styles.providerCard, active && styles.providerCardActive]}
                        accessibilityRole="button"
                        accessibilityLabel={p.label}
                      >
                        <Image source={p.logo} style={styles.providerLogo} resizeMode="contain" />
                        <AppText variant="caption" style={active ? styles.providerNameActive : styles.providerName} numberOfLines={1}>
                          {p.label}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              <AppInput label="Mobile number" keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber"
                placeholder="+255 7XX XXX XXX" value={mobileMoneyNumber}
                onChangeText={v => { setMobileMoneyNumber(v); clearPayoutFeedback(); }}
              />
            </View>
          )}

          {payoutError ? <AppText variant="caption" style={styles.errorText}>{payoutError}</AppText> : null}
          {payoutSuccess ? (
            <View style={styles.feedbackRow}>
              <CheckCircle size={15} color={colors.success} />
              <AppText variant="caption" style={styles.successText}>Payout details saved.</AppText>
            </View>
          ) : null}
          <AppButton title={savingPayout ? "Saving…" : "Save payout details"} loading={savingPayout}
            variant="secondary" onPress={onSavePayout} />

          {/* ── Required Documents ── */}
          <SectionLabel icon={<FileText size={13} color={colors.softText} />} label="REQUIRED DOCUMENTS" />
          <AppText variant="caption" tone="muted" style={styles.docNote}>
            Both documents are mandatory to activate your listings. Accepted formats: JPG, PDF · Max 2 MB each.
          </AppText>

          <View style={styles.docsCard}>
            {DOCS.map((doc, i) => {
              const IconComp = doc.Icon;
              const ds = docStates[doc.key] ?? EMPTY_DOC;

              return (
                <View key={doc.key}>
                  {i > 0 ? <View style={styles.docDivider} /> : null}

                  <View style={styles.docRow}>
                    <View style={[styles.docIcon, { backgroundColor: doc.iconBg }]}>
                      <IconComp size={16} color={doc.iconColor} />
                    </View>

                    <View style={styles.docInfo}>
                      <View style={styles.docTitleRow}>
                        <AppText variant="bodySmall" weight="medium" numberOfLines={1} style={styles.docTitle}>
                          {doc.label}
                        </AppText>
                        <View style={styles.requiredChip}>
                          <View style={styles.requiredDot} />
                          <AppText variant="caption" style={styles.requiredText}>Required</AppText>
                        </View>
                      </View>

                      <AppText variant="caption" tone="muted" numberOfLines={1}>{doc.sub}</AppText>

                      {ds.uploaded ? (
                        <View style={styles.docFileRow}>
                          <CheckCircle size={11} color={colors.success} />
                          <AppText variant="caption" style={styles.docSuccessText}>Uploaded — pending review</AppText>
                        </View>
                      ) : ds.file && !ds.uploading ? (
                        <View style={styles.docFileRow}>
                          <CheckCircle size={11} color={colors.success} />
                          <AppText variant="caption" style={styles.docFileText} numberOfLines={1}>{ds.file.name}</AppText>
                        </View>
                      ) : null}

                      {ds.error ? (
                        <View style={styles.docFileRow}>
                          <AlertCircle size={11} color={colors.danger} />
                          <AppText variant="caption" style={styles.docErrorText}>{ds.error}</AppText>
                        </View>
                      ) : null}

                      {doc.hasExpiry ? (
                        <View style={styles.docExpiryRow}>
                          <Calendar size={11} color={colors.softText} />
                          <AppText variant="caption" tone="muted" style={styles.docExpiryLabel}>Expires</AppText>
                          <TextInput
                            style={styles.docExpiryInput}
                            placeholder="MM/YYYY"
                            keyboardType="numeric"
                            value={ds.expiry}
                            onChangeText={v => updateDocExpiry(doc.key, v)}
                            maxLength={7}
                            placeholderTextColor={colors.softText}
                          />
                        </View>
                      ) : null}
                    </View>

                    {/* Upload button — spinner while uploading, checkmark when done */}
                    <Pressable
                      style={({ pressed }) => [
                        styles.docUpload,
                        ds.uploaded && styles.docUploadDone,
                        (ds.uploading || pressed) && { opacity: 0.7 }
                      ]}
                      onPress={() => pickDocument(doc.key)}
                      disabled={ds.uploading}
                      accessibilityRole="button"
                      accessibilityLabel={ds.uploaded ? `Re-upload ${doc.label}` : `Upload ${doc.label}`}
                    >
                      {ds.uploading
                        ? <ActivityIndicator size={13} color={colors.primary} />
                        : ds.uploaded
                          ? <CheckCircle size={13} color={colors.success} />
                          : <Upload size={13} color={colors.primary} />
                      }
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>

          <AppText variant="caption" tone="muted" style={styles.docReviewNote}>
            Documents are reviewed by the NoLSAF team within 48 hours. Verified owners receive a trust badge on their listings.
          </AppText>

          {/* ── Account Info ── */}
          <SectionLabel icon={<Shield size={13} color={colors.softText} />} label="ACCOUNT INFO" />
          <View style={styles.metaCard}>
            <View style={styles.metaRow}>
              <AppText variant="caption" tone="muted" style={styles.metaKey}>Role</AppText>
              <AppText variant="caption" weight="medium" style={styles.metaValue}>{user?.role ?? "owner"}</AppText>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaRow}>
              <AppText variant="caption" tone="muted" style={styles.metaKey}>Account status</AppText>
              <View style={styles.statusPill}>
                <View style={[styles.statusDot, { backgroundColor: user?.suspendedAt ? colors.danger : colors.success }]} />
                <AppText variant="caption" style={{ color: user?.suspendedAt ? colors.danger : colors.success }}>
                  {user?.suspendedAt ? "Suspended" : "Active"}
                </AppText>
              </View>
            </View>
          </View>

          <View style={{ height: spacing[2] }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function SectionLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <View style={styles.sectionLabel}>
      {icon}
      <AppText variant="caption" style={styles.sectionLabelText}>{label}</AppText>
    </View>
  );
}

function getInitials(name?: string | null): string {
  const parts = (name ?? "").trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  if (parts[0]?.length) return parts[0][0].toUpperCase();
  return "O";
}

// Auto-formats to MM/YYYY: slash is inserted automatically after 2 digits.
function formatExpiry(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length <= 2) return digits;
  return digits.slice(0, 2) + "/" + digits.slice(2, 6);
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    maxHeight: "94%"
  },
  handle: { width: 36, height: 4, borderRadius: radius.full, backgroundColor: colors.border, alignSelf: "center", marginTop: spacing[2] },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing[4], paddingTop: spacing[3], paddingBottom: spacing[3],
    borderBottomWidth: 1, borderBottomColor: colors.border
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  headerIcon: { width: 30, height: 30, borderRadius: radius.sm, backgroundColor: colors.brand[50], alignItems: "center", justifyContent: "center" },
  closeBtn: { width: 32, height: 32, borderRadius: radius.full, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  scroll: { padding: spacing[4], gap: spacing[3] },
  avatarSection: { flexDirection: "row", alignItems: "center", gap: spacing[4], paddingVertical: spacing[2] },
  avatarWrap: { position: "relative" },
  avatar: { width: 64, height: 64, borderRadius: radius.full, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarImg: { width: 64, height: 64, borderRadius: radius.full },
  avatarText: { color: colors.white },
  cameraBadge: {
    position: "absolute", bottom: 0, right: 0,
    width: 22, height: 22,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: colors.white
  },
  avatarMeta: { flex: 1, minWidth: 0, gap: spacing[1] },
  rolePill: { alignSelf: "flex-start", paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: radius.full, backgroundColor: colors.brand[50], borderWidth: 1, borderColor: colors.brand[100] },
  roleText: { color: colors.primaryDark, fontSize: 10 },
  sectionLabel: { flexDirection: "row", alignItems: "center", gap: spacing[1] },
  sectionLabelText: { color: colors.softText, letterSpacing: 1.1, fontSize: 10 },
  readOnlyCard: { flexDirection: "row", alignItems: "center", gap: spacing[3], borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: spacing[3] },
  readOnlyIcon: { width: 34, height: 34, borderRadius: radius.sm, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  readOnlyText: { flex: 1, minWidth: 0, gap: 2 },
  card: { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, padding: spacing[4], gap: spacing[3] },
  feedbackRow: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  successText: { color: colors.success },
  errorText: { color: colors.danger },
  // Payout method toggle
  methodToggle: { flexDirection: "row", gap: spacing[2] },
  methodPill: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing[1], paddingVertical: spacing[2] + 2, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  methodPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  methodLabel: { color: colors.mutedText },
  methodLabelActive: { color: colors.white },
  // Provider logo slider
  providerLabel: { marginBottom: spacing[2] },
  providerSlider: { flexDirection: "row", gap: spacing[2] },
  providerCard: { flex: 1, alignItems: "center", paddingVertical: spacing[2], paddingHorizontal: spacing[1], borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, gap: spacing[1] },
  providerCardActive: { borderColor: colors.primary, backgroundColor: colors.brand[50] },
  providerLogo: { width: 48, height: 28 },
  providerName: { color: colors.mutedText, fontSize: 10, textAlign: "center" },
  providerNameActive: { color: colors.primary, fontSize: 10, textAlign: "center" },
  // Documents
  docNote: { marginTop: -spacing[1] },
  docsCard: { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, overflow: "hidden" },
  docRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing[3], paddingHorizontal: spacing[3], paddingVertical: spacing[3] },
  docDivider: { height: 1, backgroundColor: colors.border },
  docIcon: { width: 34, height: 34, borderRadius: radius.sm, alignItems: "center", justifyContent: "center", marginTop: 2 },
  docInfo: { flex: 1, minWidth: 0, gap: spacing[1] },
  docTitleRow: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  docTitle: { flex: 1 },
  requiredChip: { flexDirection: "row", alignItems: "center", gap: 3 },
  requiredDot: { width: 5, height: 5, borderRadius: radius.full, backgroundColor: colors.danger },
  requiredText: { color: colors.danger, fontSize: 9 },
  docFileRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  docFileText: { color: colors.success, flex: 1 },
  docSuccessText: { color: colors.success },
  docErrorText: { color: colors.danger },
  docExpiryRow: { flexDirection: "row", alignItems: "center", gap: spacing[1], marginTop: 2 },
  docExpiryLabel: { fontSize: 11 },
  docExpiryInput: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing[2], paddingVertical: 4, fontSize: 12, color: colors.ink, backgroundColor: colors.surface, height: 28 },
  docUpload: { width: 30, height: 30, borderRadius: radius.sm, backgroundColor: colors.brand[50], borderWidth: 1, borderColor: colors.brand[100], alignItems: "center", justifyContent: "center", marginTop: 2 },
  docUploadDone: { backgroundColor: colors.accent.greenSoft, borderColor: colors.accent.green },
  docReviewNote: { lineHeight: 16 },
  // Account meta
  metaCard: { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, overflow: "hidden" },
  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing[4], paddingVertical: spacing[3] },
  metaDivider: { height: 1, backgroundColor: colors.border },
  metaKey: { flex: 1 },
  metaValue: { color: colors.ink },
  statusPill: { flexDirection: "row", alignItems: "center", gap: spacing[1] },
  statusDot: { width: 7, height: 7, borderRadius: radius.full }
});
