import LayoutFrame from "@/components/LayoutFrame";

import { HelpFooter, HelpHeader } from "../HelpChrome";
import HelpBackLink from "../HelpBackLink";

export default function HelpRefundsPage() {
  return (
    <>
      <HelpHeader />
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <LayoutFrame heightVariant="sm" topVariant="sm" colorVariant="muted" variant="solid" />
        <div className="public-container py-8 sm:py-12">
          <HelpBackLink />

          <section className="mt-4 bg-white rounded-2xl p-6 sm:p-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Refunds & Cancellations</h1>
            <p className="mt-2 text-gray-600">What to check before cancelling and how refunds typically work.</p>

            <div className="mt-6 grid gap-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Before you cancel</h2>
                <ul className="mt-2 list-disc pl-5 text-gray-700 space-y-1">
                  <li>Open your booking details and review the cancellation policy.</li>
                  <li>Check whether the booking is refundable and any deadlines.</li>
                  <li>If youre unsure, contact support before cancelling.</li>
                </ul>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-gray-900">Refund timing</h2>
                <p className="mt-2 text-gray-700">
                  Refund times vary by payment method. If youre eligible for a refund, its typically processed back to the original
                  method.
                </p>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-gray-900">Need help with a refund?</h2>
                <p className="mt-2 text-gray-700">
                  Use the Help Center contact form or email{' '}
                  <a href="mailto:info@nolsaf.com" className="text-slate-700 underline">
                    info@nolsaf.com
                  </a>
                  . Include your booking reference if available.
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
