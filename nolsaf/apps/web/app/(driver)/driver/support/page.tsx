"use client";
import React from "react";
import Support from "@/components/Support";
import { LifeBuoy } from "lucide-react";

export default function DriverSupportPage() {
  // Add fade-in animation
  React.useEffect(() => {
    if (typeof document !== 'undefined') {
      const style = document.createElement('style');
      style.textContent = `
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `;
      style.setAttribute('data-support-animations', 'true');
      if (!document.head.querySelector('style[data-support-animations]')) {
        document.head.appendChild(style);
      }
    }
  }, []);

  return (
    <div className="min-h-[60vh] flex items-start justify-center px-4 py-6">
      <div className="w-full max-w-4xl text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="inline-flex items-center justify-center rounded-full bg-gradient-to-br from-[#02665e] to-[#024a44] p-3 shadow-lg">
            <LifeBuoy className="h-6 w-6 text-white" aria-hidden />
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">Support</h1>
        </div>
        <p className="mt-0.5 text-sm text-gray-600">FAQs and contact options</p>
        <div className="mt-6 flex justify-center">
          <div className="w-full max-w-5xl">
            <Support
              showHeader={false}
              showError={false}
              showHelpCenter={false}
              data={{
                helpCenterUrl: "/driver/docs",
                faqs: [
                  { 
                    q: "How do I get started as a driver?", 
                    a: "Complete your profile, upload required documents (license, insurance), and set your availability. Once approved, you can start accepting trip requests.", 
                    href: "/driver/profile",
                    steps: [
                      "Complete your driver profile with personal information",
                      "Upload required documents (driver's license, vehicle insurance)",
                      "Set your availability status to 'Available'",
                      "Wait for admin approval",
                      "Start accepting trip requests from the Live Map"
                    ]
                  },
                  { 
                    q: "How do I view and manage my trips?", 
                    a: "Navigate to My Trips to see all your completed, ongoing, and upcoming trips. You can view trip details, customer information, and trip history.", 
                    href: "/driver/trips",
                    steps: [
                      "Go to My Trips from the sidebar",
                      "View all your trips (completed, ongoing, upcoming)",
                      "Click on a trip to see detailed information",
                      "View customer details and trip route",
                      "Access trip history and earnings"
                    ]
                  },
                  { 
                    q: "How do I use the Live Map?", 
                    a: "The Live Map shows real-time trip requests. Accept requests to start trips, navigate to pickup locations, and complete trips.", 
                    href: "/driver/map?live=1",
                    steps: [
                      "Open Live Map from the sidebar",
                      "View available trip requests on the map",
                      "Tap on a request to see details",
                      "Accept the trip request",
                      "Navigate to pickup location and complete the trip"
                    ]
                  },
                  { 
                    q: "How do I view my earnings and invoices?", 
                    a: "Go to My Revenue → Invoices to see all your invoices. You can also check payouts and download invoice PDFs.", 
                    href: "/driver/invoices",
                    steps: [
                      "Open My Revenue from the sidebar",
                      "Click on Invoices to view all invoices",
                      "Filter by date range or status",
                      "Download invoice PDFs",
                      "Check payout status and history"
                    ]
                  },
                  { 
                    q: "How do I update my documents?", 
                    a: "Go to Management → Documents to upload or update your driver's license, insurance, and other required documents.", 
                    href: "/driver/management?tab=documents",
                    steps: [
                      "Navigate to Management from the sidebar",
                      "Select the Documents tab",
                      "Upload new documents or update existing ones",
                      "Wait for admin review and approval",
                      "Check document status"
                    ]
                  },
                  { 
                    q: "How do I set my availability?", 
                    a: "Use the availability toggle on your dashboard or Live Map. Switch to 'Available' to receive trip requests, or 'Offline' to stop receiving requests.", 
                    href: "/driver",
                    steps: [
                      "Go to your Dashboard",
                      "Find the availability toggle switch",
                      "Toggle to 'Available' to receive requests",
                      "Toggle to 'Offline' when you're done for the day",
                      "Your status updates in real-time"
                    ]
                  },
                  { 
                    q: "How do I view my bonuses and referrals?", 
                    a: "Check My Bonus for current bonuses and Referral to see your referral code and earnings from referring other drivers.", 
                    href: "/driver/bonus",
                    steps: [
                      "Open My Bonus from the sidebar",
                      "View current active bonuses",
                      "Check bonus history and earnings",
                      "Go to Referral to see your referral code",
                      "Share your code to earn referral bonuses"
                    ]
                  },
                  { 
                    q: "What should I do if I have a safety incident?", 
                    a: "Report safety incidents immediately through Management → Safety Measures. Document the incident and contact support if needed.", 
                    href: "/driver/management?tab=safety",
                    steps: [
                      "Go to Management → Safety Measures",
                      "Report the incident with details",
                      "Upload any relevant photos or documents",
                      "Contact support if immediate assistance is needed",
                      "Follow up on incident resolution"
                    ]
                  },
                  { 
                    q: "How do I contact support?", 
                    a: "Use the contact options below to reach our support team via email, phone, or WhatsApp. We're available 24/7 to assist you.", 
                    href: "/driver/support"
                  },
                  { 
                    q: "How do I update my vehicle information?", 
                    a: "Go to Management → Vehicle Settings to update your vehicle details, registration, and other vehicle-related information.", 
                    href: "/driver/management?tab=settings",
                    steps: [
                      "Navigate to Management → Vehicle Settings",
                      "Update vehicle registration details",
                      "Modify vehicle information",
                      "Save changes",
                      "Wait for admin verification if required"
                    ]
                  }
                ],
                contact: {
                  name: "NoLSAF Driver Support",
                  email: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@nolsaf.com",
                  phone: process.env.NEXT_PUBLIC_SUPPORT_PHONE || "+255 736 766 726",
                  whatsapp: "https://wa.me/255736766726",
                  hours: "24/7"
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
