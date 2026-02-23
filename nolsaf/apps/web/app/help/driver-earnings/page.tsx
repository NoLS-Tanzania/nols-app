import LayoutFrame from "@/components/LayoutFrame";

import { HelpFooter, HelpHeader } from "../HelpChrome";
import HelpBackLink from "../HelpBackLink";

export default function HelpDriverEarningsPage() {
  return (
    <>
      <HelpHeader />
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <LayoutFrame heightVariant="sm" topVariant="sm" colorVariant="muted" variant="solid" />
        <div className="public-container py-8 sm:py-12">
          <HelpBackLink />

          <section className="mt-4 bg-white rounded-2xl p-6 sm:p-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Driver Earnings</h1>
            <p className="mt-2 text-gray-600">Understanding earnings, payments, and common questions.</p>

            <div className="mt-6 grid gap-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">How earnings work</h2>
                <ul className="mt-2 list-disc pl-5 text-gray-700 space-y-1">
                  <li>Earnings depend on assigned trips/jobs and the agreed rates.</li>
                  <li>Keep your availability and profile accurate to avoid missed assignments.</li>
                  <li>Contact support if an assignment looks incorrect.</li>
                </ul>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-gray-900">Where to manage driver work</h2>
                <p className="mt-2 text-gray-700">
                  If you're an agent/driver, use the Agent Portal to see assignments and notifications.
                </p>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-gray-900">Need help?</h2>
                <p className="mt-2 text-gray-700">
                  Email{' '}
                  <a href="mailto:info@nolsaf.com" className="text-slate-700 underline">
                    info@nolsaf.com
                  </a>
                  {' '}with your details.
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
