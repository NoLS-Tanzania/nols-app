import {
  AppButton,
  AppText,
  ConfirmSheet,
  StateView,
  colors,
  radius,
  spacing
} from "@nolsaf/native-ui";
import { BarcodeScanningResult, CameraView, useCameraPermissions } from "expo-camera";
import { AlertCircle, ArrowLeft, ArrowRight, BedDouble, CheckCircle2, FileCheck2, Moon, Phone, QrCode, ScanLine } from "lucide-react-native";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";

import { useAuth } from "../auth";
import {
  BookingValidationPreview,
  confirmOwnerCheckin,
  formatDate,
  formatTzs,
  validateOwnerBookingCode
} from "../ownerBookings";

type OwnerBookingValidationScreenProps = {
  initialCode?: string;
  onBack: () => void;
  onConfirmed?: () => void;
};

export function OwnerBookingValidationScreen({ initialCode = "", onBack, onConfirmed }: OwnerBookingValidationScreenProps) {
  const { token } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [code, setCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<BookingValidationPreview | null>(null);
  const [eligibility, setEligibility] = useState<{ canValidate: boolean; reason?: string } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerLocked, setScannerLocked] = useState(false);

  const normalizedCode = useMemo(() => code.trim().toUpperCase(), [code]);
  const canSubmit = normalizedCode.length >= 6 && !loading;

  const validateValue = async (value: string) => {
    const valueToValidate = normalizeScanValue(value);
    if (!valueToValidate || loading) return;
    setCode(valueToValidate);
    setLoading(true);
    setError(null);
    setPreview(null);
    setEligibility(null);
    try {
      const response = await validateOwnerBookingCode({ token, code: valueToValidate });
      setPreview(response.details ?? null);
      setEligibility(response.eligibility ?? null);
      if (!response.details) setError("No booking details were returned for this code.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not validate the booking code.");
    } finally {
      setLoading(false);
    }
  };

  const validate = async () => {
    if (!canSubmit) return;
    await validateValue(normalizedCode);
  };

  const openScanner = async () => {
    setError(null);
    setScannerLocked(false);
    if (Platform.OS === "web") {
      setScannerOpen(true);
      return;
    }
    const current = permission?.granted ? permission : await requestPermission();
    if (!current.granted) {
      setError("Camera access is needed to scan guest QR codes. You can still enter the booking code manually.");
      return;
    }
    setScannerOpen(true);
  };

  const handleScan = (result: BarcodeScanningResult) => {
    if (scannerLocked) return;
    const raw = normalizeScanValue(result.data);
    if (!raw) return;
    setScannerLocked(true);
    setScannerOpen(false);
    void validateValue(raw);
  };

  const confirm = async () => {
    if (!preview) return;
    setConfirming(true);
    setError(null);
    try {
      await confirmOwnerCheckin({ token, bookingId: preview.bookingId, preview });
      setConfirmOpen(false);
      onConfirmed?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not confirm check in.");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Hero header ── */}
        <View style={styles.hero}>
          <View style={styles.heroRow}>
            <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} style={styles.backButton}>
              <ArrowLeft size={19} color={colors.white} />
            </Pressable>
            <View style={styles.heroCenter}>
              <View style={styles.heroIconWrap}>
                <ScanLine size={20} color={colors.white} />
                <View style={styles.liveDotBadge}>
                  <LiveDot />
                </View>
              </View>
              <View>
                <AppText variant="bodySmall" weight="bold" style={styles.heroEyebrow}>
                  OWNER BOOKINGS
                </AppText>
                <AppText variant="titleSm" weight="bold" tone="inverse">
                  Validate check in
                </AppText>
              </View>
            </View>
          </View>
          <AppText variant="bodySmall" style={styles.heroSub}>
            Scan the guest receipt QR or enter their booking code.
          </AppText>
        </View>

        {/* ── Scan + code entry card ── */}
        <View style={styles.entryCard}>
          {/* QR scan button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Scan receipt QR"
            onPress={openScanner}
            style={({ pressed }) => [styles.scanArea, pressed && styles.pressed]}
          >
            <View style={styles.scanIconRing}>
              <QrCode size={32} color={colors.primary} />
            </View>
            <AppText variant="bodySmall" weight="bold" style={styles.scanAreaLabel}>
              Scan receipt QR
            </AppText>
            <AppText variant="caption" tone="muted">
              Point camera at the guest receipt QR code
            </AppText>
          </Pressable>

          {/* Divider */}
          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <AppText variant="caption" tone="muted" weight="bold" style={styles.orText}>
              OR
            </AppText>
            <View style={styles.orLine} />
          </View>

          {/* Code input */}
          <View style={styles.codeInputWrap}>
            <FileCheck2 size={16} color={colors.softText} />
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="Enter booking code e.g. NLS-3A9X"
              placeholderTextColor={colors.softText}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={validate}
              style={styles.codeInput}
            />
          </View>

          {/* Validate button */}
          <AppButton
            title="Validate booking"
            loading={loading}
            disabled={!canSubmit}
            onPress={validate}
            icon={<CheckCircle2 size={18} color={colors.white} />}
          />

          {error ? (
            <View style={styles.errorBox}>
              <AppText variant="bodySmall" tone="danger">{error}</AppText>
            </View>
          ) : null}
        </View>

        {preview ? (
          <View style={styles.previewCard}>
            {/* Guest header band */}
            <View style={styles.previewBand}>
              <View style={styles.avatar}>
                <AppText variant="titleSm" weight="bold" tone="inverse">
                  {preview.personal.fullName.trim().charAt(0).toUpperCase() || "G"}
                </AppText>
              </View>
              <View style={styles.previewTitle}>
                <AppText variant="body" weight="bold" tone="inverse" numberOfLines={1}>
                  {preview.personal.fullName}
                </AppText>
                <AppText variant="caption" style={styles.previewProperty} numberOfLines={1}>
                  {preview.property.title}
                </AppText>
              </View>
              <View style={[styles.statusPill, preview.booking.status === "CHECKED_IN" ? styles.statusPillGreen : styles.statusPillAmber]}>
                <AppText variant="caption" weight="bold" style={preview.booking.status === "CHECKED_IN" ? styles.statusPillTextGreen : styles.statusPillTextAmber}>
                  {preview.booking.status.replace("_", " ")}
                </AppText>
              </View>
            </View>

            {/* Amount spotlight */}
            <View style={styles.amountSpotlight}>
              <AppText variant="caption" weight="bold" style={styles.amountSpotlightLabel}>OWNER PAYOUT</AppText>
              <AppText variant="display" weight="extraBold" style={styles.amountSpotlightValue} numberOfLines={1}>
                {formatTzs(preview.booking.ownerBaseAmount ?? preview.booking.totalAmount)}
              </AppText>
            </View>

            {/* Divider */}
            <View style={styles.previewDivider} />

            {/* Date bridge */}
            <View style={styles.dateBridge}>
              <View style={styles.dateBlock}>
                <AppText variant="caption" weight="bold" style={styles.dateLabel}>CHECK IN</AppText>
                <AppText variant="bodySmall" weight="bold" style={styles.dateValue}>{formatDate(preview.booking.checkIn)}</AppText>
              </View>
              <View style={styles.dateMid}>
                <ArrowRight size={14} color={colors.softText} />
                <View style={styles.nightsPill}>
                  <Moon size={10} color={colors.primary} />
                  <AppText variant="caption" weight="bold" style={styles.nightsText}>{preview.booking.nights}n</AppText>
                </View>
                <ArrowRight size={14} color={colors.softText} />
              </View>
              <View style={[styles.dateBlock, styles.dateBlockRight]}>
                <AppText variant="caption" weight="bold" style={styles.dateLabel}>CHECK OUT</AppText>
                <AppText variant="bodySmall" weight="bold" style={styles.dateValue}>{formatDate(preview.booking.checkOut)}</AppText>
              </View>
            </View>

            <View style={styles.previewDivider} />

            {/* Detail rows */}
            <View style={styles.detailRows}>
              <DetailRow icon={<Phone size={14} color={colors.primary} />} label="Phone" value={preview.personal.phone} />
              <DetailRow icon={<BedDouble size={14} color={colors.primary} />} label="Room" value={preview.booking.roomType} />
            </View>

            {/* Warning */}
            {eligibility && !eligibility.canValidate && eligibility.reason ? (
              <View style={styles.warningBox}>
                <AlertCircle size={15} color="#d97706" />
                <AppText variant="bodySmall" style={styles.warningText} numberOfLines={3}>
                  {eligibility.reason}
                </AppText>
              </View>
            ) : null}

            {/* Confirm */}
            <Pressable
              accessibilityRole="button"
              disabled={Boolean(eligibility && !eligibility.canValidate)}
              onPress={() => setConfirmOpen(true)}
              style={({ pressed }) => [
                styles.confirmBtn,
                eligibility && !eligibility.canValidate ? styles.confirmBtnDisabled : null,
                pressed && styles.pressed
              ]}
            >
              <CheckCircle2 size={18} color={eligibility && !eligibility.canValidate ? colors.softText : colors.white} />
              <AppText variant="bodySmall" weight="bold" style={eligibility && !eligibility.canValidate ? styles.confirmBtnTextDisabled : styles.confirmBtnText}>
                Confirm check in
              </AppText>
            </Pressable>
          </View>
        ) : (
          <StateView
            title="Ready when you are"
            message="Validated bookings show guest details, property, dates, amount, and check in eligibility before anything changes."
          />
        )}
      </ScrollView>

      <ConfirmSheet
        visible={confirmOpen}
        title="Confirm check in"
        message={preview ? `Move ${preview.personal.fullName} into Checked In for ${preview.property.title}? This records the owner action.` : "Confirm this check in?"}
        confirmLabel="Confirm check in"
        loading={confirming}
        onConfirm={confirm}
        onCancel={() => setConfirmOpen(false)}
      />
      <Modal visible={scannerOpen} transparent animationType="fade" onRequestClose={() => setScannerOpen(false)}>
        <View style={styles.scannerOverlay}>
          <View style={styles.scannerSheet}>
            <View style={styles.scannerHeader}>
              <View style={styles.headerText}>
                <AppText variant="titleSm" weight="bold" tone="inverse">
                  Scan guest receipt
                </AppText>
                <AppText variant="caption" style={styles.scannerSub}>
                  Point the camera at the QR code. The result opens below after validation.
                </AppText>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Close scanner" onPress={() => setScannerOpen(false)} style={styles.closeButton}>
                <AppText variant="bodySmall" weight="bold" tone="inverse">
                  Close
                </AppText>
              </Pressable>
            </View>

            {permission?.granted || Platform.OS === "web" ? (
              <View style={styles.cameraFrame}>
                <CameraView
                  style={styles.camera}
                  facing="back"
                  active={scannerOpen}
                  barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                  onBarcodeScanned={scannerLocked ? undefined : handleScan}
                />
                <View pointerEvents="none" style={styles.scanFrame}>
                  <View style={styles.scanBox} />
                </View>
              </View>
            ) : (
              <View style={styles.permissionBox}>
                <AppText variant="bodySmall" tone="inverse" style={styles.permissionText}>
                  Camera permission is not enabled. You can allow access or enter the booking code manually.
                </AppText>
                <AppButton title="Allow camera" onPress={openScanner} />
              </View>
            )}

          </View>
        </View>
      </Modal>
    </View>
  );
}

