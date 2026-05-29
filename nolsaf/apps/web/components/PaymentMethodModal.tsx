"use client";
import { useState, useEffect } from "react";
import { X, Smartphone, Building2, CreditCard, ShieldCheck } from "lucide-react";
import apiClient from "@/lib/apiClient";

const api = apiClient;

// ── Shared types ────────────────────────────────────────────────────────────────

export type SelectedPaymentMethod =
  | { method: "MNO";  provider: "Airtel" | "Mixx" | "M-Pesa" | "HaloPesa"; phoneNumber: string; providerName: string; }
  | { method: "BANK"; bankCode: string; bankName: string; accountNumber?: string; }
  | { method: "CARD"; };

interface PaymentMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (method: SelectedPaymentMethod) => void;
  invoiceId?: number;
  amount: number;
  currency?: string;
  defaultPhone?: string;
}

// ── Providers ───────────────────────────────────────────────────────────────────

type MnoProvider = { id: "Airtel" | "Mixx" | "M-Pesa" | "HaloPesa"; name: string; };

const MNO_PROVIDERS: MnoProvider[] = [
  { id: "Airtel",   name: "Airtel Money" },
  { id: "M-Pesa",   name: "M-Pesa"       },
  { id: "Mixx",     name: "Mixx by Yas"  },
  { id: "HaloPesa", name: "HaloPesa"     },
];

type BankProvider = { code: string; name: string; };

const BANK_PROVIDERS: BankProvider[] = [
  { code: "CRDB",    name: "CRDB Bank" },
  { code: "NMB",     name: "NMB Bank" },
  { code: "NBC",     name: "NBC Bank" },
  { code: "STANBIC", name: "Stanbic Bank" },
  { code: "EQUITY",  name: "Equity Bank" },
  { code: "IM",      name: "I&M Bank" },
  { code: "ABSA",    name: "ABSA Bank" },
  { code: "TCB",     name: "TCB Bank" },
  { code: "BOA",     name: "Bank of Africa" },
  { code: "DTB",     name: "Diamond Trust Bank" },
  { code: "UBA",     name: "UBA Bank" },
  { code: "AZANIA",  name: "Bank of Azania" },
  { code: "KCB",     name: "KCB Bank" },
  { code: "NCBA",    name: "NCBA Bank" },
  { code: "YETU",    name: "Yetu Microfinance" },
];

// ── Phone helpers ───────────────────────────────────────────────────────────────

function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/[^\d+]/g, "");
  if (!cleaned.startsWith("+")) {
    if (cleaned.startsWith("255"))    cleaned = "+" + cleaned;
    else if (cleaned.startsWith("0")) cleaned = "+255" + cleaned.substring(1);
    else                              cleaned = "+255" + cleaned;
  }
  return cleaned;
}

function validatePhone(phone: string): boolean {
  return /^\+255\d{9}$/.test(normalizePhone(phone));
}

// ── Selection indicator ─────────────────────────────────────────────────────────

function RadioDot({ selected }: { selected: boolean }) {
  return (
    <span
      className={`
        flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200
        ${selected ? "border-emerald-500 bg-emerald-500" : "border-slate-300 bg-white"}
      `}
    >
      {selected && <span className="w-2 h-2 rounded-full bg-white" />}
    </span>
  );
}

// ── Component ───────────────────────────────────────────────────────────────────

