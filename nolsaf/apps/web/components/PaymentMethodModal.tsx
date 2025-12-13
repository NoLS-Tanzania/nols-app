"use client";
import { useState, useEffect } from "react";
import { X, CreditCard, Smartphone, Wallet, Check } from "lucide-react";
import axios from "axios";

const api = axios.create();

interface PaymentMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (method: {
    provider: string;
    phoneNumber: string;
    providerName: string;
  }) => void;
  invoiceId?: number;
  amount: number;
  currency?: string;
  defaultPhone?: string;
}

type PaymentProvider = {
  id: string;
  name: string;
  icon: any;
  description: string;
  supported: boolean;
};

const PAYMENT_PROVIDERS: PaymentProvider[] = [
  {
    id: "Airtel",
    name: "Airtel Money",
    icon: Smartphone,
    description: "Pay using your Airtel Money account",
    supported: true,
  },
  {
    id: "Tigo",
    name: "Tigo Pesa",
    icon: Wallet,
    description: "Pay using your Tigo Pesa account",
    supported: true,
  },
  {
    id: "M-Pesa",
    name: "M-Pesa",
    icon: Smartphone,
    description: "Pay using your M-Pesa account",
    supported: true,
  },
  {
    id: "Halopesa",
    name: "HaloPesa",
    icon: Wallet,
    description: "Pay using your HaloPesa account",
    supported: true,
  },
];

export default function PaymentMethodModal({
  isOpen,
  onClose,
  onSelect,
  invoiceId,
  amount,
  currency = "TZS",
  defaultPhone,
}: PaymentMethodModalProps) {
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState<string>(defaultPhone || "");
  const [savedPhones, setSavedPhones] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && defaultPhone) {
      setPhoneNumber(defaultPhone);
    }
  }, [isOpen, defaultPhone]);

  // Load saved phone numbers from user's payment history
  useEffect(() => {
    if (isOpen) {
      loadSavedPhones();
    }
  }, [isOpen]);

  const loadSavedPhones = async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (!token) return;

      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      const response = await api.get("/account/payment-methods");
      
      // Extract unique phone numbers from payment history
      const phones = new Set<string>();
      if (response.data?.methods) {
        response.data.methods.forEach((method: any) => {
          if (method.ref && /^\+?255\d{9}$/.test(method.ref.replace(/\D/g, ""))) {
            phones.add(method.ref);
          }
        });
      }
      
      // Also check user's profile phone
      if (response.data?.payout?.mobileMoneyNumber) {
        phones.add(response.data.payout.mobileMoneyNumber);
      }

      setSavedPhones(Array.from(phones));
    } catch (err) {
      // Silently fail - saved phones are optional
      console.debug("Could not load saved phone numbers", err);
    }
  };

  const normalizePhone = (phone: string): string => {
    // Remove all non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, "");
    
    // Ensure it starts with country code
    if (!cleaned.startsWith("+")) {
      if (cleaned.startsWith("255")) {
        cleaned = "+" + cleaned;
      } else if (cleaned.startsWith("0")) {
        cleaned = "+255" + cleaned.substring(1);
      } else {
        cleaned = "+255" + cleaned;
      }
    }
    
    return cleaned;
  };

  const validatePhone = (phone: string): boolean => {
    const normalized = normalizePhone(phone);
    // Tanzania phone format: +255XXXXXXXXX (12 digits after +)
    return /^\+255\d{9}$/.test(normalized);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedProvider) {
      setError("Please select a payment provider");
      return;
    }

    if (!phoneNumber.trim()) {
      setError("Please enter your phone number");
      return;
    }

    const normalized = normalizePhone(phoneNumber.trim());
    if (!validatePhone(normalized)) {
      setError("Please enter a valid Tanzania phone number (e.g., +255712345678 or 0712345678)");
      return;
    }

    const provider = PAYMENT_PROVIDERS.find((p) => p.id === selectedProvider);
    if (!provider) {
      setError("Invalid payment provider selected");
      return;
    }

    // Call onSelect callback with selected method
    onSelect({
      provider: selectedProvider,
      phoneNumber: normalized,
      providerName: provider.name,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Select Payment Method</h2>
            <p className="text-sm text-slate-600 mt-1">
              Choose how you want to pay {amount.toLocaleString("en-US")} {currency}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Payment Providers */}
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-3">
              Select Payment Provider
            </label>
            <div className="grid grid-cols-2 gap-3">
              {PAYMENT_PROVIDERS.map((provider) => {
                const Icon = provider.icon;
                const isSelected = selectedProvider === provider.id;
                return (
                  <button
                    key={provider.id}
                    type="button"
                    onClick={() => setSelectedProvider(provider.id)}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      isSelected
                        ? "border-emerald-600 bg-emerald-50"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    } ${!provider.supported ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    disabled={!provider.supported}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Icon className={`w-5 h-5 ${isSelected ? "text-emerald-600" : "text-slate-600"}`} />
                      {isSelected && <Check className="w-5 h-5 text-emerald-600" />}
                    </div>
                    <div className="text-left">
                      <div className={`font-medium text-sm ${isSelected ? "text-emerald-900" : "text-slate-900"}`}>
                        {provider.name}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">{provider.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Phone Number Input */}
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+255712345678 or 0712345678"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors"
              required
            />
            <p className="text-xs text-slate-500 mt-1">
              Enter the phone number linked to your {selectedProvider ? PAYMENT_PROVIDERS.find(p => p.id === selectedProvider)?.name : "mobile money"} account
            </p>

            {/* Saved Phone Numbers */}
            {savedPhones.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-slate-600 mb-2">Previously used:</p>
                <div className="flex flex-wrap gap-2">
                  {savedPhones.slice(0, 3).map((phone, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPhoneNumber(phone)}
                      className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      {phone}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Info Note */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> You can use different phone numbers for different bookings. 
              Each booking is processed independently with the payment method you select here.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedProvider || !phoneNumber.trim()}
              className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? "Processing..." : "Continue to Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
