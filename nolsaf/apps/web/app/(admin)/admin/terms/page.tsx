"use client";

import React from "react";
import Terms from "@/components/Terms";
import { TERMS_LAST_UPDATED, TERMS_SECTIONS } from "@/components/termsContent";
import { FileText } from "lucide-react";

export default function AdminTermsPage() {
  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="bg-white rounded-2xl shadow p-0 overflow-hidden">
        <section className="relative h-48 md:h-64 overflow-hidden">
          <div className="h-full relative">
            <div className="absolute inset-0 bg-[url('/assets/nolsaf%20picture%201.jpg')] bg-cover bg-center" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-transparent" />
            <div className="relative h-full flex flex-col items-center justify-center px-4 text-center">
              <FileText size={56} className="text-white mb-3 drop-shadow-lg" strokeWidth={1.5} />
              <h1 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg">Terms of Service</h1>
            </div>
          </div>
        </section>
        <div className="p-6">
          <Terms headline="" lastUpdated={TERMS_LAST_UPDATED} sections={TERMS_SECTIONS} />
        </div>
      </div>
    </div>
  );
}
