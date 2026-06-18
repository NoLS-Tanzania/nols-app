"use client";

import Link from "next/link";
import { ArrowLeft, Users, FileCheck2, Link2, Sparkles } from "lucide-react";

export default function TravellerGroupsPage() {
  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/account"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-[#02665e] transition-all duration-200 mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1" />
          Back to Account
        </Link>
        <div className="space-y-2 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">Traveller groups</h1>
          <p className="text-sm sm:text-base text-slate-600">Manage people connected to your trips</p>
        </div>
      </div>

      {/* Coming soon */}
      <div className="text-center py-16 sm:py-20 px-6 rounded-2xl border-2 border-dashed border-slate-200 bg-gradient-to-br from-slate-50 to-white">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#02665e]/10 mb-6">
          <Users className="w-10 h-10 text-[#02665e]" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">Traveller groups are coming soon</h3>
        <p className="text-sm sm:text-base text-slate-600 mb-10 max-w-md mx-auto">
          Soon a group leader will be able to create a group, add the people travelling with them, and link the
          group to a specific trip.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto text-left">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-[#02665e]/10 mb-3">
              <Users className="w-5 h-5 text-[#02665e]" />
            </div>
            <div className="text-sm font-bold text-slate-900 mb-1">Add members</div>
            <p className="text-xs text-slate-600">Upload each traveller's details to your group roster.</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-[#02665e]/10 mb-3">
              <Link2 className="w-5 h-5 text-[#02665e]" />
            </div>
            <div className="text-sm font-bold text-slate-900 mb-1">Link to a trip</div>
            <p className="text-xs text-slate-600">Connect your group to a stay, tour, or booking.</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-[#02665e]/10 mb-3">
              <FileCheck2 className="w-5 h-5 text-[#02665e]" />
            </div>
            <div className="text-sm font-bold text-slate-900 mb-1">Share for permits</div>
            <p className="text-xs text-slate-600">Send member details to the operator for permit processing.</p>
          </div>
        </div>

        <div className="mt-10 inline-flex items-center gap-2 text-xs font-medium text-slate-500">
          <Sparkles className="w-4 h-4 text-[#02665e]" />
          We&apos;ll let you know as soon as this is ready.
        </div>
      </div>
    </div>
  );
}
