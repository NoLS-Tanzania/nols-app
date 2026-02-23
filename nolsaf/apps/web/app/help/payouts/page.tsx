import LayoutFrame from "@/components/LayoutFrame";

import { HelpFooter, HelpHeader } from "../HelpChrome";
import HelpBackLink from "../HelpBackLink";

export default function HelpPayoutsPage() {
  return (
    <>
      <HelpHeader />
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <LayoutFrame heightVariant="sm" topVariant="sm" colorVariant="muted" variant="solid" />
        <div className="public-container py-8 sm:py-12">
          <HelpBackLink />

          <section className="mt-4 bg-white rounded-2xl p-6 sm:p-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Payouts</h1>
            <p className="mt-2 text-gray-600">How payouts are issued and what can affect payout timing.</p>

            <div className="mt-6 grid gap-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Where payouts go</h2>
                <p className="mt-2 text-gray-700">
                  Payouts are typically sent to the payout method set by the property/owner (for example, mobile money or bank details if
                  supported).
                </p>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-gray-900">Timing</h2>
                <ul className="mt-2 list-disc pl-5 text-gray-700 space-y-1">
                  <li>Payouts may be triggered after check-in or checkout depending on the policy.</li>
                  <li>Holidays, provider delays, or verification checks can impact timing.</li>
                </ul>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-gray-900">Need help?</h2>
                <p className="mt-2 text-gray-700">
                  Contact support and include the property name and booking reference if relevant.
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
