import Link from "next/link";

import LayoutFrame from "@/components/LayoutFrame";

import { HelpFooter, HelpHeader } from "../HelpChrome";
import HelpBackLink from "../HelpBackLink";

export default function HelpPaymentsPage() {
  return (
    <>
      <HelpHeader />
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <LayoutFrame heightVariant="sm" topVariant="sm" colorVariant="muted" variant="solid" />
        <div className="public-container py-8 sm:py-12">
          <HelpBackLink />

          <section className="mt-4 bg-white rounded-2xl p-6 sm:p-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Payment Methods</h1>
            <p className="mt-2 text-gray-600">How payments work and what methods are commonly supported.</p>

            <div className="mt-6 grid gap-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Common options</h2>
                <ul className="mt-2 list-disc pl-5 text-gray-700 space-y-1">
                  <li>Mobile money (e.g., M-Pesa, Airtel Money, Tigo Pesa)</li>
                  <li>Card payments (where available)</li>
                </ul>
                <p className="mt-3 text-gray-700">
                  Available methods can vary by property and location. You'll see the supported options during checkout.
                </p>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-gray-900">Payment timing</h2>
                <p className="mt-2 text-gray-700">
                  Payments are typically captured when a booking is confirmed. Some stays may support partial payments or scheduled payments
                  depending on the property.
                </p>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-gray-900">Refunds</h2>
                <p className="mt-2 text-gray-700">
                  Refund eligibility depends on the propertys cancellation policy.
                  <span className="ml-1">
                    <Link href="/help/refunds" className="text-slate-700 underline">
                      Read about refunds & cancellations
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
