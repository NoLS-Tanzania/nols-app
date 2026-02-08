"use client";

import React from "react";
import Terms from "@/components/Terms";
import { VERIFICATION_LAST_UPDATED, VERIFICATION_SECTIONS } from "@/components/verificationContent";
import { CheckCircle } from "lucide-react";

export default function AdminVerificationPolicyPage() {
  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="bg-white rounded-2xl shadow p-0 overflow-hidden">
        <section className="relative h-48 md:h-64 overflow-hidden">
          <div className="h-full relative">
            <div className="absolute inset-0 bg-[url('/assets/nolsaf%20picture%201.jpg')] bg-cover bg-center" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-transparent" />
            <div className="relative h-full flex flex-col items-center justify-center px-4 text-center">
              <CheckCircle size={56} className="text-white mb-3 drop-shadow-lg" strokeWidth={1.5} />
              <h1 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg">Verification Policy</h1>
            </div>
          </div>
        </section>
        <div className="p-6">
          <Terms headline="" lastUpdated={VERIFICATION_LAST_UPDATED} sections={VERIFICATION_SECTIONS} />
        </div>
      </div>
    </div>
  );
}
