"use client";

import { useState } from "react";
import Link from "next/link";
import { LifeBuoy, ChevronDown, ChevronRight, Mail, MessageCircle, BookOpen, CreditCard, Car, Home } from "lucide-react";
import LayoutFrame from "@/components/LayoutFrame";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";

const DEFAULT_FAQS = [
  // Booking Category
  {
    question: "How do I book a property?",
    answer: "Browse available properties on our platform, select your dates, and complete the booking process. You'll receive a confirmation email with all the details.",
    category: "Booking"
  },
  {
    question: "Can I cancel my booking?",
    answer: "Cancellation policies vary by property. Check the property's cancellation policy before booking. You can view your bookings and cancellation options in your account.",
    category: "Booking"
  },
  {
    question: "How far in advance can I book?",
    answer: "You can book properties up to 12 months in advance. Some properties may have different availability windows, which will be shown during the booking process.",
    category: "Booking"
  },
  {
    question: "Can I modify my booking dates?",
    answer: "Yes, you can modify your booking dates through your account dashboard, subject to availability and the property's modification policy. Changes may incur additional fees or refunds based on the property's terms.",
    category: "Booking"
  },
  {
    question: "What happens if the property is not as described?",
    answer: "If you encounter any issues with the property not matching its description, contact our support team immediately. We'll investigate and work with the property owner to resolve the issue, which may include a refund or alternative accommodation.",
    category: "Booking"
  },
  {
    question: "Do I need to pay a security deposit?",
    answer: "Some properties require a security deposit, which will be clearly stated during the booking process. Deposits are typically refunded within 7-14 business days after check-out, provided there's no damage or policy violations.",
    category: "Booking"
  },
  {
    question: "Can I book for multiple guests?",
    answer: "Yes, you can specify the number of guests during booking. Make sure to select the correct number as some properties charge per guest or have maximum occupancy limits.",
    category: "Booking"
  },
  {
    question: "What is the check-in and check-out process?",
    answer: "Check-in and check-out times vary by property and are displayed on the property listing. You'll receive detailed instructions via email after booking. Most properties offer flexible check-in options, and early check-in or late check-out may be available upon request.",
    category: "Booking"
  },
  // Payment Category
  {
    question: "What payment methods are accepted?",
    answer: "We accept various payment methods including M-Pesa, Airtel Money, Tigo Pesa, and VISA cards. Payment options may vary by property.",
    category: "Payment"
  },
  {
    question: "When is payment charged?",
    answer: "Payment is typically charged at the time of booking confirmation. Some properties may require a partial payment upfront with the remainder due closer to your check-in date. You'll see the payment schedule before confirming your booking.",
    category: "Payment"
  },
  {
    question: "Are there any booking fees?",
    answer: "Our platform charges a small service fee that is clearly displayed before you complete your booking. This fee helps us maintain the platform, provide customer support, and ensure secure transactions.",
    category: "Payment"
  },
  {
    question: "How do I get a refund?",
    answer: "Refunds are processed according to the property's cancellation policy. If you're eligible for a refund, it will be processed to your original payment method within 5-10 business days. Contact support if you have questions about your refund status.",
    category: "Payment"
  },
  {
    question: "Can I pay in installments?",
    answer: "Some properties offer installment payment options. Look for properties with 'Pay in Installments' badge or contact the property owner directly to discuss payment arrangements.",
    category: "Payment"
  },
  {
    question: "What currency are prices displayed in?",
    answer: "Prices are displayed in Tanzanian Shillings (TZS) by default. You can view prices in other currencies using the currency selector, though the final charge will be in TZS based on current exchange rates.",
    category: "Payment"
  },
  {
    question: "Is my payment information secure?",
    answer: "Yes, we use industry-standard encryption and secure payment processing. Your payment information is never stored on our servers. All transactions are processed through secure, PCI-compliant payment gateways.",
    category: "Payment"
  },
  // Property Owner Category
  {
    question: "How do I list my property?",
    answer: "Sign up as a property owner, complete your profile, and add your property details. Our team will review and approve your listing. You can start by clicking 'List Your Property' in the navigation menu.",
    category: "Property Owner"
  },
  {
    question: "What information do I need to list my property?",
    answer: "You'll need property photos, a detailed description, amenities list, pricing, availability calendar, house rules, and contact information. Our onboarding process will guide you through all required information.",
    category: "Property Owner"
  },
  {
    question: "How much does it cost to list my property?",
    answer: "Listing your property is free. We only charge a commission on successful bookings. The commission rate varies based on your property type and is clearly outlined in our owner agreement.",
    category: "Property Owner"
  },
  {
    question: "How do I set my property pricing?",
    answer: "You can set base pricing, seasonal rates, weekend rates, and special offers through your owner dashboard. We provide pricing recommendations based on market data to help you optimize your rates.",
    category: "Property Owner"
  },
  {
    question: "How do I manage bookings and reservations?",
    answer: "All bookings appear in your owner dashboard where you can view guest details, manage check-ins, communicate with guests, and update availability. You'll receive email notifications for new bookings.",
    category: "Property Owner"
  },
  {
    question: "When do I receive payment for bookings?",
    answer: "Payments are typically released to your account 24-48 hours after guest check-in. You can view your earnings, pending payments, and payout schedule in your owner dashboard under 'Earnings'.",
    category: "Property Owner"
  },
  {
    question: "Can I block dates when my property is unavailable?",
    answer: "Yes, you can block dates, set minimum stay requirements, and manage your availability calendar directly from your owner dashboard. Changes sync immediately across the platform.",
    category: "Property Owner"
  },
  {
    question: "What if a guest damages my property?",
    answer: "We recommend requiring a security deposit for your property. If damage occurs, document it with photos and contact our support team. We'll help mediate the situation and process any claims through the security deposit.",
    category: "Property Owner"
  },
  {
    question: "How can I improve my property's visibility?",
    answer: "High-quality photos, detailed descriptions, competitive pricing, quick response times, and positive reviews all help improve your property's visibility. We also offer featured listing options for increased exposure.",
    category: "Property Owner"
  },
  // Driver Category
  {
    question: "How do I become a driver?",
    answer: "Register as a driver on our platform, complete your profile with required documents (license, vehicle registration, insurance), and wait for approval. Our team will verify your credentials before activation.",
    category: "Driver"
  },
  {
    question: "What documents do I need to become a driver?",
    answer: "You'll need a valid driver's license, vehicle registration documents, insurance certificate, and a recent photo. All documents must be current and valid. We may request additional verification documents.",
    category: "Driver"
  },
  {
    question: "How do I get ride requests?",
    answer: "Once approved, you'll receive ride requests through the driver app. You can accept or decline requests based on your availability. Being online and in high-demand areas increases your chances of receiving requests.",
    category: "Driver"
  },
  {
    question: "How are driver earnings calculated?",
    answer: "Earnings are based on distance, time, and base fare rates. You keep a percentage of each ride, with the exact breakdown shown in your driver dashboard. Weekly payouts are processed automatically.",
    category: "Driver"
  },
  {
    question: "Can I set my own rates?",
    answer: "Base rates are set by the platform, but you can earn bonuses during peak hours and special promotions. Premium drivers with excellent ratings may qualify for higher earning tiers.",
    category: "Driver"
  },
  {
    question: "What if I have an issue with a passenger?",
    answer: "Contact our support team immediately if you encounter any issues. We have a 24/7 support line for drivers. Document any incidents and report them through the driver app for quick resolution.",
    category: "Driver"
  },
  {
    question: "How do I update my vehicle information?",
    answer: "You can update your vehicle information, documents, and profile details through your driver dashboard. Changes to critical information like vehicle registration may require re-verification.",
    category: "Driver"
  },
  // Support Category
  {
    question: "How do I contact support?",
    answer: "You can reach our support team via email at info@nolsaf.com, use the contact form on this page, or access live chat through your account dashboard. We typically respond within 24 hours, with urgent matters addressed sooner.",
    category: "Support"
  },
  {
    question: "What happens if I have an issue during my stay?",
    answer: "Contact the property owner directly through the platform messaging system first. If the issue isn't resolved, reach out to our support team for assistance. We're available 24/7 to help resolve any problems.",
    category: "Support"
  },
  {
    question: "How do I report a problem with a property?",
    answer: "Use the 'Report Issue' button in your booking details or contact support directly. Provide photos and details of the problem. Our team will investigate and work with the property owner to resolve it.",
    category: "Support"
  },
  {
    question: "Can I leave a review after my stay?",
    answer: "Yes, you'll receive an email invitation to leave a review after your check-out date. Reviews help other guests make informed decisions and help property owners improve their services.",
    category: "Support"
  },
  {
    question: "What is your response time for support inquiries?",
    answer: "We aim to respond to all inquiries within 24 hours. Urgent matters related to active bookings are prioritized and typically receive a response within 2-4 hours during business hours.",
    category: "Support"
  },
  {
    question: "How do I update my account information?",
    answer: "You can update your profile, contact information, payment methods, and preferences through your account settings. Changes to email or phone number may require verification.",
    category: "Support"
  },
  {
    question: "What if I forgot my password?",
    answer: "Click 'Forgot Password' on the login page and enter your email address. You'll receive a password reset link via email. If you don't receive it, check your spam folder or contact support.",
    category: "Support"
  },
  // Security Category
  {
    question: "Is my personal information secure?",
    answer: "Yes, we take data security seriously. We use industry-standard encryption, secure servers, and follow best practices for data protection. Your personal information is never shared with third parties without your consent.",
    category: "Security"
  },
  {
    question: "How do you verify property owners and drivers?",
    answer: "We verify all property owners and drivers through document verification, identity checks, and background screening where applicable. Only verified users can list properties or provide services on our platform.",
    category: "Security"
  },
  {
    question: "What should I do if I suspect fraud?",
    answer: "Report any suspicious activity immediately to our support team at info@nolsaf.com. Include as much detail as possible. We take fraud seriously and will investigate all reports promptly.",
    category: "Security"
  },
  {
    question: "Are my credit card details stored?",
    answer: "No, we never store your full credit card details. Payment information is securely processed through PCI-compliant payment gateways. Only the last four digits are stored for transaction reference.",
    category: "Security"
  },
  {
    question: "How do I know if a property listing is legitimate?",
    answer: "All properties go through our verification process. Look for verified badges, read reviews from previous guests, and check the property owner's profile. If something seems suspicious, report it to our support team.",
    category: "Security"
  },
  {
    question: "What privacy protections do you have?",
    answer: "We comply with data protection regulations and have strict privacy policies. Your data is only used to provide our services and improve your experience. You can review our full privacy policy in your account settings.",
    category: "Security"
  }
];

