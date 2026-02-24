"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Car,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Home,
  Mail,
  MessageCircle,
  Search,
  Shield,
  Sparkles,
  Users,
  LifeBuoy,
} from "lucide-react";
import LayoutFrame from "@/components/LayoutFrame";
import { HelpFooter, HelpHeader } from "./HelpChrome";

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
    gradient: "from-emerald-500 to-teal-600",
    bg: "bg-emerald-50/60 border-emerald-100/80",
    pill: "bg-emerald-100 text-emerald-700",
    accent: "#059669",
    links: [
      { href: "/help/getting-started", label: "How to Book" },
      { href: "/help/account-setup", label: "Account Setup" },
      { href: "/public/properties", label: "Browse Properties" },
    ],
  },
  {
    title: "Payments & Billing",
    icon: CreditCard,
    gradient: "from-sky-500 to-blue-600",
    bg: "bg-sky-50/60 border-sky-100/80",
    pill: "bg-sky-100 text-sky-700",
    accent: "#0284c7",
    links: [
      { href: "/help/payments", label: "Payment Methods" },
      { href: "/help/refunds", label: "Refunds & Cancellations" },
      { href: "/help/pricing", label: "Pricing Information" },
    ],
  },
  {
    title: "For Property Owners",
    icon: Home,
    gradient: "from-amber-500 to-orange-500",
    bg: "bg-amber-50/60 border-amber-100/80",
    pill: "bg-amber-100 text-amber-700",
    accent: "#d97706",
    links: [
      { href: "/account/onboard/owner", label: "List Your Property" },
      { href: "/help/owner-guide", label: "Owner Guide" },
      { href: "/help/payouts", label: "Payouts & Earnings" },
    ],
  },
  {
    title: "For Drivers",
    icon: Car,
    gradient: "from-indigo-500 to-violet-600",
    bg: "bg-indigo-50/60 border-indigo-100/80",
    pill: "bg-indigo-100 text-indigo-700",
    accent: "#6366f1",
    links: [
      { href: "/account/onboard/driver", label: "Become a Driver" },
      { href: "/help/driver-tools", label: "Driver Tools" },
      { href: "/help/driver-earnings", label: "Earnings & Payments" },
    ],
  },
  {
    title: "For Agents",
    icon: Users,
    gradient: "from-[#02665e] to-[#4dd9ac]",
    bg: "bg-teal-50/60 border-teal-100/80",
    pill: "bg-teal-100 text-teal-700",
    accent: "#02665e",
    links: [
      { href: "/help/become-agent", label: "Become an Agent" },
      { href: "/help/event-manager", label: "Event Manager" },
      { href: "/help/nolsaf-stand", label: "NoLSAF Stand" },
    ],
  },
  {
    title: "Safety & Security",
    icon: Shield,
    gradient: "from-rose-500 to-pink-600",
    bg: "bg-rose-50/60 border-rose-100/80",
    pill: "bg-rose-100 text-rose-700",
    accent: "#e11d48",
    links: [
      { href: "/help/getting-started#safety", label: "Safety Guidelines" },
      { href: "/help/account-setup#security", label: "Account Security" },
      { href: "/help/refunds#disputes", label: "Dispute Resolution" },
    ],
  },
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
  const [isAgentContext, setIsAgentContext] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const queryCtx = new URLSearchParams(window.location.search).get("ctx")?.toLowerCase() || "";
    const stored = (sessionStorage.getItem("navigationContext") || "").toLowerCase();
    const next = queryCtx === "agent" || stored === "agent";
    if (next) {
      sessionStorage.setItem("navigationContext", "agent");
      setIsAgentContext(true);
    }
  }, []);

  const withHelpCtx = (href: string) => {
    if (!isAgentContext) return href;
    if (!href.startsWith("/help")) return href;
    return `${href}${href.includes("?") ? "&" : "?"}ctx=agent`;
  };

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
      <HelpHeader />
      <div className="min-h-screen bg-[#f8fafb]">
        <LayoutFrame heightVariant="sm" topVariant="sm" colorVariant="muted" variant="solid" />
        <div className="public-container py-8 sm:py-10">

        {/* ── Premium Hero ─────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#010f0e] via-[#011a18] to-[#022820] text-white">
          <div className="pointer-events-none absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
          <div className="pointer-events-none absolute -top-24 right-0 w-[500px] h-[500px] rounded-full blur-3xl opacity-20"
            style={{ background: "radial-gradient(circle, #4dd9ac 0%, transparent 65%)" }} />
          <div className="pointer-events-none absolute bottom-0 left-0 w-80 h-80 rounded-full blur-3xl opacity-10"
            style={{ background: "radial-gradient(circle, #02b4f5 0%, transparent 70%)" }} />

          <div className="py-12 sm:py-16 px-6 sm:px-10 relative z-10">
            <div className="max-w-2xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#4dd9ac]/25 bg-[#4dd9ac]/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-widest text-[#4dd9ac] mb-6">
                <Sparkles className="h-3 w-3" /> Support &amp; Documentation
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.05]">
                How can we<br /><span className="text-[#4dd9ac]">help you?</span>
              </h1>
              <p className="mt-5 text-[15px] text-slate-300 leading-relaxed max-w-xl mx-auto">
                Find answers to common questions, explore guides for every role, and reach our support team — all in one place.
              </p>

              {/* fake search bar for aesthetics */}
              <div className="mt-8 flex items-center gap-3 bg-white/8 border border-white/15 rounded-2xl px-5 py-3.5 max-w-lg mx-auto backdrop-blur-sm">
                <Search className="h-4 w-4 text-slate-400 flex-shrink-0" />
                <span className="text-sm text-slate-400 flex-1 text-left">Search help articles, guides, FAQs…</span>
                <span className="hidden sm:inline text-[11px] text-slate-500 border border-white/10 rounded-md px-2 py-0.5">Browse below ↓</span>
              </div>

              {/* trust pills */}
              <div className="mt-8 flex items-center justify-center flex-wrap gap-3">
                {[
                  { icon: BookOpen, label: "50+ guides" },
                  { icon: MessageCircle, label: "Live support" },
                  { icon: Shield, label: "Secure platform" },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="inline-flex items-center gap-2 rounded-full bg-white/8 border border-white/10 px-4 py-1.5 text-xs font-semibold text-slate-300">
                    <Icon className="h-3.5 w-3.5 text-[#4dd9ac]" /> {label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* ── Main Content ─────────────────────────────────── */}
            <main className="lg:col-span-2 space-y-10">

              {/* Browse by Category */}
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#02665e]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-[#02665e]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#02665e]" /> Browse by Category
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {HELP_CATEGORIES.map((cat, idx) => {
                    const Icon = cat.icon;
                    return (
                      <div key={idx}
                        className={`group relative overflow-hidden rounded-2xl border bg-white shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 ${cat.bg}`}>
                        {/* shimmer */}
                        <div className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/30 to-transparent z-10" />
                        {/* top gradient bar */}
                        <div className={`h-[3px] w-full bg-gradient-to-r ${cat.gradient}`} />
                        {/* watermark number */}
                        <span className="pointer-events-none select-none absolute right-3 bottom-2 text-[4rem] font-black leading-none opacity-[0.04] text-slate-900">
                          {String(idx + 1).padStart(2, "0")}
                        </span>

                        <div className="p-5 relative z-10">
                          <div className="flex items-center gap-3 mb-4">
                            <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${cat.gradient} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300 flex-shrink-0`}>
                              <Icon className="h-5 w-5 text-white drop-shadow" />
                            </div>
                            <h3 className="text-sm font-extrabold text-gray-900 leading-snug">{cat.title}</h3>
                          </div>
                          <div className="space-y-1">
                            {cat.links.map((link, li) => (
                              <Link key={li} href={withHelpCtx(link.href)}
                                onClick={() => { if (isAgentContext && typeof window !== "undefined") sessionStorage.setItem("navigationContext", "agent"); }}
                                className="group/link no-underline flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-white/80 hover:text-gray-900 transition-all duration-150">
                                <span className="min-w-0 truncate font-medium">{link.label}</span>
                                <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 opacity-0 group-hover/link:opacity-100 transition-opacity duration-150" style={{ color: cat.accent }} />
                              </Link>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* FAQ Section */}
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#02665e]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-[#02665e]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#02665e]" /> Frequently Asked Questions
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                  {/* Category filter */}
                  <div className="px-6 sm:px-8 pt-6 pb-5 border-b border-slate-100">
                    <div className="flex flex-wrap gap-2">
                      {categories.map((cat) => (
                        <button key={cat}
                          onClick={() => { setSelectedCategory(cat); setShowAllFAQs(false); setOpenFaq(null); }}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${
                            selectedCategory === cat
                              ? "bg-[#02665e] text-white shadow-sm"
                              : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                          }`}>
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* FAQ items */}
                  <div className="divide-y divide-slate-50">
                    {displayedFAQs.map((f, idx) => {
                      const isOpen = openFaq === idx;
                      return (
                        <div key={idx} className={`transition-colors duration-200 ${isOpen ? "bg-[#f0fdfc]" : "hover:bg-slate-50/60"}`}>
                          <button onClick={() => setOpenFaq(isOpen ? null : idx)}
                            className="w-full flex items-center justify-between gap-4 text-left px-6 sm:px-8 py-4">
                            <span className={`text-sm font-semibold leading-snug transition-colors duration-150 ${isOpen ? "text-[#02665e]" : "text-gray-900"}`}>
                              {f.question}
                            </span>
                            <div className={`flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center transition-all duration-200 ${isOpen ? "bg-[#02665e] text-white" : "bg-slate-100 text-slate-400"}`}>
                              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                            </div>
                          </button>
                          {isOpen && (
                            <div className="px-6 sm:px-8 pb-5">
                              <div className="text-sm text-gray-600 leading-relaxed border-l-2 border-[#4dd9ac] pl-4">
                                {f.answer}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Show more */}
                  {hasMoreFAQs && (
                    <div className="px-6 sm:px-8 py-5 border-t border-slate-100 bg-slate-50/50">
                      <button
                        onClick={() => { setShowAllFAQs(!showAllFAQs); setOpenFaq(null); }}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#02665e] text-white px-5 py-2.5 text-sm font-bold hover:bg-[#024d47] transition-all duration-200 shadow-sm hover:shadow-md">
                        {showAllFAQs ? "Show Less" : `Show More`}
                        <span className="text-[11px] font-normal opacity-80">
                          ({showAllFAQs ? `${filteredFAQs.length - 10} fewer` : `${filteredFAQs.length - 10} more`})
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              </section>

              {/* Quick links strip */}
              <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#010f0e] via-[#011a18] to-[#022820] text-white p-6 sm:p-8">
                <div className="pointer-events-none absolute inset-0 opacity-[0.03]"
                  style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
                <div className="pointer-events-none absolute -top-10 right-0 w-48 h-48 rounded-full blur-3xl opacity-20"
                  style={{ background: "radial-gradient(circle, #4dd9ac 0%, transparent 65%)" }} />
                <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                  <div className="flex items-start gap-4">
                    <div className="h-11 w-11 rounded-xl bg-[#4dd9ac]/15 border border-[#4dd9ac]/25 flex items-center justify-center flex-shrink-0">
                      <LifeBuoy className="h-5 w-5 text-[#4dd9ac]" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-widest text-[#4dd9ac] mb-1">Need more help?</p>
                      <h3 className="text-base font-extrabold text-white leading-snug">Our team is available around the clock.</h3>
                      <p className="mt-1 text-sm text-slate-400">Email us directly and we will respond within 24 hours.</p>
                    </div>
                  </div>
                  <a href="mailto:info@nolsaf.com"
                    className="no-underline flex-shrink-0 inline-flex items-center gap-2 rounded-xl bg-[#4dd9ac] text-[#011a14] px-5 py-2.5 text-sm font-extrabold hover:brightness-110 hover:gap-3 transition-all duration-200 shadow-xl shadow-[#4dd9ac]/20">
                    Email support <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
              </section>
            </main>

            {/* ── Sidebar ──────────────────────────────────────── */}
            <aside className="space-y-5">
              {/* Contact form card */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden sticky top-4">
                {/* card header */}
                <div className="bg-gradient-to-r from-[#02665e] to-[#024d47] p-5">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-white/15 flex items-center justify-center">
                      <MessageCircle className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-white">Still need help?</p>
                      <p className="text-[11px] text-white/70 mt-0.5">We typically respond within 24 hours</p>
                    </div>
                  </div>
                </div>

                <div className="p-5">
                  <form onSubmit={submitContact} className="space-y-4">
                    <div>
                      <label htmlFor="contact-name" className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                        Name <span className="text-gray-400 font-normal normal-case tracking-normal">(optional)</span>
                      </label>
                      <input id="contact-name" type="text" value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        className="w-full box-border px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#02665e]/30 focus:border-[#02665e] outline-none transition-all bg-slate-50/50 placeholder:text-slate-400"
                        placeholder="Your name" />
                    </div>
                    <div>
                      <label htmlFor="contact-email" className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                        Email <span className="text-rose-500">*</span>
                      </label>
                      <input id="contact-email" type="email" required value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        className="w-full box-border px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#02665e]/30 focus:border-[#02665e] outline-none transition-all bg-slate-50/50 placeholder:text-slate-400"
                        placeholder="your@email.com" />
                    </div>
                    <div>
                      <label htmlFor="contact-message" className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                        Message <span className="text-rose-500">*</span>
                      </label>
                      <textarea id="contact-message" required value={contactMessage}
                        onChange={(e) => setContactMessage(e.target.value)}
                        rows={4}
                        className="w-full box-border px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#02665e]/30 focus:border-[#02665e] outline-none transition-all resize-none bg-slate-50/50 placeholder:text-slate-400"
                        placeholder="How can we help you?" />
                    </div>
                    <button type="submit" disabled={sending}
                      className="w-full py-2.5 rounded-xl bg-[#02665e] text-white text-sm font-extrabold hover:bg-[#024d47] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md">
                      {sending ? "Sending…" : "Send Message"}
                    </button>
                  </form>

                  {sent && (
                    <div className="mt-4 flex items-start gap-2.5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 leading-relaxed">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 flex-shrink-0 mt-1" />
                      {sent}
                    </div>
                  )}
                  {error && (
                    <div className="mt-4 flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 leading-relaxed">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500 flex-shrink-0 mt-1" />
                      {error}
                    </div>
                  )}

                  <div className="mt-5 pt-5 border-t border-slate-100 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-[#02665e]/10 flex items-center justify-center flex-shrink-0">
                      <Mail className="h-3.5 w-3.5 text-[#02665e]" />
                    </div>
                    <div>
                      <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">Direct email</p>
                      <a href="mailto:info@nolsaf.com"
                        className="text-[#02665e] hover:text-[#024d47] text-sm font-bold transition-colors">
                        info@nolsaf.com
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick links card */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-4">Popular guides</p>
                <div className="space-y-1">
                  {[
                    { href: "/help/getting-started", label: "How to make your first booking" },
                    { href: "/help/payments", label: "Accepted payment methods" },
                    { href: "/help/refunds", label: "Cancellation & refund policy" },
                    { href: "/help/owner-guide", label: "Property owner guide" },
                    { href: "/help/become-agent", label: "Become a NoLSAF Agent" },
                    { href: "/help/nolsaf-stand", label: "Register a safari stand" },
                  ].map(({ href, label }) => (
                    <Link key={href} href={href}
                      className="no-underline group flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-slate-50 hover:text-gray-900 transition-all duration-150">
                      <span className="font-medium">{label}</span>
                      <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-[#02665e] flex-shrink-0 transition-colors" />
                    </Link>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
      <HelpFooter />
    </>
  );
}

