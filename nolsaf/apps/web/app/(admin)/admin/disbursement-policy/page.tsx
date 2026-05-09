"use client";

import React from "react";
import Terms from "@/components/Terms";
import {
  DISBURSEMENT_POLICY_LAST_UPDATED,
  DISBURSEMENT_POLICY_SECTIONS,
} from "@/components/disbursementPolicyContent";
import { DollarSign } from "lucide-react";

export default function AdminDisbursementPolicyPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="overflow-hidden rounded-2xl bg-white shadow">
        <section className="relative h-48 overflow-hidden md:h-64">
          <div className="relative h-full">
            <div className="absolute inset-0 bg-[url('/assets/nolsaf%20picture%201.jpg')] bg-cover bg-center" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-transparent" />
            <div className="relative flex h-full flex-col items-center justify-center px-4 text-center">
              <DollarSign size={56} className="mb-3 text-white drop-shadow-lg" strokeWidth={1.5} />
              <h1 className="text-3xl font-bold text-white drop-shadow-lg md:text-4xl">Disbursement Policy</h1>
              <p className="mt-2 text-base text-white drop-shadow-lg md:text-lg">For Drivers and Property Owners</p>
            </div>
          </div>
        </section>

        <div className="p-6">
          <Terms
            headline=""
            lastUpdated={DISBURSEMENT_POLICY_LAST_UPDATED}
            sections={DISBURSEMENT_POLICY_SECTIONS}
          />
        </div>
      </div>
    </div>
  );
}