export default function PaymentMethodModal({
  isOpen,
  onClose,
  onSelect,
  invoiceId: _invoiceId,
  amount,
  currency = "TZS",
  defaultPhone,
}: PaymentMethodModalProps) {
  const [activeSection, setActiveSection]         = useState<"MNO" | "BANK" | "CARD" | null>(null);
  const [selectedMnoProvider, setSelectedMnoProvider] = useState<string>("");
  const [phoneNumber, setPhoneNumber]             = useState<string>(defaultPhone || "");
  const [savedPhones, setSavedPhones]             = useState<string[]>([]);
  const [selectedBankCode, setSelectedBankCode]   = useState<string>("");
  const [bankAccountNumber, setBankAccountNumber] = useState<string>("");
  const [error, setError]                         = useState<string | null>(null);

  async function loadSavedPhones() {
    try {
      const response = await api.get("/api/account/payment-methods");
      const phones = new Set<string>();
      if (response.data?.methods) {
        response.data.methods.forEach((m: any) => {
          if (m.ref && /^\+?255\d{9}$/.test(m.ref.replace(/\D/g, ""))) phones.add(m.ref);
        });
      }
      if (response.data?.payout?.mobileMoneyNumber) phones.add(response.data.payout.mobileMoneyNumber);
      setSavedPhones(Array.from(phones));
    } catch { /* saved phones are optional */ }
  }

  useEffect(() => {
    if (isOpen && defaultPhone) setPhoneNumber(defaultPhone);
  }, [isOpen, defaultPhone]);

  useEffect(() => {
    if (isOpen) loadSavedPhones();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setActiveSection(null);
      setError(null);
      setSelectedMnoProvider("");
      setSelectedBankCode("");
      setBankAccountNumber("");
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!activeSection) { setError("Please select a payment method"); return; }

    if (activeSection === "MNO") {
      if (!selectedMnoProvider) { setError("Please select a mobile money provider"); return; }
      if (!phoneNumber.trim())   { setError("Please enter your phone number"); return; }
      const normalized = normalizePhone(phoneNumber.trim());
      if (!validatePhone(normalized)) {
        setError("Please enter a valid Tanzania phone number (e.g. +255712345678 or 0712345678)");
        return;
      }
      const prov = MNO_PROVIDERS.find((p) => p.id === selectedMnoProvider);
      onSelect({ method: "MNO", provider: selectedMnoProvider as any, phoneNumber: normalized, providerName: prov?.name ?? selectedMnoProvider });
    } else if (activeSection === "BANK") {
      if (!selectedBankCode) { setError("Please select a bank"); return; }
      const bank = BANK_PROVIDERS.find((b) => b.code === selectedBankCode);
      onSelect({ method: "BANK", bankCode: selectedBankCode, bankName: bank?.name ?? selectedBankCode, accountNumber: bankAccountNumber.trim() || undefined });
    } else if (activeSection === "CARD") {
      onSelect({ method: "CARD" });
    }
  };

  const submitLabel = () => {
    if (activeSection === "MNO")  return "Continue with Mobile Money";
    if (activeSection === "BANK") return "Continue with Bank Transfer";
    if (activeSection === "CARD") return "Continue with Card";
    return "Continue";
  };

  const isSubmitDisabled =
    !activeSection ||
    (activeSection === "MNO"  && (!selectedMnoProvider || !phoneNumber.trim())) ||
    (activeSection === "BANK" && !selectedBankCode);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl shadow-2xl max-h-[96vh] overflow-y-auto">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="sticky top-0 bg-white z-10 flex items-start justify-between px-6 pt-6 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 tracking-tight">Payment Method</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {amount.toLocaleString("en-US")} <span className="font-medium">{currency}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-3">

          {/* ── Card: Mobile Money ────────────────────────────────────────────── */}
          <MethodCard
            id="MNO"
            active={activeSection === "MNO"}
            icon={<Smartphone className="w-5 h-5" />}
            iconColor={activeSection === "MNO" ? "text-red-600" : "text-red-500"}
            iconBg={activeSection === "MNO" ? "bg-red-100" : "bg-red-50"}
            label="Mobile Money"
            description="Airtel · M-Pesa · Mixx · HaloPesa"
            onClick={() => { setActiveSection(activeSection === "MNO" ? null : "MNO"); setError(null); }}
          >
            {/* Provider chips */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {MNO_PROVIDERS.map((prov) => {
                const sel = selectedMnoProvider === prov.id;
                return (
                  <button
                    key={prov.id}
                    type="button"
                    onClick={() => setSelectedMnoProvider(prov.id)}
                    className={`
                      px-3 py-2.5 rounded-xl border text-sm font-medium transition-all duration-150 text-left
                      ${sel
                        ? "border-violet-400 bg-violet-50 text-violet-800 shadow-sm"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"}
                    `}
                  >
                    {prov.name}
                  </button>
                );
              })}
            </div>

            {/* Phone input */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Phone Number
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="0712 345 678"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-400 focus:border-transparent outline-none transition-all bg-slate-50 focus:bg-white"
              />
              <p className="text-xs text-slate-400 mt-1.5">
                {selectedMnoProvider
                  ? `Number linked to your ${MNO_PROVIDERS.find(p => p.id === selectedMnoProvider)?.name} account`
                  : "Tanzania number (+255 or 07xx)"}
              </p>
              {savedPhones.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {savedPhones.slice(0, 3).map((ph, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setPhoneNumber(ph)}
                      className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
                    >
                      {ph}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </MethodCard>

          {/* ── Card: Bank Transfer ───────────────────────────────────────────── */}
          <MethodCard
            id="BANK"
            active={activeSection === "BANK"}
            icon={<Building2 className="w-5 h-5" />}
            iconColor={activeSection === "BANK" ? "text-green-700" : "text-green-600"}
            iconBg={activeSection === "BANK" ? "bg-green-100" : "bg-green-50"}
            label="Bank Transfer"
            description="CRDB · NMB · NBC · 12 more"
            onClick={() => { setActiveSection(activeSection === "BANK" ? null : "BANK"); setError(null); }}
          >
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Select Bank
              </label>
              <select
                value={selectedBankCode}
                onChange={(e) => setSelectedBankCode(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition-all bg-slate-50 focus:bg-white appearance-none"
              >
                <option value="">Choose your bank</option>
                {BANK_PROVIDERS.map((b) => (
                  <option key={b.code} value={b.code}>{b.name}</option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Account Number <span className="normal-case font-normal text-slate-400">(optional)</span>
              </label>
              <input
                type="text"
                value={bankAccountNumber}
                onChange={(e) => setBankAccountNumber(e.target.value)}
                placeholder="Account number"
                maxLength={25}
                className="w-full max-w-[280px] px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent outline-none transition-all bg-slate-50 focus:bg-white font-mono tracking-wide block"
              />
            </div>

            <div className="flex items-start gap-2.5 p-3 bg-blue-50 rounded-xl">
              <span className="text-blue-400 mt-0.5">ℹ</span>
              <p className="text-xs text-blue-700 leading-relaxed">
                You&apos;ll receive a prompt on your bank app or USSD to complete the payment.
              </p>
            </div>
          </MethodCard>

          {/* ── Card: Debit / Credit Card ─────────────────────────────────────── */}
          <MethodCard
            id="CARD"
            active={activeSection === "CARD"}
            icon={<CreditCard className="w-5 h-5" />}
            iconColor={activeSection === "CARD" ? "text-blue-700" : "text-blue-500"}
            iconBg={activeSection === "CARD" ? "bg-blue-100" : "bg-blue-50"}
            label="Debit / Credit Card"
            description="Visa · Mastercard · Secure checkout"
            onClick={() => { setActiveSection(activeSection === "CARD" ? null : "CARD"); setError(null); }}
          >
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <ShieldCheck className="w-9 h-9 text-emerald-500 shrink-0" />
              <div>
                <p className="text-sm font-medium text-slate-800">Secure hosted checkout</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  You&apos;ll be redirected to AzamPay&apos;s secure page. We never see your card details.
                </p>
              </div>
            </div>
          </MethodCard>

          {/* ── Error ────────────────────────────────────────────────────────── */}
          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
              {error}
            </div>
          )}

          {/* ── Actions ──────────────────────────────────────────────────────── */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3.5 border border-slate-200 rounded-xl text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="flex-1 px-4 py-3.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm shadow-emerald-200"
            >
              {submitLabel()}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── MethodCard sub-component ────────────────────────────────────────────────────

interface MethodCardProps {
  id: string;
  active: boolean;
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
  label: string;
  description: string;
  onClick: () => void;
  children?: React.ReactNode;
}

function MethodCard({ active, icon, iconColor, iconBg, label, description, onClick, children }: MethodCardProps) {
  return (
    <div
      className={`
        rounded-2xl border transition-all duration-200
        ${active
          ? "border-slate-200 shadow-md shadow-slate-100"
          : "border-slate-200 hover:border-slate-300 hover:shadow-sm"}
      `}
    >
      {/* Row */}
      <button
        type="button"
        onClick={onClick}
        className="w-full flex items-center gap-4 px-5 py-4 text-left"
      >
        <span className={`p-2.5 rounded-xl transition-colors ${iconBg}`}>
          <span className={iconColor}>{icon}</span>
        </span>

        <span className="flex-1 min-w-0">
          <span className="block font-semibold text-slate-900 text-sm leading-tight">{label}</span>
          <span className="block text-xs text-slate-400 mt-0.5">{description}</span>
        </span>

        <RadioDot selected={active} />
      </button>

      {/* Expanded details */}
      {active && children && (
        <div className="px-5 pb-5 pt-4 border-t border-slate-100">
          {children}
        </div>
      )}
    </div>
  );
}
