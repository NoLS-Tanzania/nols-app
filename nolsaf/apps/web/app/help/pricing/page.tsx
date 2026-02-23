import LayoutFrame from "@/components/LayoutFrame";

import { HelpFooter, HelpHeader } from "../HelpChrome";
import HelpBackLink from "../HelpBackLink";

export default function HelpPricingPage() {
  return (
    <>
      <HelpHeader />
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <LayoutFrame heightVariant="sm" topVariant="sm" colorVariant="muted" variant="solid" />
        <div className="public-container py-8 sm:py-12">
          <HelpBackLink />

          <section className="mt-4 bg-white rounded-2xl p-6 sm:p-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Pricing Information</h1>
            <p className="mt-2 text-gray-600">How pricing is displayed and what can affect totals.</p>

            <div className="mt-6 grid gap-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">What you'll see at checkout</h2>
                <ul className="mt-2 list-disc pl-5 text-gray-700 space-y-1">
                  <li>Nightly (or base) rate for the stay</li>
                  <li>Any applicable service fees</li>
                  <li>Any taxes/charges shown by the property</li>
                </ul>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-gray-900">Currency</h2>
                <p className="mt-2 text-gray-700">
                  Prices are commonly displayed in Tanzanian Shillings (TZS). Final charges can depend on your selected payment method and
                  provider exchange rates.
                </p>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-gray-900">Questions about a specific price?</h2>
                <p className="mt-2 text-gray-700">
                  Contact support and share the property name and your travel dates.
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