const HELP_CATEGORIES = [
  {
    title: "Getting Started",
    icon: BookOpen,
    links: [
      { href: "/help/getting-started", label: "How to Book" },
      { href: "/help/account-setup", label: "Account Setup" },
      { href: "/public/properties", label: "Browse Properties" }
    ]
  },
  {
    title: "Payments & Billing",
    icon: CreditCard,
    links: [
      { href: "/help/payments", label: "Payment Methods" },
      { href: "/help/refunds", label: "Refunds & Cancellations" },
      { href: "/help/pricing", label: "Pricing Information" }
    ]
  },
  {
    title: "For Property Owners",
    icon: Home,
    links: [
      { href: "/account/onboard/owner", label: "List Your Property" },
      { href: "/help/owner-guide", label: "Owner Guide" },
      { href: "/help/payouts", label: "Payouts & Earnings" }
    ]
  },
  {
    title: "For Drivers",
    icon: Car,
    links: [
      { href: "/account/onboard/driver", label: "Become a Driver" },
      { href: "/help/driver-tools", label: "Driver Tools" },
      { href: "/help/driver-earnings", label: "Earnings & Payments" }
    ]
  }
];

export default function HelpCenterPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [sending, _setSending] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [showAllFAQs, setShowAllFAQs] = useState(false);

  const categories = ["All", ...Array.from(new Set(DEFAULT_FAQS.map(f => f.category)))];
  const filteredFAQs = selectedCategory === "All" 
    ? DEFAULT_FAQS 
    : DEFAULT_FAQS.filter(f => f.category === selectedCategory);
  
  const displayedFAQs = showAllFAQs ? filteredFAQs : filteredFAQs.slice(0, 10);
  const hasMoreFAQs = filteredFAQs.length > 10;

  async function submitContact(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    setSent(null);
    if (!contactEmail || !contactMessage) {
      setError('Please provide your email and a message.');
      return;
    }
    
    // Use mailto as the primary method since there's no public contact API
    const subject = encodeURIComponent(`Help Center Inquiry${contactName ? ` from ${contactName}` : ''}`);
    const body = encodeURIComponent(`${contactMessage}\n\n---\nFrom: ${contactEmail}${contactName ? ` (${contactName})` : ''}`);
    window.location.href = `mailto:info@nolsaf.com?subject=${subject}&body=${body}`;
    
    setSent('Opening your email client. Please send the message to contact our support team.');
    setContactName('');
    setContactEmail('');
    setContactMessage('');
  }

  return (
    <>
      <PublicHeader />
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <LayoutFrame heightVariant="sm" topVariant="sm" colorVariant="muted" variant="solid" />
        <div className="public-container py-8 sm:py-12">
          {/* Header Section */}
          <div className="max-w-3xl mx-auto text-center mb-12 animate-[fadeIn_0.5s_ease-out]">
            <div className="inline-flex items-center justify-center rounded-full bg-gradient-to-br from-[#02665e] to-[#024d47] p-4 shadow-lg transform transition-all duration-300 hover:scale-110 hover:shadow-xl">
              <LifeBuoy className="h-8 w-8 text-white" />
            </div>
            <h1 className="mt-6 text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight">
              Help Center
            </h1>
            <p className="mt-3 text-base sm:text-lg text-gray-600">
              Find answers to common questions and get support
            </p>
          </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Main Content - Knowledge Base */}
          <main className="lg:col-span-2 space-y-6">
            {/* Help Categories */}
            <section className="bg-white rounded-2xl p-6 sm:p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Browse by Category</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {HELP_CATEGORIES.map((category, idx) => {
                  const Icon = category.icon;
                  return (
                    <div key={idx} className="transition-all duration-200">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-[#02665e]/10 rounded-lg">
                          <Icon className="h-5 w-5 text-[#02665e]" />
                        </div>
                        <h3 className="font-semibold text-gray-900">{category.title}</h3>
                      </div>
                      <div className="space-y-0.5">
                        {category.links.map((link, linkIdx) => (
                          <Link
                            key={linkIdx}
                            href={link.href}
                            className="text-sm text-gray-600 hover:text-[#02665e] flex items-center justify-between group transition-all duration-200 no-underline py-2"
                            style={{ textDecoration: 'none' }}
                          >
                            <span className="group-hover:font-medium transition-all duration-200">{link.label}</span>
                            <ChevronRight className="h-3.5 w-3.5 text-gray-400 opacity-0 group-hover:opacity-100 group-hover:text-[#02665e] transition-all duration-200 flex-shrink-0" />
                          </Link>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* FAQs Section */}
            <section className="bg-white rounded-2xl p-6 sm:p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
              
              {/* Clean Category Filter */}
              <div className="flex flex-wrap gap-2 mb-8 pb-6 border-b border-gray-100">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(cat);
                      setShowAllFAQs(false);
                      setOpenFaq(null);
                    }}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                      selectedCategory === cat
                        ? 'bg-[#02665e] text-white'
                        : 'text-gray-500 hover:text-[#02665e]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Clean FAQ Items */}
              <div className="space-y-0">
                {displayedFAQs.map((f, idx) => {
                  const isOpen = openFaq === idx;
                  return (
                    <div
                      key={idx}
                      className="py-4 border-b border-gray-50 last:border-b-0"
                    >
                      <button
                        onClick={() => setOpenFaq(isOpen ? null : idx)}
                        className="w-full flex items-center justify-between text-left transition-all duration-200 group"
                      >
                        <span className={`text-base pr-4 transition-colors ${
                          isOpen ? 'text-[#02665e] font-semibold' : 'text-gray-900 font-medium group-hover:text-[#02665e]'
                        }`}>
                          {f.question}
                        </span>
                        <ChevronDown
                          className={`h-4 w-4 flex-shrink-0 transition-all duration-200 ${
                            isOpen ? 'rotate-180 text-[#02665e]' : 'text-gray-400 group-hover:text-gray-600'
                          }`}
                        />
                      </button>
                      {isOpen && (
                        <div className="mt-3 text-gray-600 leading-relaxed text-sm">
                          {f.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Show More/Less Button */}
              {hasMoreFAQs && (
                <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                  <button
                    onClick={() => {
                      setShowAllFAQs(!showAllFAQs);
                      setOpenFaq(null);
                    }}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#02665e] text-white rounded-full font-medium hover:bg-[#024d47] transition-all duration-200 hover:shadow-lg active:scale-95"
                  >
                    <span>{showAllFAQs ? 'Show Less' : 'Show More'}</span>
                    <span className="text-xs opacity-90 font-normal">
                      ({showAllFAQs ? `${filteredFAQs.length - 10} hidden` : `${filteredFAQs.length - 10} more`})
                    </span>
                  </button>
                </div>
              )}
            </section>
          </main>

          {/* Sidebar - Contact Form */}
          <aside className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm sticky top-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-[#02665e]/10 rounded-lg">
                  <MessageCircle className="h-5 w-5 text-[#02665e]" />
                </div>
                <h3 className="font-semibold text-gray-900">Still need help?</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Can't find what you're looking for? Contact our support team.
              </p>

              <form onSubmit={submitContact} className="space-y-4">
                <div>
                  <label htmlFor="contact-name" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Name (optional)
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] outline-none transition-all"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label htmlFor="contact-email" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    required
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] outline-none transition-all"
                    placeholder="your@email.com"
                  />
                </div>
                <div>
                  <label htmlFor="contact-message" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="contact-message"
                    required
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] outline-none transition-all resize-none"
                    placeholder="How can we help you?"
                  />
                </div>
                <button
                  type="submit"
                  disabled={sending}
                  className="w-full px-4 py-2.5 bg-[#02665e] text-white rounded-lg font-semibold hover:bg-[#024d47] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                >
                  {sending ? 'Sending...' : 'Send Message'}
                </button>
              </form>

              {sent && (
                <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
                  {sent}
                </div>
              )}
              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <Mail className="h-4 w-4" />
                  <span className="font-medium">Email us directly:</span>
                </div>
                <a
                  href="mailto:info@nolsaf.com"
                  className="text-[#02665e] hover:text-[#024d47] text-sm font-medium transition-colors"
                >
                  info@nolsaf.com
                </a>
              </div>
            </div>
          </aside>
        </div>
        </div>
      </div>
      <PublicFooter withRail={false} />
    </>
  );
}

