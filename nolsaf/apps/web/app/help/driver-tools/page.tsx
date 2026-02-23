import Link from "next/link";

import LayoutFrame from "@/components/LayoutFrame";

import { HelpFooter, HelpHeader } from "../HelpChrome";
import HelpBackLink from "../HelpBackLink";

export default function HelpDriverToolsPage() {
  return (
    <>
      <HelpHeader />
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <LayoutFrame heightVariant="sm" topVariant="sm" colorVariant="muted" variant="solid" />
        <div className="public-container py-8 sm:py-12">
          <HelpBackLink />

          <section className="mt-4 bg-white rounded-2xl p-6 sm:p-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Driver Tools & Support</h1>
            <p className="mt-2 text-gray-600">Helpful tools and best practices for drivers working with Nolsaf.</p>

            <div className="mt-6 grid gap-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">In the Agent Portal</h2>
                <ul className="mt-2 list-disc pl-5 text-gray-700 space-y-1">
                  <li>Check assignments and schedules.</li>
                  <li>Track notifications and updates.</li>
                  <li>Update your profile and security settings.</li>
                </ul>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-gray-900">Earnings</h2>
                <p className="mt-2 text-gray-700">
                  Learn how driver earnings are calculated and tracked.
                  <span className="ml-1">
                    <Link href="/help/driver-earnings" className="text-slate-700 underline">
                      See driver earnings
                    </Link>
                    .
                  </span>
                </p>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-gray-900">Need assistance?</h2>
                <p className="mt-2 text-gray-700">
                  Reach out to support via the Help Center form or email{' '}
                  <a href="mailto:info@nolsaf.com" className="text-slate-700 underline">
                    info@nolsaf.com
                  </a>
                  .
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
