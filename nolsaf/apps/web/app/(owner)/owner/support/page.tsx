"use client";
import React from "react";
import Support from "@/components/Support";
import { HelpCircle } from "lucide-react";

export default function OwnerSupportPage() {
  return (
    <div className="min-h-[60vh] flex items-start justify-center px-4 py-6">
      <div className="w-full max-w-4xl text-center">
        <div className="flex items-center justify-center gap-2">
          <HelpCircle className="h-6 w-6 text-indigo-600" aria-hidden />
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">Support</h1>
        </div>
        <p className="mt-0.5 text-sm text-gray-600">Help center, FAQs, and contact options</p>
        <div className="mt-2 flex justify-center">
          <div className="w-full max-w-3xl">
            <Support
              showHeader={false}
              showError={false}
              compact
              data={{
                helpCenterUrl: "/owner/docs",
                faqs: [
                  { q: "How do I add a new property?", a: "Quick steps to add a property.", href: "/owner/properties/add", steps: [
                    "Open Owner → Properties → Add",
                    "Enter basic details (name, location, pricing)",
                    "Add rooms, amenities, and property policies",
                    "Upload clear, well‑lit images",
                    "Click Save Draft to pause, or Submit for review to proceed"
                  ] },
                  { q: "What is the review process?", a: "After submission, your property status changes to PENDING. Admin reviews and approves or requests changes.", href: "/owner/properties/pending", steps: [
                    "Submit your property for review",
                    "Status changes to PENDING",
                    "Admin reviews details and media",
                    "Receive APPROVED or requested changes",
                    "Apply changes (if requested) and resubmit"
                  ] },
                  { q: "How do I manage bookings?", a: "Use Owner → Bookings. Validate check-in codes, confirm check-ins, and view checked-in guests.", href: "/owner/bookings/checked-in", steps: [
                    "Open Owner → Bookings",
                    "Validate guest check‑in codes",
                    "Confirm check‑ins",
                    "View currently checked‑in guests",
                    "Resolve issues via Support if needed"
                  ] },
                  { q: "Where can I see revenue and invoices?", a: "Go to Reports → Revenue to view charts and download CSV invoices.", href: "/owner/reports/revenue", steps: [
                    "Open Reports → Revenue",
                    "Filter by date range",
                    "Review charts and summaries",
                    "Download CSV invoices",
                    "Share with accounting if required"
                  ] },
                  { q: "Why am I seeing a network/CORS error?", a: "Ensure you access the app via the Web domain and use the owner routes; reload and try again.", href: "/owner/support" },
                  { q: "How do I update property amenities?", a: "Open the property, edit Services & Amenities, then save changes." },
                  { q: "Can I save a draft without submitting?", a: "Yes. Use Save Draft; drafts appear under Pending with a DRAFT badge.", href: "/owner/properties/pending" },
                  { q: "How do I contact support?", a: "Use the Contact section here or email/phone listed below." }
                ],
                contact: {
                  name: "NoLSAF Owner Support",
                  email: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@nolsapp.com",
                  phone: process.env.NEXT_PUBLIC_SUPPORT_PHONE || "+255 736 766 726",
                  whatsapp: "https://wa.me/255736766726",
                  hours: "24/7"
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
