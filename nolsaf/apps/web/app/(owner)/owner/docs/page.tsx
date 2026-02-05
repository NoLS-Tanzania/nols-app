"use client";
import React from "react";
import Link from "next/link";
import { BookOpen, CalendarCheck, BarChart3, PlusSquare, ClipboardCheck, Shield } from "lucide-react";
import Articles from "@/components/Articles";

export default function OwnerDocsPage() {
  return (
    <div className="min-h-[60vh] px-4 py-6 flex items-start justify-center">
      <div className="w-full max-w-4xl text-center">
        <div className="flex items-center justify-center gap-2">
          <BookOpen className="h-6 w-6 text-indigo-600" aria-hidden />
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">Owner Help Center</h1>
        </div>
        <p className="mt-1 text-sm text-gray-600">Guides for properties, bookings, revenue, and support.</p>

        <div className="mt-4 grid md:grid-cols-2 gap-4">
          <Link href="/owner/properties/add" className="group no-underline block rounded-xl border border-gray-200 p-4 bg-white shadow-sm hover:shadow-xl hover:bg-gray-50 hover:translate-y-[1px] transition duration-200 border-l-4 border-brand-primary">
            <div className="flex items-center gap-2">
              <PlusSquare className="h-4 w-4 text-indigo-600" />
              <h3 className="font-medium text-gray-900 group-hover:text-[#02665e]">Add a New Property</h3>
            </div>
            <p className="mt-1 text-sm text-gray-700">Steps to create a property, upload images, and submit for review.</p>
          </Link>
          <Link href="/owner/properties/pending" className="group no-underline block rounded-xl border border-gray-200 p-4 bg-white shadow-sm hover:shadow-xl hover:bg-gray-50 hover:translate-y-[1px] transition duration-200 border-l-4 border-brand-primary">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-indigo-600" />
              <h3 className="font-medium text-gray-900 group-hover:text-[#02665e]">Review Process</h3>
            </div>
            <p className="mt-1 text-sm text-gray-700">Understand PENDING vs DRAFT statuses and admin approvals.</p>
          </Link>
          <Link href="/owner/bookings/checked-in" className="group no-underline block rounded-xl border border-gray-200 p-4 bg-white shadow-sm hover:shadow-xl hover:bg-gray-50 hover:translate-y-[1px] transition duration-200 border-l-4 border-brand-primary">
            <div className="flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-indigo-600" />
              <h3 className="font-medium text-gray-900 group-hover:text-[#02665e]">Manage Bookings</h3>
            </div>
            <p className="mt-1 text-sm text-gray-700">Validate check-in codes and confirm guest check-ins.</p>
          </Link>
          <Link href="/owner/reports/revenue" className="group no-underline block rounded-xl border border-gray-200 p-4 bg-white shadow-sm hover:shadow-xl hover:bg-gray-50 hover:translate-y-[1px] transition duration-200 border-l-4 border-brand-primary">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-indigo-600" />
              <h3 className="font-medium text-gray-900 group-hover:text-[#02665e]">Revenue & Invoices</h3>
            </div>
            <p className="mt-1 text-sm text-gray-700">View charts and download CSV invoices.</p>
          </Link>
        </div>

        <div className="mt-6">
          <Articles
            items={[
              { title: "Trust & Safety for Owners", href: "/owner/support", icon: Shield },
              { title: "Transparent Earnings & Invoices", href: "/owner/reports/revenue", icon: BarChart3 },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
