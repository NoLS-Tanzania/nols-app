import LayoutFrame from "@/components/LayoutFrame";

import { HelpFooter, HelpHeader } from "../HelpChrome";
import HelpBackLink from "../HelpBackLink";

export default function HelpAccountSetupPage() {
  return (
    <>
      <HelpHeader />
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <LayoutFrame heightVariant="sm" topVariant="sm" colorVariant="muted" variant="solid" />
        <div className="public-container py-8 sm:py-12">
          <HelpBackLink />

          <section className="mt-4 bg-white rounded-2xl p-6 sm:p-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Account Setup</h1>
            <p className="mt-2 text-gray-600">Set up your account so bookings and support are smoother.</p>

            <div className="mt-6 grid gap-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Basics</h2>
                <ul className="mt-2 list-disc pl-5 text-gray-700 space-y-1">
                  <li>Create an account using a working email address.</li>
                  <li>Keep your phone number up to date for booking updates.</li>
                  <li>Complete your profile details for faster checkout.</li>
                </ul>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-gray-900">Security</h2>
                <ul className="mt-2 list-disc pl-5 text-gray-700 space-y-1">
                  <li>Use a strong password you don't reuse elsewhere.</li>
                  <li>Turn on extra security options when available (e.g., 2FA).</li>
                  <li>Review login activity regularly if you suspect issues.</li>
                </ul>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-gray-900">Still stuck?</h2>
                <p className="mt-2 text-gray-700">
                  Contact support via the Help Center form or email{' '}
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
