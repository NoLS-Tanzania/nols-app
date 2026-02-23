import Link from "next/link";

import LayoutFrame from "@/components/LayoutFrame";

import { HelpFooter, HelpHeader } from "../HelpChrome";
import HelpBackLink from "../HelpBackLink";

export default function HelpGettingStartedPage() {
  return (
    <>
      <HelpHeader />
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <LayoutFrame heightVariant="sm" topVariant="sm" colorVariant="muted" variant="solid" />
        <div className="public-container py-8 sm:py-12">
          <HelpBackLink />

          <section className="mt-4 bg-white rounded-2xl p-6 sm:p-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Getting Started</h1>
            <p className="mt-2 text-gray-600">
              Quick steps to book a stay, set up your account, and find what you need.
            </p>

            <div className="mt-6 grid gap-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">How to Book</h2>
                <ol className="mt-2 list-decimal pl-5 text-gray-700 space-y-1">
                  <li>
                    Browse available stays and open a property details page.
                    <span className="ml-1">
                      <Link href="/public/properties" className="text-slate-700 underline">
                        Browse Properties
                      </Link>
                    </span>
                  </li>
                  <li>Select your dates and number of guests.</li>
                  <li>Review house rules, cancellation policy, and the total price.</li>
                  <li>Confirm your booking and complete payment.</li>
                  <li>Check your email for confirmation and check-in instructions.</li>
                </ol>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-gray-900">Account Setup</h2>
                <p className="mt-2 text-gray-700">
                  Create an account, complete your profile, and keep your contact details up to date.
                </p>
                <div className="mt-2">
                  <Link href="/help/account-setup" className="text-slate-700 underline">
                    Go to Account Setup
                  </Link>
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-gray-900">Need help right now?</h2>
                <p className="mt-2 text-gray-700">
                  Use the contact form on the Help Center page or email us at{' '}
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
