"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { ArrowLeft, CheckCircle2, AlertCircle, FileText, ShieldCheck, Upload, Loader2, CalendarClock, CalendarDays } from "lucide-react";
import DatePickerField from "@/components/DatePickerField";
import apiClient from "@/lib/apiClient";
import LogoSpinner from "@/components/LogoSpinner";

const api = apiClient;

type ProofPhoto = {
  url: string;
  name?: string;
};

type DocumentProofValue =
  | string
  | {
      url: string;
      status?: string;
      uploadedAt?: string;
      approvedAt?: string;
      expiresOn?: string;
      expiresAt?: string | null;
    };

type OperatorProfile = {
  classifiedPhotos?: Record<string, string[]>;
  documentProofs?: Record<string, DocumentProofValue>;
  [key: string]: any;
};

type AgentMe = {
  ok: boolean;
  agent?: {
    operatorProfile?: OperatorProfile;
  };
};

type CloudinarySig = {
  timestamp: number;
  signature: string;
  folder: string;
  cloudName: string;
  apiKey: string;
};

const REQUIRED_DOCUMENTS = [
  { id: "brela", label: "BRELA Certificate", description: "Business Registration Certificate" },
  { id: "tin", label: "TIN Number", description: "Tax Identification Number Certificate" },
  { id: "license", label: "Tourism License", description: "Valid Tourism Operating License" },
  { id: "business", label: "Business Licence", description: "Business Licence Certificate" },
  { id: "nationalId", label: "National ID / Passport", description: "Representative's National ID or Travel Passport" },
];

const DOCUMENT_TYPE_BY_ID: Record<string, string> = {
  brela: "BRELA_CERTIFICATE",
  tin: "TIN_NUMBER",
  license: "TOURISM_LICENSE",
  business: "BUSINESS_LICENCE",
  nationalId: "NATIONAL_ID_OR_PASSPORT",
};

