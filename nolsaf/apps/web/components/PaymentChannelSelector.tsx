"use client";

import { Building2, CreditCard, Smartphone } from "lucide-react";

export type PaymentChannel = "MNO" | "BANK" | "CARD";

type Props = {
  value: PaymentChannel | null;
  onChange: (channel: PaymentChannel) => void;
};

const channels = [
  { value: "MNO" as const, label: "Mobile Money", description: "Airtel · M-Pesa · Mixx · HaloPesa", Icon: Smartphone, activeCard: "border-red-300 bg-red-50 shadow-lg shadow-red-100", activeWrap: "bg-red-100", idleWrap: "bg-red-50 group-hover:bg-red-100", activeIcon: "text-red-600", idleIcon: "text-red-500", activeLabel: "text-red-900", activeDot: "border-red-500 bg-red-500" },
  { value: "BANK" as const, label: "Bank Transfer", description: "CRDB · NMB OTP checkout", Icon: Building2, activeCard: "border-green-300 bg-green-50 shadow-lg shadow-green-100", activeWrap: "bg-green-100", idleWrap: "bg-green-50 group-hover:bg-green-100", activeIcon: "text-green-700", idleIcon: "text-green-600", activeLabel: "text-green-900", activeDot: "border-green-600 bg-green-600" },
  { value: "CARD" as const, label: "Debit / Credit Card", description: "Visa · Mastercard · Secure checkout", Icon: CreditCard, activeCard: "border-violet-300 bg-violet-50 shadow-lg shadow-violet-100", activeWrap: "bg-violet-100", idleWrap: "bg-violet-50 group-hover:bg-violet-100", activeIcon: "text-violet-700", idleIcon: "text-violet-600", activeLabel: "text-violet-900", activeDot: "border-violet-600 bg-violet-600" },
];

export default function PaymentChannelSelector({ value, onChange }: Props) {
  return (
    <div className="space-y-2.5">
      {channels.map((channel) => {
        const active = value === channel.value;
        if (value && !active) return null;
        const Icon = channel.Icon;
        return (
          <button key={channel.value} type="button" onClick={() => onChange(channel.value)} className={`group flex w-full items-center gap-4 rounded-2xl border-2 px-5 py-4 text-left transition-all duration-200 ${active ? channel.activeCard : "border-slate-100 bg-white shadow-sm hover:border-slate-200 hover:shadow-md"}`}>
            <div className={`flex-shrink-0 rounded-xl p-2.5 transition-colors ${active ? channel.activeWrap : channel.idleWrap}`}>
              <Icon className={`h-5 w-5 transition-colors ${active ? channel.activeIcon : channel.idleIcon}`} />
            </div>
            <div className="min-w-0 flex-1">
              <div className={`text-[15px] font-bold transition-colors ${active ? channel.activeLabel : "text-slate-900"}`}>{channel.label}</div>
              <div className="mt-0.5 text-xs font-medium text-slate-400">{channel.description}</div>
            </div>
            <div className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all ${active ? channel.activeDot : "border-slate-300"}`}>
              {active && <div className="h-2 w-2 rounded-full bg-white" />}
            </div>
          </button>
        );
      })}
    </div>
  );
}
