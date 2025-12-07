"use client";
import React, { useState, useEffect } from 'react';
import Terms from "@/components/Terms";

export default function TermsPage() {
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    const v = localStorage.getItem('termsAccepted');
    setAccepted(v === 'true');
  }, []);

  const handleAccept = () => {
    localStorage.setItem('termsAccepted', 'true');
    setAccepted(true);
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="bg-white rounded-2xl shadow p-0 overflow-hidden">
        <div className="p-6">
          <Terms
            headline="Terms of Service"
            lastUpdated={new Date().toLocaleDateString()}
            sections={[
              {
                title: "Introduction",
                content: (
                  <>
                    <p>Welcome to NoLSAF. These Terms of Service ("Terms") govern your access to and use of our websites, applications, and related services (collectively, the "Services"). By accessing or using the Services, you agree to be bound by these Terms.</p>
                    <p>If you do not agree, do not use the Services.</p>
                  </>
                ),
              },
              {
                title: "Eligibility & Account",
                content: (
                  <>
                    <p>You must be of legal age and have authority to enter into these Terms. You are responsible for maintaining accurate account information and safeguarding your credentials.</p>
                  </>
                ),
              },
              {
                title: "Acceptable Use",
                content: (
                  <>
                    <ul>
                      <li>Comply with all applicable laws and regulations.</li>
                      <li>Do not interfere with or disrupt the Services.</li>
                      <li>Do not upload unlawful, misleading, or infringing content.</li>
                    </ul>
                  </>
                ),
              },
              {
                title: "Owner Listings & Bookings",
                content: (
                  <>
                    <p>Owners must provide accurate property information, images, pricing, and policies. Bookings are subject to platform rules and any applicable local regulations.</p>
                  </>
                ),
              },
              {
                title: "Fees, Revenue & Taxes",
                content: (
                  <>
                    <p>Applicable fees will be disclosed prior to charge. Owners are responsible for taxes arising from earnings; we provide reporting to support compliance.</p>
                  </>
                ),
              },
              {
                title: "Privacy & Security",
                content: (
                  <>
                    <p>Your use of the Services is subject to our <a href="/privacy">Privacy Policy</a> and <a href="/security">Security</a> practices.</p>
                  </>
                ),
              },
              {
                title: "Intellectual Property",
                content: (
                  <>
                    <p>The Services, trademarks, and content are protected. You receive a limited right to use the Services; all rights not expressly granted are reserved.</p>
                  </>
                ),
              },
              {
                title: "Disclaimers & Liability",
                content: (
                  <>
                    <p>The Services are provided "as is" and "as available" without warranties. To the maximum extent permitted by law, NoLSAF is not liable for indirect, incidental, or consequential damages.</p>
                  </>
                ),
              },
              {
                title: "Termination",
                content: (
                  <>
                    <p>We may suspend or terminate access for breach of these Terms or misuse of the Services. You may stop using the Services at any time.</p>
                  </>
                ),
              },
              {
                title: "Changes to Terms",
                content: (
                  <>
                    <p>We may update these Terms. Continued use after changes means you accept the updated Terms.</p>
                  </>
                ),
              },
              {
                title: "Contact",
                content: (
                  <>
                    <p>Questions? Contact us at <a href={`mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@nolsapp.com'}`}>{process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@nolsapp.com'}</a>.</p>
                  </>
                ),
              },
            ]}
          />
        </div>

        <div className="border-t px-6 py-3 flex items-center justify-between">
          <div className="text-sm text-gray-700">{accepted ? 'You have accepted these terms.' : 'You have not accepted these terms.'}</div>
          <div className="flex items-center gap-3">
            <button className="btn btn-ghost" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Top</button>
            <button className="btn btn-brand" onClick={handleAccept} disabled={accepted}>{accepted ? 'Accepted' : 'Accept Terms'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