const LIVE_COLORS = ["#f43f5e", "#3b82f6", "#22c55e"];

function LiveDot() {
  const colorIndex = useRef(0);
  const opacity = useRef(new Animated.Value(1)).current;
  const [color, setColor] = useState(LIVE_COLORS[0]);

  useEffect(() => {
    const cycle = () => {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true })
      ]).start(() => {
        colorIndex.current = (colorIndex.current + 1) % LIVE_COLORS.length;
        setColor(LIVE_COLORS[colorIndex.current]);
        handle = setTimeout(cycle, 700);
      });
    };
    let handle = setTimeout(cycle, 700);
    return () => clearTimeout(handle);
  }, []);

  return (
    <Animated.View style={[liveDotStyle.dot, { backgroundColor: color, opacity }]} />
  );
}

const liveDotStyle = StyleSheet.create({
  dot: { width: 8, height: 8, borderRadius: 4 }
});

function normalizeScanValue(rawValue: string) {
  const value = String(rawValue || "").trim();
  if (!value) return "";
  if (value.startsWith("{") && value.includes("bookingId")) return value;
  try {
    const url = new URL(value);
    const queryCode =
      url.searchParams.get("code") ||
      url.searchParams.get("bookingCode") ||
      url.searchParams.get("checkinCode") ||
      url.searchParams.get("bookingId");
    if (queryCode) return queryCode.trim();
  } catch {
    // Plain booking code, not a URL.
  }
  return value.toUpperCase();
}

function DetailRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailRowIcon}>{icon}</View>
      <AppText variant="caption" weight="bold" style={styles.detailRowLabel}>{label}</AppText>
      <AppText variant="bodySmall" weight="semiBold" style={styles.detailRowValue} numberOfLines={1}>{value || "Not set"}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  scroll: { paddingBottom: spacing[8], gap: spacing[3] },

  // Hero
  hero: {
    backgroundColor: colors.primaryDeep,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[4],
    gap: spacing[3],
    borderRadius: radius.xl,
    marginHorizontal: spacing[3],
    marginTop: spacing[3]
  },
  heroRow: { flexDirection: "row", alignItems: "center", gap: spacing[3] },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)"
  },
  heroCenter: { flexDirection: "row", alignItems: "center", gap: spacing[3], flex: 1 },
  heroIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center"
  },
  eyebrowRow: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  liveDotBadge: {
    position: "absolute",
    top: 6,
    right: 6
  },
  heroEyebrow: { color: "rgba(255,255,255,0.45)", fontSize: 10, letterSpacing: 1.5 },
  heroSub: { color: "rgba(255,255,255,0.5)", fontSize: 13 },

  // Entry card
  entryCard: {
    marginHorizontal: spacing[3],
    marginTop: spacing[3],
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: spacing[4],
    gap: spacing[4],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3
  },
  scanArea: {
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.brand[100],
    borderStyle: "dashed",
    backgroundColor: colors.brand[50],
    paddingVertical: spacing[5],
    alignItems: "center",
    gap: spacing[2]
  },
  scanIconRing: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.brand[100],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[1]
  },
  scanAreaLabel: { color: colors.primaryDeep },
  pressed: { opacity: 0.75 },
  orRow: { flexDirection: "row", alignItems: "center", gap: spacing[3] },
  orLine: { flex: 1, height: 1, backgroundColor: colors.border },
  orText: { color: colors.softText, letterSpacing: 1.5, fontSize: 11 },
  codeInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing[4],
    height: 52
  },
  codeInput: {
    flex: 1,
    fontSize: 15,
    color: colors.ink,
    letterSpacing: 1,
    paddingVertical: 0
  },
  errorBox: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#fecaca",
    backgroundColor: "#fef2f2",
    padding: spacing[3]
  },

  // Preview card
  previewCard: {
    marginHorizontal: spacing[3],
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3
  },
  previewBand: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    backgroundColor: colors.primaryDeep,
    padding: spacing[4]
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.25)"
  },
  previewTitle: { flex: 1, minWidth: 0, gap: 2 },
  previewProperty: { color: "rgba(255,255,255,0.5)", fontSize: 12 },
  statusPill: {
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    borderRadius: radius.full,
    flexShrink: 0
  },
  statusPillGreen: { backgroundColor: "#d1fae5" },
  statusPillAmber: { backgroundColor: "#fef3c7" },
  statusPillTextGreen: { color: "#065f46", fontSize: 10, letterSpacing: 0.5 },
  statusPillTextAmber: { color: "#92400e", fontSize: 10, letterSpacing: 0.5 },
  amountSpotlight: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    alignItems: "center",
    gap: spacing[1]
  },
  amountSpotlightLabel: {
    color: colors.softText,
    fontSize: 10,
    letterSpacing: 2
  },
  amountSpotlightValue: { color: colors.primaryDeep, fontSize: 30, lineHeight: 36 },
  previewDivider: { height: 1, backgroundColor: colors.border, marginHorizontal: spacing[4] },
  dateBridge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4]
  },
  dateBlock: { flex: 1, gap: 3 },
  dateBlockRight: { alignItems: "flex-end" },
  dateLabel: { color: colors.softText, fontSize: 10, letterSpacing: 1.2 },
  dateValue: { color: colors.primaryDeep },
  dateMid: { alignItems: "center", gap: spacing[1], paddingHorizontal: spacing[2] },
  nightsPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.brand[50],
    borderRadius: radius.full,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.brand[100]
  },
  nightsText: { color: colors.primary, fontSize: 10 },
  detailRows: { paddingHorizontal: spacing[4], paddingBottom: spacing[3], gap: spacing[2] },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  detailRowIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.md,
    backgroundColor: colors.brand[50],
    alignItems: "center",
    justifyContent: "center"
  },
  detailRowLabel: { color: colors.softText, fontSize: 11, letterSpacing: 0.5, width: 52 },
  detailRowValue: { flex: 1, color: colors.primaryDeep },
  warningBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[2],
    marginHorizontal: spacing[4],
    marginBottom: spacing[3],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#fde68a",
    backgroundColor: "#fffbeb",
    padding: spacing[3]
  },
  warningText: { color: "#92400e", flex: 1 },
  confirmBtn: {
    margin: spacing[4],
    marginTop: spacing[2],
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    paddingVertical: spacing[4]
  },
  confirmBtnDisabled: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  confirmBtnText: { color: colors.white, fontSize: 15, fontWeight: "700" },
  confirmBtnTextDisabled: { color: colors.softText, fontSize: 15, fontWeight: "700" },

  // Scanner modal
  scannerOverlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(2,6,23,0.75)",
    padding: spacing[4]
  },
  scannerSheet: {
    overflow: "hidden",
    borderRadius: radius.xl,
    backgroundColor: colors.primaryDeep,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)"
  },
  scannerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    padding: spacing[4]
  },
  headerText: { flex: 1, minWidth: 0 },
  scannerSub: { color: colors.onHeroSoft },
  closeButton: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2]
  },
  cameraFrame: {
    position: "relative",
    overflow: "hidden",
    height: 340,
    backgroundColor: colors.black
  },
  camera: { flex: 1 },
  scanFrame: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center"
  },
  scanBox: {
    width: 210,
    height: 210,
    borderRadius: radius.xl,
    borderWidth: 2.5,
    borderColor: colors.brand[200],
    backgroundColor: "rgba(255,255,255,0.02)"
  },
  permissionBox: {
    minHeight: 240,
    justifyContent: "center",
    gap: spacing[3],
    padding: spacing[5]
  },
  permissionText: { textAlign: "center" },
  scannerHint: {
    color: colors.onHeroSoft,
    padding: spacing[4],
    textAlign: "center",
    fontSize: 11
  }
});