export default function AgentDocumentsPage() {
  const [loading, setLoading] = useState(true);
  const [proofPhotos, setProofPhotos] = useState<ProofPhoto[]>([]);
  const [operatorProfile, setOperatorProfile] = useState<OperatorProfile>({});
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [selectedDocType, setSelectedDocType] = useState("");
  const [licenseExpiresOn, setLicenseExpiresOn] = useState("");
  const [businessExpiresOn, setBusinessExpiresOn] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPhotos = async () => {
    try {
      const res = await api.get("/api/agent/me", { params: { _t: Date.now() } });
      const data = (res as any)?.data as AgentMe;
      const currentProfile = data?.agent?.operatorProfile ?? {};
      setOperatorProfile(currentProfile);
      const savedLicenseProof = currentProfile.documentProofs?.license;
      const savedLicenseExpiry = typeof savedLicenseProof === "string"
        ? ""
        : String(savedLicenseProof?.expiresOn ?? "").slice(0, 10);
      const savedBusinessProof = currentProfile.documentProofs?.business;
      const savedBusinessExpiry = typeof savedBusinessProof === "string"
        ? ""
        : String(savedBusinessProof?.expiresOn ?? "").slice(0, 10);
      setLicenseExpiresOn(savedLicenseExpiry);
      setBusinessExpiresOn(savedBusinessExpiry);
      const classified = currentProfile.classifiedPhotos ?? {};
      const proofUrls = Array.isArray(classified.proof) ? classified.proof : [];
      const photos: ProofPhoto[] = proofUrls.map((url: string) => ({
        url,
        name: url.split("/").pop()?.split("?")[0] || "Proof document",
      }));
      setProofPhotos(photos);
    } catch {
      setProofPhotos([]);
    }
  };

  useEffect(() => {
    (async () => {
      await fetchPhotos();
      setLoading(false);
    })();
  }, []);

  function todayIsoDate() {
    return new Date().toISOString().slice(0, 10);
  }

  function formatDate(value?: string) {
    if (!value) return "";
    const d = new Date(value);
    if (!Number.isFinite(d.getTime())) return "";
    return d.toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  function formatDateOnly(value?: string) {
    if (!value) return "";
    const d = new Date(`${value}T00:00:00`);
    if (!Number.isFinite(d.getTime())) return "";
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  async function uploadToCloudinary(file: File, documentType: string) {
    const folder = `agent-documents/${documentType.toLowerCase()}`;
    const sig = await api.get(`/api/uploads/cloudinary/sign?folder=${encodeURIComponent(folder)}`);
    const sigData = sig.data as CloudinarySig;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("timestamp", String(sigData.timestamp));
    fd.append("api_key", sigData.apiKey);
    fd.append("signature", sigData.signature);
    fd.append("folder", sigData.folder);
    fd.append("overwrite", "true");
    const resp = await axios.post(`https://api.cloudinary.com/v1_1/${sigData.cloudName}/auto/upload`, fd);
    return (resp.data as { secure_url: string }).secure_url;
  }

  async function handleUpload(files: FileList | null) {
    if (!files?.length || !selectedDocType) {
      setUploadError("Please select a document type.");
      return;
    }

    const file = files[0];
    if (file.type !== "application/pdf") {
      setUploadError("Only PDF documents are allowed.");
      return;
    }

    if (selectedDocType === "license" && !licenseExpiresOn) {
      setUploadError("Please set the Tourism License expiry date before uploading.");
      return;
    }

    if (selectedDocType === "business" && !businessExpiresOn) {
      setUploadError("Please set the Business Licence expiry date before uploading.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Each document must be 5MB or smaller.");
      return;
    }

    try {
      setUploading(true);
      setUploadError(null);
      setUploadSuccess(null);

      const documentType = DOCUMENT_TYPE_BY_ID[selectedDocType];
      if (!documentType) {
        setUploadError("Please select a valid document type.");
        return;
      }

      const url = await uploadToCloudinary(file, documentType);
      const existingClassified = operatorProfile?.classifiedPhotos ?? {};
      const existingProof = Array.isArray(existingClassified.proof) ? existingClassified.proof : [];
      const mergedClassified = {
        ...existingClassified,
        proof: [...existingProof, url],
      };
      const existingDocumentProofs = operatorProfile?.documentProofs ?? {};
      const expiryDateValue = selectedDocType === "license"
        ? licenseExpiresOn
        : selectedDocType === "business"
          ? businessExpiresOn
          : "";
      const expiresAt = expiryDateValue
        ? new Date(`${expiryDateValue}T23:59:59.999Z`).toISOString()
        : null;
      const mergedDocumentProofs = {
        ...existingDocumentProofs,
        [selectedDocType]: {
          url,
          status: "PENDING",
          uploadedAt: new Date().toISOString(),
          approvedAt: null,
          ...(["license", "business"].includes(selectedDocType)
            ? { expiresOn: expiryDateValue, expiresAt }
            : null),
        },
      };

      const metadata = {
        source: "agent_documents",
        documentId: selectedDocType,
        uploadedAt: new Date().toISOString(),
        ...(expiryDateValue ? { expiresOn: expiryDateValue, expiresAt } : {}),
      };

      await api.put("/api/account/documents", {
        type: documentType,
        url,
        metadata,
      });

      await api.patch("/api/agent/operator-profile", {
        ...operatorProfile,
        _preserveProfileReview: true,
        classifiedPhotos: mergedClassified,
        documentProofs: mergedDocumentProofs,
      });

      const selectedDocLabel = REQUIRED_DOCUMENTS.find((d) => d.id === selectedDocType)?.label || selectedDocType;
      setUploadSuccess(`${selectedDocLabel} uploaded successfully!`);
      setSelectedDocType("");
      setOperatorProfile((prev) => ({
        ...prev,
        classifiedPhotos: mergedClassified,
        documentProofs: mergedDocumentProofs,
      }));
      if (fileInputRef.current) fileInputRef.current.value = "";
      await fetchPhotos();
    } catch (err: any) {
      setUploadError(err?.response?.data?.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LogoSpinner size="lg" />
      </div>
    );
  }

  const photosByName = new Map(proofPhotos.map(p => [p.name?.toLowerCase() || "", p]));

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
        <div className="relative mx-auto flex max-w-6xl items-center justify-center px-4 py-3">
          <Link
            href="/account/agent"
            className="absolute left-4 inline-flex items-center justify-center rounded-full p-1.5 text-slate-500 no-underline transition hover:bg-slate-100 hover:text-[#02665e]"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="text-center">
            <h1 className="text-xl font-extrabold text-slate-900">My Documents</h1>
            <p className="text-sm text-slate-500">Required documentation for Tanzanian tour operators</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-[#02665e]/10 text-[#02665e]">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-900">Required documents</p>
              <p className="mt-0.5 text-sm text-slate-500">
                Upload these documents to confirm your registration and tour operating license. This helps complete verification and builds traveler trust in Tanzania.
              </p>
            </div>
          </div>
        </div>

        {/* Document Checklist */}
        <div className="space-y-2 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-extrabold uppercase tracking-widest text-slate-500">Document checklist</p>
            {selectedDocType ? (
              <p className="mt-1 text-sm text-slate-500">
                Selected for upload: {REQUIRED_DOCUMENTS.find((d) => d.id === selectedDocType)?.label || selectedDocType}
              </p>
            ) : null}
            {uploadError ? (
              <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {uploadError}
              </div>
            ) : null}
            {uploadSuccess ? (
              <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {uploadSuccess}
              </div>
            ) : null}
            <input
              id="doc-upload"
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={(e) => handleUpload(e.target.files)}
              className="hidden"
              disabled={uploading || !selectedDocType}
            />
          </div>

          <div className="divide-y divide-slate-100">
            {REQUIRED_DOCUMENTS.map((doc) => {
              const mappedValue = operatorProfile?.documentProofs?.[doc.id];
              const mappedUrl = typeof mappedValue === "string" ? mappedValue : mappedValue?.url;
              const mappedStatus = typeof mappedValue === "string" ? "PENDING" : String(mappedValue?.status || "PENDING").toUpperCase();
              const uploadedAt = typeof mappedValue === "string" ? "" : formatDate(mappedValue?.uploadedAt);
              const approvedAt = typeof mappedValue === "string" ? "" : formatDate(mappedValue?.approvedAt);
              const expiresOn = typeof mappedValue === "string" ? "" : formatDateOnly(mappedValue?.expiresOn);
              const photoMatch = Array.from(photosByName.values()).find(p =>
                doc.id.toLowerCase() === "brela" && p.name?.toLowerCase().includes("brela") ||
                doc.id.toLowerCase() === "tin" && p.name?.toLowerCase().includes("tin") ||
                doc.id.toLowerCase() === "license" && p.name?.toLowerCase().includes("license") ||
                doc.id.toLowerCase() === "business" && p.name?.toLowerCase().includes("business")
              );
              const resolvedUrl = mappedUrl || photoMatch?.url;
              const isUploaded = Boolean(resolvedUrl);

              return (
                <div key={doc.id} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {isUploaded ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-base font-semibold text-slate-900">{doc.label}</p>
                        <span className="text-base font-bold text-rose-600" aria-hidden>
                          *
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm text-slate-500">{doc.description}</p>
                      {(doc.id === "license" || doc.id === "business") && !isUploaded ? (
                        <div className="mt-3 w-full max-w-[220px]">
                          <label className="mb-1 block text-sm font-semibold text-slate-700">
                            Expiry date <span className="text-rose-600">*</span>
                          </label>
                          <DatePickerField
                            label={doc.id === "license" ? "Tourism License expiry date" : "Business Licence expiry date"}
                            value={doc.id === "license" ? licenseExpiresOn : businessExpiresOn}
                            onChangeAction={(iso) => {
                              if (doc.id === "license") {
                                setLicenseExpiresOn(String(iso));
                                return;
                              }
                              setBusinessExpiresOn(String(iso));
                            }}
                            min={todayIsoDate()}
                            widthClassName="w-full"
                            size="sm"
                            allowPast={false}
                            twoMonths={false}
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {isUploaded && resolvedUrl ? (
                    <div className="shrink-0 text-right">
                      <span
                        className={
                          mappedStatus === "APPROVED"
                            ? "inline-flex items-center rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-sm font-semibold text-emerald-700"
                            : "inline-flex items-center rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-sm font-semibold text-amber-700"
                        }
                      >
                        {mappedStatus === "APPROVED" ? "Approved" : "Pending"}
                      </span>
                      <div className="mt-1 flex items-center justify-end gap-1 text-xs italic text-slate-500">
                        <CalendarClock className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          {mappedStatus === "APPROVED"
                            ? (approvedAt ? `Approved on ${approvedAt}` : "Approved")
                            : (uploadedAt || "")}
                        </span>
                      </div>
                      {(doc.id === "license" || doc.id === "business") && expiresOn ? (
                        <div className="mt-1 flex items-center justify-end gap-1 text-xs italic text-slate-500">
                          <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                          <span>Expires on {expiresOn}</span>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectedDocType(doc.id);
                        fileInputRef.current?.click();
                      }}
                      disabled={uploading}
                      className="shrink-0 flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-sm font-semibold text-amber-700 transition hover:border-amber-300 hover:bg-amber-100"
                    >
                      {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                      {uploading ? "Uploading..." : "Upload"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
