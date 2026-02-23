import Link from "next/link";

import LayoutFrame from "@/components/LayoutFrame";

import { HelpFooter, HelpHeader } from "../HelpChrome";
import HelpBackLink from "../HelpBackLink";

export default function HelpOwnerGuidePage() {
  return (
    <>
      <HelpHeader />
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <LayoutFrame heightVariant="sm" topVariant="sm" colorVariant="muted" variant="solid" />
        <div className="public-container py-8 sm:py-12">
          <HelpBackLink />

          <section className="mt-4 bg-white rounded-2xl p-6 sm:p-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Owner Guide</h1>
            <p className="mt-2 text-gray-600">Basics for listing, managing bookings, and keeping guests happy.</p>

            <div className="mt-6 grid gap-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Listing checklist</h2>
                <ul className="mt-2 list-disc pl-5 text-gray-700 space-y-1">
                  <li>Add clear photos and accurate descriptions.</li>
                  <li>Set house rules, check-in/out times, and amenities.</li>
                  <li>Keep pricing and availability up to date.</li>
                </ul>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-gray-900">During a booking</h2>
                <ul className="mt-2 list-disc pl-5 text-gray-700 space-y-1">
                  <li>Respond quickly to guest questions.</li>
                  <li>Share check-in instructions early.</li>
                  <li>Provide a clean, safe, and accurate experience.</li>
                </ul>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-gray-900">Payouts</h2>
                <p className="mt-2 text-gray-700">
                  Learn how owner payouts work and what affects timing.
                  <span className="ml-1">
                    <Link href="/help/payouts" className="text-slate-700 underline">
                      See payouts
                    </Link>
                    .
                  </span>
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
      <HelpFooter />
    </>
  );
}
