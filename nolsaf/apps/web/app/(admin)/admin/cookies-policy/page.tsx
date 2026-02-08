"use client";

import React from "react";
import Terms from "@/components/Terms";
import { COOKIES_LAST_UPDATED, COOKIES_SECTIONS } from "@/components/cookiesContent";
import { Cookie } from "lucide-react";

export default function AdminCookiesPolicyPage() {
  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="bg-white rounded-2xl shadow p-0 overflow-hidden">
        <section className="relative h-48 md:h-64 overflow-hidden">
          <div className="h-full relative">
            <div className="absolute inset-0 bg-[url('/assets/nolsaf%20picture%201.jpg')] bg-cover bg-center" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-transparent" />
            <div className="relative h-full flex flex-col items-center justify-center px-4 text-center">
              <Cookie size={56} className="text-white mb-3 drop-shadow-lg" strokeWidth={1.5} />
              <h1 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg">Cookies Policy</h1>
            </div>
          </div>
        </section>
        <div className="p-6">
          <Terms headline="" lastUpdated={COOKIES_LAST_UPDATED} sections={COOKIES_SECTIONS} />
        </div>
      </div>
    </div>
  );
}
