import { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  AppButton,
  AppCard,
  AppInput,
  AppStack,
  AppText,
  colors,
  NolsafLogoMark,
  radius,
  spacing,
  StateView,
  StatusBadge
} from "@nolsaf/native-ui";
import { File, Paths } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import * as Sharing from "expo-sharing";
import { AlertCircle, ArrowLeft, ChevronLeft, ChevronRight, Download, IdCard, Shield, Trash2, UserCircle, X } from "lucide-react-native";
import * as QRCode from "qrcode";
import { useCallback, useEffect, useState } from "react";
import { Image, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import Svg, { Rect } from "react-native-svg";

import { useAuth } from "../auth/AuthProvider";
import {
  fetchPaymentMethods,
  fetchProfile,
  updateDocument,
  updateDriverProfile,
  updatePayoutDetails,
  uploadFile,
  deleteAccount
} from "../driver/driverApi";
import { DOCUMENT_STATUS_TONE, DocumentType, DriverProfile } from "../driver/types";
import { env } from "../lib/env";
import { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Profile">;

const DOCUMENT_TYPES: Array<{ type: DocumentType; label: string }> = [
  { type: "DRIVER_LICENSE", label: "Driving license" },
  { type: "NATIONAL_ID", label: "National ID" },
  { type: "VEHICLE_REGISTRATION", label: "Vehicle registration" },
  { type: "INSURANCE", label: "Insurance" }
];

const ID_CARD_ASPECT_RATIO = 85.6 / 53.98;
const LICENSE_DOC_TYPES = new Set(["DRIVER_LICENSE", "DRIVING_LICENSE", "DRIVER_LICENCE", "DRIVING_LICENCE", "LICENSE"]);
const NOLSAF_LOGO_PATH =
  "M504.04,245.75h-24.85c.18,1.71.34,3.44.54,5.19v88.35c-.05.13-1.02.77-1.23.81-1.99.39-6.53.27-8.59-.02-17.18-2.35-25.88-16.52-35.18-29.34-8.39-11.57-16.34-23.42-24.4-35.1-6.75-9.78-15.87-24.25-27.39-28.45-6.23-2.27-15.24-1.28-22-1.42-.45-.01-.85-.17-1.28-.25-.13.02-.37.54-.37.57v106.28c0,.4-.39,1.01.54,1.2l22.08.03c.14-.03.36-.53.36-.57v-75.12l.55-.33c.14.03.93,1.1,1.09,1.34,9.03,13.21,17.85,26.64,26.78,39.95,12.83,19.15,22.43,37.09,46.98,42.73,4.02.93,8.49,1.81,12.66,2.15,1.21.09,8.1-.24,8.41.21.16.65.15,1.42.07,2.09-2.1,17.92-18.01,32.38-35.87,32.84-28.1-.86-56.85,1.11-84.87,0-13.72-.54-27.16-7.95-33.41-20.5-2.88-5.76-3.66-11.69-4.04-18.06v-113.37c.59-12.06,4.98-22.52,14.83-29.79,7.51-5.54,15.4-7.75,24.83-8.1,28.99.43,58.11-.86,87.02.72,8.24,1.73,15.82,5.72,21.5,11.62h29.83c-4.48-10.07-11.56-18.93-20.76-25.28-11.69-8.08-26-11.5-40.02-12.47h-80.65c-32.59,2.38-58.8,26.87-61.32,60v118.87c1.22,34.56,29.86,59.84,63.51,61.55h85.3c33.11-2.72,56.91-26.65,59.33-59.78.36-39.49.37-79.06.02-118.55Z";

function publicIdCode(profile: DriverProfile) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const seed = `NLS:${profile.id ?? ""}`;
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  let value = hash >>> 0;
  let code = "";
  for (let index = 0; index < 4; index += 1) {
    code += alphabet[value % alphabet.length];
    value = Math.floor(value / alphabet.length);
  }
  return code;
}

function twoDigitYear(value: Date | null | undefined) {
  if (!value || Number.isNaN(value.getTime())) return "XX";
  return String(value.getFullYear()).slice(-2);
}

function driverIdNumber(profile: DriverProfile, licenseExpiry?: Date | null) {
  const id = Number(profile.id);
  const idPart = Number.isFinite(id) && id > 0 ? String(id) : "PENDING";
  return `NLS/D/${idPart}/${publicIdCode(profile)}/${twoDigitYear(new Date())}${twoDigitYear(licenseExpiry)}`;
}

function display(value: string | number | null | undefined) {
  const text = value == null ? "" : String(value).trim();
  return text || "--";
}

function hasDocument(profile: DriverProfile, type: DocumentType) {
  return Boolean(profile.documents?.some((doc) => doc.type === type && doc.url));
}

function getLatestDocument(profile: DriverProfile, type: DocumentType) {
  return profile.documents?.find((doc) => String(doc.type).toUpperCase() === type && doc.url) ?? null;
}

function getDocumentExpiryDate(doc: { metadata?: Record<string, unknown> | null } | null | undefined) {
  const metadata = doc?.metadata;
  if (!metadata) return null;
  const raw =
    metadata.expiresAt ??
    metadata.expiresOn ??
    metadata.expiryDate ??
    metadata.expiry ??
    metadata.licenseExpiresOn ??
    metadata.licenseExpiryDate;
  if (!raw) return null;
  const date = new Date(String(raw).includes("T") ? String(raw) : `${String(raw)}T23:59:59.999Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "--";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function toDateInputValue(date: Date | null) {
  if (!date || Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    const text = value == null ? "" : String(value).trim();
    if (text) return text;
  }
  return "";
}

function dateInputFromValue(value: unknown) {
  if (!value) return "";
  const date = new Date(String(value).includes("T") ? String(value) : `${String(value)}T12:00:00.000Z`);
  return toDateInputValue(Number.isNaN(date.getTime()) ? null : date);
}

function getLicenseExpiry(profile: DriverProfile) {
  const licenseDoc =
    profile.documents?.find((doc) => LICENSE_DOC_TYPES.has(String(doc.type).toUpperCase()) && Boolean(doc.url)) ?? null;
  return getDocumentExpiryDate(licenseDoc);
}

function isExpired(date: Date | null) {
  return !date || date.getTime() < Date.now();
}

function getVerificationUrl(profile: DriverProfile) {
  const base = (env.appUrl || "https://nolsaf.com").replace(/\/$/, "");
  return `${base}/verify/driver/${encodeURIComponent(driverIdNumber(profile, getLicenseExpiry(profile)))}`;
}

function getMissingIdCardItems(profile: DriverProfile, licenseExpiry: Date | null) {
  const missing: string[] = [];
  if (!(profile.fullName || profile.name)) missing.push("Full name");
  if (!(profile.plateNumber || profile.vehiclePlate)) missing.push("Vehicle plate");
  if (!profile.vehicleType) missing.push("Vehicle type");
  if (!(profile.operationArea || profile.region)) missing.push("Operation area or region");
  if (!licenseExpiry) missing.push("Driving license expiry date");
  if (licenseExpiry && isExpired(licenseExpiry)) missing.push("Renewed driving license");
  DOCUMENT_TYPES.forEach(({ type, label }) => {
    if (!hasDocument(profile, type)) missing.push(label);
  });
  return missing;
}

function escapeHtml(value: string | number | null | undefined) {
  return display(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildQrSvg(value: string, size = 168) {
  const qr = QRCode.create(value, { errorCorrectionLevel: "M" });
  const modules = qr.modules;
  const quiet = 4;
  const cell = size / (modules.size + quiet * 2);
  const rects: string[] = [];
  for (let row = 0; row < modules.size; row += 1) {
    for (let col = 0; col < modules.size; col += 1) {
      if (modules.get(row, col)) {
        rects.push(`<rect x="${(col + quiet) * cell}" y="${(row + quiet) * cell}" width="${cell}" height="${cell}" />`);
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="100%" height="100%" fill="#fff"/> <g fill="#081827">${rects.join("")}</g></svg>`;
}

function buildDriverIdHtml(profile: DriverProfile, licenseExpiry: Date, verificationUrl: string) {
  const name = profile.fullName || profile.name || "Driver";
  const idNo = driverIdNumber(profile, licenseExpiry);
  const plate = profile.plateNumber || profile.vehiclePlate;
  const vehicle = [profile.vehicleMake, profile.vehicleType].filter(Boolean).join(" / ");
  const area = profile.operationArea || profile.region || profile.district || "Tanzania";
  const issued = new Date().toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  const qrSvg = buildQrSvg(verificationUrl, 154);

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>NoLSAF Driver ID - ${escapeHtml(name)}</title>
  <style>
    @page { size: 85.6mm 53.98mm; margin: 0; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #eef5f4; font-family: Arial, sans-serif; color: #fff; }
    .document { display: grid; gap: 8mm; padding: 8mm; }
    .card { position: relative; width: 85.6mm; height: 53.98mm; overflow: hidden; background: linear-gradient(135deg, #123447, #1f6670 58%, #2f7e88); box-shadow: 0 24px 70px rgba(15, 23, 42, 0.24); page-break-inside: avoid; }
    .seal { position: absolute; left: 7mm; bottom: 5mm; width: 32mm; height: 32mm; border: .45mm solid rgba(16,185,129,.10); border-radius: 50%; color: rgba(255,255,255,.045); display: grid; place-items: center; font-size: 19mm; font-weight: 900; letter-spacing: -.08em; }
    .logo-seal { position: absolute; right: 22mm; bottom: 8mm; width: 28mm; height: 31mm; opacity: .045; }
    .micro-border { position: absolute; inset: 2.5mm; border: .2mm solid rgba(255,255,255,.08); border-radius: 3mm; }
    .gridlines { position: absolute; inset: 0; background-image: linear-gradient(35deg, rgba(255,255,255,.028) 1px, transparent 1px); background-size: 11px 11px; opacity: .24; }
    .content { position: relative; z-index: 1; height: 100%; display: grid; grid-template-columns: 22mm 1fr 22mm; gap: 3mm; padding: 5mm 4mm 8mm 5mm; }
    .avatar { width: 18mm; height: 18mm; border-radius: 999px; overflow: hidden; display: grid; place-items: center; border: 1.1mm solid rgba(16, 185, 129, 0.75); background: rgba(255,255,255,0.12); font-size: 23px; font-weight: 900; margin-top: 4mm; }
    .avatar img { width: 100%; height: 100%; object-fit: cover; }
    .brand { font-size: 7px; letter-spacing: 0.28em; text-transform: uppercase; color: rgba(255,255,255,0.58); font-weight: 900; }
    h1 { margin: 3.2mm 0 1mm; max-width: 34mm; font-size: 15px; line-height: 1.05; text-transform: uppercase; letter-spacing: .02em; }
    .cert { color: #34d399; font-size: 6px; letter-spacing: 0.16em; text-transform: uppercase; font-weight: 900; }
    .facts { display: grid; grid-template-columns: 1fr 1fr; gap: 1.6mm 3mm; margin-top: 3.2mm; }
    .label { color: rgba(255,255,255,0.44); font-size: 5px; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 800; }
    .value { margin-top: .55mm; color: white; font-size: 6.8px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .qr { align-self: start; justify-self: end; width: 20mm; padding: 1.3mm; background: #fff; border-radius: 2mm; }
    .qr svg { width: 100%; height: auto; display: block; }
    .scan { margin-top: 1.2mm; color: rgba(255,255,255,.68); text-align: center; font-size: 5.5px; font-weight: 800; text-transform: uppercase; letter-spacing: .12em; }
    .footer { position: absolute; left: 5mm; right: 4mm; bottom: 2.2mm; display: flex; align-items: center; justify-content: space-between; color: rgba(255,255,255,0.56); font-size: 5.2px; }
    .back-content { position: relative; z-index: 1; height: 100%; display: grid; grid-template-rows: 1fr auto; gap: 3mm; padding: 6mm 6mm 4mm; }
    .back-copy { display: grid; gap: 2.4mm; color: rgba(255,255,255,.82); font-size: 7.4px; line-height: 1.42; font-weight: 700; text-align: center; align-self: center; }
    .back-copy strong { color: #fff; font-size: 8.2px; text-transform: uppercase; letter-spacing: .08em; }
    .back-divider { width: 34mm; height: .25mm; margin: .3mm auto; background: rgba(255,255,255,.24); }
    .notice { border-top: .25mm solid rgba(255,255,255,.14); padding-top: 2mm; color: rgba(255,255,255,.72); font-size: 6px; line-height: 1.35; font-weight: 700; }
  </style>
</head>
<body>
  <main class="document">
    <section class="card">
      <div class="seal">NS</div>
      <svg class="logo-seal" viewBox="285 175 235 260" fill="none" aria-hidden="true"><path fill="#ffffff" d="${NOLSAF_LOGO_PATH}" /></svg>
      <div class="gridlines"></div>
      <div class="micro-border"></div>
      <div class="content">
        <div class="avatar">${profile.avatarUrl ? `<img src="${escapeHtml(profile.avatarUrl)}" alt="Driver photo" />` : escapeHtml(name[0] || "D")}</div>
        <div>
          <div class="brand">NoLSAF</div>
          <h1>${escapeHtml(name)}</h1>
          <div class="cert">${profile.isVipDriver ? "Premium Driver" : "Certified Driver"}</div>
          <div class="facts">
            <div><div class="label">ID No.</div><div class="value">${escapeHtml(idNo)}</div></div>
            <div><div class="label">Plate</div><div class="value">${escapeHtml(plate)}</div></div>
            <div><div class="label">Vehicle</div><div class="value">${escapeHtml(vehicle)}</div></div>
            <div><div class="label">Area</div><div class="value">${escapeHtml(area)}</div></div>
            <div><div class="label">Issued</div><div class="value">${escapeHtml(issued)}</div></div>
            <div><div class="label">Valid until</div><div class="value">${escapeHtml(formatDate(licenseExpiry))}</div></div>
          </div>
        </div>
        <div>
          <div class="qr">${qrSvg}</div>
          <div class="scan">Scan to verify</div>
        </div>
      </div>
      <div class="footer"><span>Official Driver ID</span><strong>${escapeHtml(idNo)}</strong></div>
    </section>
    <section class="card">
      <div class="seal">NS</div>
      <div class="gridlines"></div>
      <div class="back-content">
        <div class="back-copy">
          <strong>Present this card before every route.</strong>
          <span>Show this Driver ID to the Traveller before the trip starts for identification and verification.</span>
          <span>Some Travellers may scan the front QR to confirm that your driver status, profile, vehicle, and license validity match NoLSAF records.</span>
          <div class="back-divider"></div>
          <span>If found, return to NoLSAF support or report through the official NoLSAF APP.</span>
        </div>
        <div class="notice">
          This card is property of NoLSAF and must not be transferred, copied, or altered.
        </div>
      </div>
    </section>
  </main>
</body>
</html>`;
}

export function ProfileScreen({ navigation }: Props) {
  const { token, user, signOut } = useAuth();
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [personal, setPersonal] = useState({
    fullName: "",
    name: "",
    phone: "",
    email: "",
    nationality: "",
    gender: "",
    dateOfBirth: "",
    region: "",
    district: ""
  });
  const [savingPersonal, setSavingPersonal] = useState(false);
  const [personalMessage, setPersonalMessage] = useState<string | null>(null);

  const [driving, setDriving] = useState({
    vehicleType: "",
    vehicleMake: "",
    vehiclePlate: "",
    plateNumber: "",
    licenseNumber: "",
    nin: "",
    operationArea: "",
    paymentPhone: ""
  });
  const [savingDriving, setSavingDriving] = useState(false);
  const [drivingMessage, setDrivingMessage] = useState<string | null>(null);

  const [payout, setPayout] = useState({
    bankAccountName: "",
    bankName: "",
    bankAccountNumber: "",
    bankBranch: "",
    mobileMoneyProvider: "",
    mobileMoneyNumber: "",
    payoutPreferred: "" as "" | "BANK" | "MOBILE_MONEY"
  });
  const [savingPayout, setSavingPayout] = useState(false);
  const [payoutMessage, setPayoutMessage] = useState<string | null>(null);

  const [avatarUploading, setAvatarUploading] = useState(false);
  const [documentUploading, setDocumentUploading] = useState<DocumentType | null>(null);
  const [licenseExpiresOn, setLicenseExpiresOn] = useState("");
  const [deleteStep, setDeleteStep] = useState<null | "confirm" | "verify">(null);
  const [deleteNameInput, setDeleteNameInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showIdCard, setShowIdCard] = useState(false);
  const [idCardSide, setIdCardSide] = useState<"front" | "back">("front");
  const [sharingIdCard, setSharingIdCard] = useState(false);
  const [idCardError, setIdCardError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setError("Please sign in to view your profile.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [profileRes, paymentRes] = await Promise.all([fetchProfile(token), fetchPaymentMethods(token)]);
      setProfile(profileRes);
      setLicenseExpiresOn(toDateInputValue(getLicenseExpiry(profileRes)));
      const p = paymentRes.data.payout ?? {};
      const profilePayout = ((profileRes as any).payout && typeof (profileRes as any).payout === "object" ? (profileRes as any).payout : {}) as Record<string, any>;
      const extras = {
        ...(profilePayout.profileExtras && typeof profilePayout.profileExtras === "object" ? profilePayout.profileExtras : {}),
        ...(p.profileExtras && typeof p.profileExtras === "object" ? p.profileExtras : {})
      } as Record<string, unknown>;
      setPersonal({
        fullName: firstText(profileRes.fullName, extras.fullName, profileRes.name),
        name: firstText(profileRes.name, extras.name, profileRes.fullName),
        phone: firstText(profileRes.phone, extras.phone),
        email: firstText(profileRes.email, extras.email),
        nationality: firstText(profileRes.nationality, extras.nationality),
        gender: firstText(profileRes.gender, extras.gender),
        dateOfBirth: dateInputFromValue(profileRes.dateOfBirth ?? extras.dateOfBirth),
        region: firstText(profileRes.region, extras.region, profileRes.operationArea, extras.operationArea),
        district: firstText(profileRes.district, extras.district)
      });
      setDriving({
        vehicleType: firstText(profileRes.vehicleType, extras.vehicleType),
        vehicleMake: firstText(profileRes.vehicleMake, extras.vehicleMake),
        vehiclePlate: firstText(profileRes.vehiclePlate, profileRes.plateNumber, extras.vehiclePlate, extras.plateNumber),
        plateNumber: firstText(profileRes.plateNumber, profileRes.vehiclePlate, extras.plateNumber, extras.vehiclePlate),
        licenseNumber: firstText(profileRes.licenseNumber, extras.licenseNumber),
        nin: firstText(profileRes.nin, extras.nin),
        operationArea: firstText(profileRes.operationArea, extras.operationArea, profileRes.region, extras.region),
        paymentPhone: firstText(profileRes.paymentPhone, extras.paymentPhone, p.mobileMoneyNumber)
      });
      setPayout({
        bankAccountName: p.bankAccountName || "",
        bankName: p.bankName || "",
        bankAccountNumber: p.bankAccountNumber || "",
        bankBranch: p.bankBranch || "",
        mobileMoneyProvider: p.mobileMoneyProvider || "",
        mobileMoneyNumber: p.mobileMoneyNumber || "",
        payoutPreferred: p.payoutPreferred || ""
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load your profile.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function savePersonal() {
    if (!token) return;
    setSavingPersonal(true);
    setPersonalMessage(null);
    try {
      await updateDriverProfile(token, {
        fullName: personal.fullName || null,
        name: personal.name || null,
        phone: personal.phone || null,
        email: personal.email || null,
        nationality: personal.nationality || null,
        gender: personal.gender || null,
        dateOfBirth: personal.dateOfBirth || null,
        region: personal.region || null,
        district: personal.district || null
      });
      setPersonalMessage("Saved.");
    } catch (e) {
      setPersonalMessage(e instanceof Error ? e.message : "Could not save your details.");
    } finally {
      setSavingPersonal(false);
    }
  }

  async function saveDriving() {
    if (!token) return;
    setSavingDriving(true);
    setDrivingMessage(null);
    try {
      await updateDriverProfile(token, {
        vehicleType: driving.vehicleType || null,
        vehicleMake: driving.vehicleMake || null,
        vehiclePlate: driving.vehiclePlate || null,
        plateNumber: driving.plateNumber || null,
        licenseNumber: driving.licenseNumber || null,
        nin: driving.nin || null,
        operationArea: driving.operationArea || null,
        paymentPhone: driving.paymentPhone || null
      });
      setDrivingMessage("Saved.");
    } catch (e) {
      setDrivingMessage(e instanceof Error ? e.message : "Could not save your driving details.");
    } finally {
      setSavingDriving(false);
    }
  }

  async function savePayout() {
    if (!token) return;
    setSavingPayout(true);
    setPayoutMessage(null);
    try {
      await updatePayoutDetails(token, {
        bankAccountName: payout.bankAccountName || null,
        bankName: payout.bankName || null,
        bankAccountNumber: payout.bankAccountNumber || null,
        bankBranch: payout.bankBranch || null,
        mobileMoneyProvider: payout.mobileMoneyProvider || null,
        mobileMoneyNumber: payout.mobileMoneyNumber || null,
        ...(payout.payoutPreferred ? { payoutPreferred: payout.payoutPreferred } : {})
      });
      setPayoutMessage("Saved.");
    } catch (e) {
      setPayoutMessage(e instanceof Error ? e.message : "Could not save your payout details.");
    } finally {
      setSavingPayout(false);
    }
  }

  async function handlePickAvatar() {
    if (!token) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8
    });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    setAvatarUploading(true);
    try {
      const upload = await uploadFile(
        token,
        { uri: asset.uri, name: asset.fileName || "avatar.jpg", type: asset.mimeType || "image/jpeg" },
        "avatars"
      );
      await updateDriverProfile(token, { avatarUrl: upload.secure_url });
      setProfile((prev) => (prev ? { ...prev, avatarUrl: upload.secure_url } : prev));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not upload your photo.");
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handlePickDocument(type: DocumentType) {
    if (!token) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8
    });
    if (result.canceled || !result.assets?.length) return;
    if (type === "DRIVER_LICENSE") {
      const expiry = new Date(`${licenseExpiresOn}T23:59:59.999Z`);
      if (!licenseExpiresOn || Number.isNaN(expiry.getTime())) {
        setError("Enter your driving license expiry date before uploading the license.");
        return;
      }
      if (expiry.getTime() < Date.now()) {
        setError("Driving license expiry date must be in the future.");
        return;
      }
    }
    const asset = result.assets[0];
    setDocumentUploading(type);
    try {
      const upload = await uploadFile(
        token,
        { uri: asset.uri, name: asset.fileName || `${type.toLowerCase()}.jpg`, type: asset.mimeType || "image/jpeg" },
        "driver-documents"
      );
      const metadata =
        type === "DRIVER_LICENSE"
          ? {
              expiresOn: licenseExpiresOn,
              expiresAt: new Date(`${licenseExpiresOn}T23:59:59.999Z`).toISOString(),
              uploadedAt: new Date().toISOString()
            }
          : { uploadedAt: new Date().toISOString() };
      const response = await updateDocument(token, { type, url: upload.secure_url, metadata });
      setProfile((prev) => {
        if (!prev) return prev;
        const documents = (prev.documents || []).filter((d) => d.type !== type);
        documents.push(response.data.doc);
        return { ...prev, documents };
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not upload your document.");
    } finally {
      setDocumentUploading(null);
    }
  }

  function closeDeleteFlow() {
    setDeleteStep(null);
    setDeleteNameInput("");
  }

  async function confirmDeleteAccount() {
    if (!token) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccount(token);
      await signOut();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Could not delete your account.");
      closeDeleteFlow();
    } finally {
      setDeleting(false);
    }
  }

  const registeredName = (profile?.fullName || profile?.name || user?.fullName || user?.name || "").trim();
  const licenseExpiry = profile ? getLicenseExpiry(profile) : null;
  const verificationUrl = profile ? getVerificationUrl(profile) : "";
  const missingIdCardItems = profile ? getMissingIdCardItems(profile, licenseExpiry) : [];
  const idCardReady = profile ? missingIdCardItems.length === 0 : false;

  async function shareDriverIdCard() {
    if (!profile) return;
    setIdCardError(null);
    setSharingIdCard(true);
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        setIdCardError("Sharing is not available on this device.");
        return;
      }
      if (!licenseExpiry) {
        setIdCardError("Driving license expiry date is required before downloading the ID card.");
        return;
      }
      if (isExpired(licenseExpiry)) {
        setIdCardError("Your driving license has expired. Upload a renewed license before downloading the ID card.");
        return;
      }
      const file = new File(Paths.cache, `nolsaf-driver-id-${profile.id}.html`);
      file.write(buildDriverIdHtml(profile, licenseExpiry, verificationUrl));
      await Sharing.shareAsync(file.uri, {
        dialogTitle: "Download NoLSAF Driver ID",
        mimeType: "text/html"
      });
    } catch (e) {
      setIdCardError(e instanceof Error ? e.message : "Could not download this ID card.");
    } finally {
      setSharingIdCard(false);
    }
  }

  return (
    <View style={styles.root}>
      <View style={styles.headerRow}>
        <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft color={colors.ink} size={22} />
        </Pressable>
        <AppText variant="title" weight="bold">
          Profile
        </AppText>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <StateView title="Loading your profile" message="Fetching your profile details." />
        ) : error ? (
          <StateView title="Could not load profile" message={error} actionLabel="Try again" onAction={() => load()} />
        ) : profile ? (
          <AppStack gap={4}>
            <AppCard>
              <View style={styles.avatarRow}>
                <Pressable accessibilityRole="button" onPress={handlePickAvatar} style={styles.avatar}>
                  {profile.avatarUrl ? (
                    <View style={styles.avatarImageWrap}>
                      <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImage} />
                    </View>
                  ) : (
                    <UserCircle color={colors.primary} size={36} />
                  )}
                </Pressable>
                <View style={styles.identity}>
                  <AppText variant="title" weight="bold">
                    {profile.fullName || profile.name || "Driver"}
                  </AppText>
                  <AppText variant="bodySmall" tone="muted">
                    {profile.email}
                  </AppText>
                </View>
              </View>
              <AppButton
                title={avatarUploading ? "Uploading photo..." : "Change photo"}
                variant="secondary"
                loading={avatarUploading}
                onPress={handlePickAvatar}
              />
            </AppCard>

            <AppCard>
              <AppStack gap={4}>
                <View style={styles.idCardHeader}>
                  <View style={styles.idCardIcon}>
                    <IdCard color={colors.primary} size={22} />
                  </View>
                  <View style={styles.identity}>
                    <View style={styles.idCardTitleRow}>
                      <AppText variant="titleSm" weight="bold" style={styles.idCardTitle}>
                        Driver ID card
                      </AppText>
                      <View style={[styles.idCardStatusPill, idCardReady ? styles.idCardStatusReady : styles.idCardStatusBlocked]}>
                        <AppText variant="caption" weight="extraBold" style={idCardReady ? styles.idCardStatusReadyText : styles.idCardStatusBlockedText}>
                          {idCardReady ? "READY" : "LOCKED"}
                        </AppText>
                      </View>
                    </View>
                    <AppText variant="bodySmall" tone="muted" style={styles.idCardSubtitle}>
                      Official NoLSAF ID with QR verification and license-based validity.
                    </AppText>
                  </View>
                </View>
                {idCardReady ? (
                  <View style={styles.idReadyBox}>
                    <View style={styles.idReadyDot} />
                    <AppText variant="caption" weight="semiBold" style={styles.idReadyText}>
                      Valid until {formatDate(licenseExpiry)}
                    </AppText>
                  </View>
                ) : (
                  <View style={styles.missingBox}>
                    <View style={styles.missingHeader}>
                      <AlertCircle color="#b45309" size={16} />
                      <AppText variant="caption" weight="extraBold" style={styles.missingTitle}>
                        Complete before download
                      </AppText>
                    </View>
                    <View style={styles.missingChips}>
                      {missingIdCardItems.slice(0, 4).map((item) => (
                        <View key={item} style={styles.missingChip}>
                          <AppText variant="caption" weight="semiBold" style={styles.missingChipText} numberOfLines={1}>
                            {item}
                          </AppText>
                        </View>
                      ))}
                      {missingIdCardItems.length > 4 ? (
                        <View style={styles.missingChipMore}>
                          <AppText variant="caption" weight="extraBold" style={styles.missingChipMoreText}>
                            +{missingIdCardItems.length - 4}
                          </AppText>
                        </View>
                      ) : null}
                    </View>
                  </View>
                )}
                <View style={styles.idCardActions}>
                  <View style={styles.idCardAction}>
                    <AppButton
                      title="Preview ID"
                      variant="secondary"
                      onPress={() => {
                        setIdCardSide("front");
                        setShowIdCard(true);
                      }}
                    />
                  </View>
                  <View style={styles.idCardAction}>
                    <AppButton
                      title="Download ID"
                      icon={<Download color={colors.white} size={18} />}
                      disabled={!idCardReady}
                      loading={sharingIdCard}
                      onPress={shareDriverIdCard}
                    />
                  </View>
                </View>
                {idCardError ? (
                  <AppText variant="caption" tone="danger">
                    {idCardError}
                  </AppText>
                ) : null}
              </AppStack>
            </AppCard>

            <AppCard>
              <AppStack gap={3}>
                <AppText variant="titleSm" weight="bold">
                  Personal details
                </AppText>
                <AppInput label="Full name" value={personal.fullName} onChangeText={(v) => setPersonal((s) => ({ ...s, fullName: v }))} />
                <AppInput label="Display name" value={personal.name} onChangeText={(v) => setPersonal((s) => ({ ...s, name: v }))} />
                <AppInput label="Phone" value={personal.phone} onChangeText={(v) => setPersonal((s) => ({ ...s, phone: v }))} keyboardType="phone-pad" />
                <AppInput label="Email" value={personal.email} onChangeText={(v) => setPersonal((s) => ({ ...s, email: v }))} keyboardType="email-address" autoCapitalize="none" />
                <AppInput label="Nationality" value={personal.nationality} onChangeText={(v) => setPersonal((s) => ({ ...s, nationality: v }))} />
                <AppInput label="Gender" value={personal.gender} onChangeText={(v) => setPersonal((s) => ({ ...s, gender: v }))} />
                <AppInput label="Date of birth" value={personal.dateOfBirth} onChangeText={(v) => setPersonal((s) => ({ ...s, dateOfBirth: v }))} placeholder="YYYY-MM-DD" />
                <AppInput label="Region" value={personal.region} onChangeText={(v) => setPersonal((s) => ({ ...s, region: v }))} />
                <AppInput label="District" value={personal.district} onChangeText={(v) => setPersonal((s) => ({ ...s, district: v }))} />
                <AppButton title="Save personal details" loading={savingPersonal} onPress={savePersonal} />
                {personalMessage ? (
                  <AppText variant="caption" tone={personalMessage === "Saved." ? "muted" : "danger"}>
                    {personalMessage}
                  </AppText>
                ) : null}
              </AppStack>
            </AppCard>

            <AppCard>
              <AppStack gap={3}>
                <AppText variant="titleSm" weight="bold">
                  Driving details
                </AppText>
                <AppInput label="Vehicle type" value={driving.vehicleType} onChangeText={(v) => setDriving((s) => ({ ...s, vehicleType: v }))} />
                <AppInput label="Vehicle make" value={driving.vehicleMake} onChangeText={(v) => setDriving((s) => ({ ...s, vehicleMake: v }))} />
                <AppInput label="Vehicle plate" value={driving.vehiclePlate} onChangeText={(v) => setDriving((s) => ({ ...s, vehiclePlate: v }))} />
                <AppInput label="Plate number" value={driving.plateNumber} onChangeText={(v) => setDriving((s) => ({ ...s, plateNumber: v }))} />
                <AppInput label="License number" value={driving.licenseNumber} onChangeText={(v) => setDriving((s) => ({ ...s, licenseNumber: v }))} />
                <AppInput label="NIN" value={driving.nin} onChangeText={(v) => setDriving((s) => ({ ...s, nin: v }))} />
                <AppInput label="Operation area" value={driving.operationArea} onChangeText={(v) => setDriving((s) => ({ ...s, operationArea: v }))} />
                <AppInput label="Payment phone" value={driving.paymentPhone} onChangeText={(v) => setDriving((s) => ({ ...s, paymentPhone: v }))} keyboardType="phone-pad" />
                <AppButton title="Save driving details" loading={savingDriving} onPress={saveDriving} />
                {drivingMessage ? (
                  <AppText variant="caption" tone={drivingMessage === "Saved." ? "muted" : "danger"}>
                    {drivingMessage}
                  </AppText>
                ) : null}
              </AppStack>
            </AppCard>

            <AppCard>
              <AppStack gap={3}>
                <AppText variant="titleSm" weight="bold">
                  Payout details
                </AppText>
                <View style={styles.toggleRow}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setPayout((s) => ({ ...s, payoutPreferred: "BANK" }))}
                    style={[styles.toggle, payout.payoutPreferred === "BANK" && styles.toggleActive]}
                  >
                    <AppText variant="caption" weight="bold" tone={payout.payoutPreferred === "BANK" ? "inverse" : "muted"}>
                      Bank
                    </AppText>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setPayout((s) => ({ ...s, payoutPreferred: "MOBILE_MONEY" }))}
                    style={[styles.toggle, payout.payoutPreferred === "MOBILE_MONEY" && styles.toggleActive]}
                  >
                    <AppText variant="caption" weight="bold" tone={payout.payoutPreferred === "MOBILE_MONEY" ? "inverse" : "muted"}>
                      Mobile money
                    </AppText>
                  </Pressable>
                </View>
                <AppInput label="Bank account name" value={payout.bankAccountName} onChangeText={(v) => setPayout((s) => ({ ...s, bankAccountName: v }))} />
                <AppInput label="Bank name" value={payout.bankName} onChangeText={(v) => setPayout((s) => ({ ...s, bankName: v }))} />
                <AppInput label="Bank account number" value={payout.bankAccountNumber} onChangeText={(v) => setPayout((s) => ({ ...s, bankAccountNumber: v }))} />
                <AppInput label="Bank branch" value={payout.bankBranch} onChangeText={(v) => setPayout((s) => ({ ...s, bankBranch: v }))} />
                <AppInput label="Mobile money provider" value={payout.mobileMoneyProvider} onChangeText={(v) => setPayout((s) => ({ ...s, mobileMoneyProvider: v }))} />
                <AppInput label="Mobile money number" value={payout.mobileMoneyNumber} onChangeText={(v) => setPayout((s) => ({ ...s, mobileMoneyNumber: v }))} keyboardType="phone-pad" />
                <AppButton title="Save payout details" loading={savingPayout} onPress={savePayout} />
                {payoutMessage ? (
                  <AppText variant="caption" tone={payoutMessage === "Saved." ? "muted" : "danger"}>
                    {payoutMessage}
                  </AppText>
                ) : null}
              </AppStack>
            </AppCard>

            <AppCard>
              <AppStack gap={3}>
                <AppText variant="titleSm" weight="bold">
                  Documents
                </AppText>
                {DOCUMENT_TYPES.map(({ type, label }) => {
                  const doc = profile.documents?.find((d) => d.type === type);
                  return (
                    <View key={type} style={styles.documentRow}>
                      <View style={styles.documentInfo}>
                        <AppText variant="bodySmall" weight="bold">
                          {label}
                        </AppText>
                        {doc ? (
                          <StatusBadge status={DOCUMENT_STATUS_TONE[doc.status]} label={doc.status} />
                        ) : (
                          <AppText variant="caption" tone="muted">
                            Not uploaded
                          </AppText>
                        )}
                        {doc?.reason ? (
                          <AppText variant="caption" tone="danger">
                            {doc.reason}
                          </AppText>
                        ) : null}
                        {type === "DRIVER_LICENSE" && getDocumentExpiryDate(doc) ? (
                          <AppText variant="caption" tone={isExpired(getDocumentExpiryDate(doc)) ? "danger" : "muted"}>
                            Expires {formatDate(getDocumentExpiryDate(doc))}
                          </AppText>
                        ) : null}
                      </View>
                      <AppButton
                        title={doc ? "Replace" : "Upload"}
                        variant="secondary"
                        loading={documentUploading === type}
                        onPress={() => handlePickDocument(type)}
                      />
                    </View>
                  );
                })}
                <AppInput
                  label="Driving license expiry date"
                  value={licenseExpiresOn}
                  onChangeText={setLicenseExpiresOn}
                  placeholder="YYYY-MM-DD"
                />
              </AppStack>
            </AppCard>

            <AppCard tone="warning">
              <AppStack gap={3}>
                <AppText variant="titleSm" weight="bold">
                  Delete account
                </AppText>
                <AppText variant="bodySmall" tone="muted">
                  This permanently deletes your NoLSAF driver account. You cannot do this while you have a trip in progress.
                </AppText>
                <AppButton title="Delete my account" variant="danger" onPress={() => setDeleteStep("confirm")} />
                {deleteError ? (
                  <AppText variant="caption" tone="danger">
                    {deleteError}
                  </AppText>
                ) : null}
              </AppStack>
            </AppCard>
          </AppStack>
        ) : null}
      </ScrollView>

      <Modal visible={deleteStep !== null} transparent animationType="fade" onRequestClose={closeDeleteFlow}>
        <View style={deleteStyles.overlay}>
          <View style={deleteStyles.sheet}>
            {deleteStep === "confirm" ? (
              <AppStack gap={4}>
                <View style={deleteStyles.iconCircle}>
                  <Trash2 color={colors.danger} size={20} />
                </View>
                <AppStack gap={1}>
                  <AppText variant="title" weight="bold" style={deleteStyles.center}>
                    Delete your account?
                  </AppText>
                  <AppText variant="bodySmall" tone="muted" style={deleteStyles.center}>
                    This action is permanent and irreversible. Before you continue, understand what will be lost.
                  </AppText>
                </AppStack>
                <View style={deleteStyles.warningBox}>
                  <AppStack gap={2}>
                    {[
                      "Your driver profile, ratings, and trip history will be permanently deleted.",
                      "Pending payouts or outstanding balances may be forfeited.",
                      "Any active bookings linked to your account will be cancelled.",
                      "You will lose access immediately. No recovery is possible."
                    ].map((item) => (
                      <View key={item} style={deleteStyles.warningRow}>
                        <AlertCircle color={colors.danger} size={14} />
                        <AppText variant="caption" tone="danger" style={deleteStyles.warningText}>
                          {item}
                        </AppText>
                      </View>
                    ))}
                  </AppStack>
                </View>
                <AppStack gap={2}>
                  <AppButton title="Yes, continue" variant="danger" onPress={() => setDeleteStep("verify")} />
                  <AppButton title="No, keep my account" variant="ghost" onPress={closeDeleteFlow} />
                </AppStack>
              </AppStack>
            ) : deleteStep === "verify" ? (
              <AppStack gap={4}>
                <Pressable accessibilityRole="button" onPress={() => setDeleteStep("confirm")} style={deleteStyles.backRow}>
                  <ArrowLeft color={colors.mutedText} size={16} />
                  <AppText variant="caption" weight="bold" tone="muted">
                    Back
                  </AppText>
                </Pressable>
                <View style={deleteStyles.iconCircle}>
                  <Shield color={colors.danger} size={20} />
                </View>
                <AppStack gap={1}>
                  <AppText variant="title" weight="bold" style={deleteStyles.center}>
                    Final confirmation
                  </AppText>
                  <AppText variant="bodySmall" tone="muted" style={deleteStyles.center}>
                    Type your full name exactly as registered to confirm deletion.
                  </AppText>
                </AppStack>
                <View style={deleteStyles.nameBox}>
                  <AppText variant="bodySmall" weight="bold" style={deleteStyles.center}>
                    {registeredName || "Not set"}
                  </AppText>
                </View>
                <AppInput
                  label="Your full name"
                  placeholder="Type your full name"
                  value={deleteNameInput}
                  onChangeText={setDeleteNameInput}
                  autoCapitalize="words"
                  autoCorrect={false}
                  autoFocus
                />
                <AppButton
                  title="Permanently delete my account"
                  variant="danger"
                  loading={deleting}
                  disabled={!registeredName || deleteNameInput.trim() !== registeredName}
                  onPress={confirmDeleteAccount}
                />
                <AppText variant="caption" tone="muted" style={deleteStyles.center}>
                  This cannot be undone.
                </AppText>
                {deleteError ? (
                  <AppText variant="caption" tone="danger" style={deleteStyles.center}>
                    {deleteError}
                  </AppText>
                ) : null}
              </AppStack>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal visible={showIdCard && Boolean(profile)} transparent animationType="fade" onRequestClose={() => setShowIdCard(false)}>
        <View style={idStyles.overlay}>
          <View style={idStyles.sheet}>
            <View style={idStyles.modalHeader}>
              <AppText variant="titleSm" weight="bold" tone="inverse">
                NoLSAF Driver ID
              </AppText>
              <Pressable accessibilityRole="button" onPress={() => setShowIdCard(false)} style={idStyles.closeButton}>
                <X color={colors.white} size={20} />
              </Pressable>
            </View>
            <View style={idStyles.sideTabs}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={idCardSide === "front" ? "Show back side" : "Show front side"}
                onPress={() => setIdCardSide((side) => (side === "front" ? "back" : "front"))}
                style={idStyles.sideToggle}
              >
                {idCardSide === "front" ? <ChevronRight color={colors.white} size={24} /> : <ChevronLeft color={colors.white} size={24} />}
              </Pressable>
            </View>
            {profile ? <DriverIdCardPreview profile={profile} licenseExpiry={licenseExpiry} verificationUrl={verificationUrl} side={idCardSide} /> : null}
            <AppStack gap={2}>
              <AppButton title="Download ID card" icon={<Download color={colors.white} size={18} />} disabled={!idCardReady} loading={sharingIdCard} onPress={shareDriverIdCard} />
              {!idCardReady ? (
                <AppText variant="caption" tone="inverse" style={idStyles.center}>
                  Complete the missing profile details before downloading.
                </AppText>
              ) : null}
              {idCardError ? (
                <AppText variant="caption" tone="inverse" style={idStyles.center}>
                  {idCardError}
                </AppText>
              ) : null}
            </AppStack>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function DriverIdCardPreview({
  profile,
  licenseExpiry,
  verificationUrl,
  side = "front"
}: {
  profile: DriverProfile;
  licenseExpiry: Date | null;
  verificationUrl: string;
  side?: "front" | "back";
}) {
  const name = profile.fullName || profile.name || "Driver";
  const vehicle = [profile.vehicleMake, profile.vehicleType].filter(Boolean).join(" / ");
  const area = profile.operationArea || profile.region || profile.district || "Tanzania";
  const plate = profile.plateNumber || profile.vehiclePlate;
  const idNo = driverIdNumber(profile, licenseExpiry);

  if (side === "back") {
    return (
      <View style={idStyles.card}>
        <View style={idStyles.securitySeal} pointerEvents="none">
          <AppText variant="title" weight="extraBold" tone="inverse" style={idStyles.securitySealText}>
            NS
          </AppText>
        </View>
        <View style={idStyles.cardBack}>
          <View style={idStyles.backCopy}>
            <AppText variant="caption" weight="extraBold" tone="inverse" style={idStyles.backCopyTitle}>
              Present this card before every route.
            </AppText>
            <AppText variant="caption" tone="inverse" style={idStyles.backCopyText}>
              Show this Driver ID to the Traveller before the trip starts for identification and verification.
            </AppText>
            <AppText variant="caption" tone="inverse" style={idStyles.backCopyText}>
              Some Travellers may scan the front QR to confirm that your driver status, profile, vehicle, and license validity match NoLSAF records.
            </AppText>
            <View style={idStyles.backCopyDivider} />
            <AppText variant="caption" tone="inverse" style={idStyles.backCopyText}>
              If found, return to NoLSAF support or report through the official NoLSAF APP.
            </AppText>
          </View>
          <View style={idStyles.backNotice}>
            <AppText variant="caption" weight="bold" tone="inverse" style={idStyles.backNoticeText}>
              This card is property of NoLSAF and must not be transferred, copied, or altered.
            </AppText>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={idStyles.card}>
      <View style={idStyles.frontLogoSeal} pointerEvents="none">
        <NolsafLogoMark color={colors.white} width={108} height={120} opacity={0.045} />
      </View>
      <View style={idStyles.frontMicroBorder} pointerEvents="none" />
      <View style={idStyles.cardTop}>
        <View style={idStyles.photo}>
          {profile.avatarUrl ? (
            <Image source={{ uri: profile.avatarUrl }} style={idStyles.photoImage} />
          ) : (
            <AppText variant="title" weight="extraBold" tone="inverse">
              {(name[0] || "D").toUpperCase()}
            </AppText>
          )}
        </View>
        <View style={idStyles.cardIdentity}>
          <AppText variant="caption" weight="extraBold" tone="inverse" style={idStyles.brandText}>
            NoLSAF
          </AppText>
          <AppText variant="titleSm" weight="extraBold" tone="inverse" numberOfLines={2} style={idStyles.driverName}>
            {name}
          </AppText>
          <AppText variant="caption" weight="bold" tone="inverse" style={idStyles.certText}>
            {profile.isVipDriver ? "Premium Driver" : "Certified Driver"}
          </AppText>
        </View>
        <View style={idStyles.qrWrap}>
          <QrCodeGraphic value={verificationUrl || idNo} />
          <AppText variant="caption" weight="bold" style={idStyles.qrLabel}>
            SCAN
          </AppText>
        </View>
      </View>
      <View style={idStyles.cardGrid}>
        <IdField label="ID No." value={idNo} />
        <IdField label="Plate No." value={plate} />
        <IdField label="Vehicle" value={vehicle} />
        <IdField label="Area" value={area} />
        <IdField label="Issued" value={formatDate(new Date())} />
        <IdField label="Valid until" value={formatDate(licenseExpiry)} />
      </View>
      <View style={idStyles.cardFooter}>
        <AppText variant="caption" weight="bold" tone="inverse" style={idStyles.footerText}>
          Official Driver ID
        </AppText>
        <AppText variant="caption" weight="bold" tone="inverse" style={idStyles.footerText}>
          Verify live by QR
        </AppText>
      </View>
    </View>
  );
}

function QrCodeGraphic({ value }: { value: string }) {
  const qr = QRCode.create(value || "NOLSAF", { errorCorrectionLevel: "M" });
  const size = qr.modules.size;
  const quiet = 4;
  const viewBoxSize = size + quiet * 2;
  const cells = [];
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (qr.modules.get(row, col)) {
        cells.push(<Rect key={`${row}-${col}`} x={col + quiet} y={row + quiet} width={1} height={1} fill="#081827" />);
      }
    }
  }
  return (
    <Svg width={66} height={66} viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}>
      <Rect x={0} y={0} width={viewBoxSize} height={viewBoxSize} fill="#ffffff" />
      {cells}
    </Svg>
  );
}

function IdField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <View style={idStyles.idField}>
      <AppText variant="caption" weight="bold" tone="inverse" style={idStyles.fieldLabel}>
        {label}
      </AppText>
      <AppText variant="caption" weight="extraBold" tone="inverse" numberOfLines={1}>
        {display(value)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4]
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border
  },
  scrollContent: {
    gap: spacing[4],
    padding: spacing[4],
    paddingBottom: spacing[8]
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    marginBottom: spacing[3]
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brand[50]
  },
  avatarImageWrap: {
    alignItems: "center",
    justifyContent: "center"
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: radius.full
  },
  identity: {
    flexShrink: 1,
    minWidth: 0,
    gap: spacing[1]
  },
  idCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[3],
    minWidth: 0
  },
  idCardIcon: {
    width: 46,
    height: 46,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#a7f3d0"
  },
  idCardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[2],
    minWidth: 0
  },
  idCardTitle: {
    flexShrink: 1,
    minWidth: 0
  },
  idCardSubtitle: {
    lineHeight: 20
  },
  idCardStatusPill: {
    flexShrink: 0,
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: spacing[2],
    paddingVertical: 3
  },
  idCardStatusReady: {
    backgroundColor: "#ecfdf5",
    borderColor: "#a7f3d0"
  },
  idCardStatusBlocked: {
    backgroundColor: "#fff7ed",
    borderColor: "#fed7aa"
  },
  idCardStatusReadyText: {
    color: "#047857",
    letterSpacing: 0.8
  },
  idCardStatusBlockedText: {
    color: "#b45309",
    letterSpacing: 0.8
  },
  idReadyBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#a7f3d0",
    backgroundColor: "#ecfdf5",
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3]
  },
  idReadyDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: "#10b981"
  },
  idReadyText: {
    color: "#065f46",
    flex: 1,
    minWidth: 0
  },
  missingBox: {
    gap: spacing[3],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#fde68a",
    backgroundColor: "#fffbeb",
    padding: spacing[3]
  },
  missingHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2]
  },
  missingTitle: {
    color: "#92400e",
    letterSpacing: 0.2
  },
  missingChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[2]
  },
  missingChip: {
    maxWidth: "100%",
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: "#fed7aa",
    backgroundColor: colors.white,
    paddingHorizontal: spacing[2],
    paddingVertical: 5
  },
  missingChipText: {
    color: "#475569"
  },
  missingChipMore: {
    borderRadius: radius.full,
    backgroundColor: "#f59e0b",
    paddingHorizontal: spacing[2],
    paddingVertical: 5
  },
  missingChipMoreText: {
    color: colors.white
  },
  idCardActions: {
    flexDirection: "row",
    gap: spacing[2],
    alignItems: "stretch"
  },
  idCardAction: {
    flex: 1,
    minWidth: 0
  },
  toggleRow: {
    flexDirection: "row",
    gap: spacing[2]
  },
  toggle: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing[2],
    borderRadius: radius.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border
  },
  toggleActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  documentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[3]
  },
  documentInfo: {
    flex: 1,
    minWidth: 0,
    gap: spacing[1]
  }
});

const idStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(2,6,23,0.78)",
    padding: spacing[4]
  },
  sheet: {
    gap: spacing[4],
    borderRadius: radius.xl,
    backgroundColor: "#102f3f",
    padding: spacing[4]
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[3]
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)"
  },
  sideTabs: {
    alignItems: "center",
    justifyContent: "center"
  },
  sideToggle: {
    width: 48,
    height: 38,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(20,184,166,0.32)"
  },
  card: {
    overflow: "hidden",
    borderRadius: 20,
    backgroundColor: "#1f6670",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    aspectRatio: ID_CARD_ASPECT_RATIO
  },
  securitySeal: {
    position: "absolute",
    left: 18,
    bottom: 18,
    width: 116,
    height: 116,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.12)",
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.9
  },
  securitySealText: {
    fontSize: 52,
    letterSpacing: -4,
    opacity: 0.05
  },
  frontLogoSeal: {
    position: "absolute",
    right: 92,
    bottom: 36,
    opacity: 1
  },
  frontMicroBorder: {
    position: "absolute",
    left: 10,
    right: 10,
    top: 10,
    bottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    borderRadius: 15
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    paddingTop: spacing[3],
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[1]
  },
  photo: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 3,
    borderColor: "rgba(16,185,129,0.72)"
  },
  photoImage: {
    width: 64,
    height: 64
  },
  cardIdentity: {
    flex: 1,
    minWidth: 0,
    gap: spacing[1]
  },
  brandText: {
    letterSpacing: 0.7,
    opacity: 0.62
  },
  driverName: {
    fontSize: 23,
    lineHeight: 25,
    letterSpacing: 0,
    marginTop: 2
  },
  certText: {
    color: "#34d399",
    marginTop: 1
  },
  qrWrap: {
    alignItems: "center",
    borderRadius: radius.md,
    backgroundColor: colors.white,
    padding: 4
  },
  qrLabel: {
    color: "#081827",
    letterSpacing: 1.2
  },
  cardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: spacing[3],
    rowGap: spacing[1],
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[1]
  },
  idField: {
    width: "46%",
    gap: spacing[1],
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.12)",
    paddingTop: spacing[1]
  },
  fieldLabel: {
    opacity: 0.5
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "auto",
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[2]
  },
  footerText: {
    opacity: 0.54
  },
  cardBack: {
    flex: 1,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[2],
    justifyContent: "space-between"
  },
  backCopy: {
    gap: spacing[2],
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    paddingHorizontal: spacing[3]
  },
  backCopyTitle: {
    opacity: 0.92,
    letterSpacing: 0.6,
    textTransform: "uppercase"
  },
  backCopyText: {
    opacity: 0.76,
    lineHeight: 18,
    textAlign: "center"
  },
  backCopyDivider: {
    width: 136,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.24)",
    marginVertical: 2
  },
  backNotice: {
    gap: spacing[1],
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.14)",
    paddingTop: spacing[2]
  },
  backNoticeText: {
    opacity: 0.72
  },
  center: {
    textAlign: "center"
  }
});

const deleteStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(2,6,23,0.42)",
    padding: spacing[4]
  },
  sheet: {
    borderRadius: radius.xl,
    backgroundColor: colors.white,
    padding: spacing[5]
  },
  iconCircle: {
    alignSelf: "center",
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca"
  },
  center: {
    textAlign: "center"
  },
  warningBox: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#fecaca",
    backgroundColor: "#fef2f2",
    padding: spacing[3]
  },
  warningRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[2]
  },
  warningText: {
    flex: 1,
    minWidth: 0
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
    alignSelf: "flex-start"
  },
  nameBox: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3]
  }
});
