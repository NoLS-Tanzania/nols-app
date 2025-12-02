"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Linkedin, Instagram, Youtube, X, Facebook } from "lucide-react";
import SectionSeparator from "./SectionSeparator";

function IconLinkButton({
  href,
  label,
  iconComponent,
  iconSize = 20,
  iconClassName = "",
  iconActiveClass = "",
  containerClassName = "",
  onClick,
}: {
  href: string;
  label: string;
  iconComponent?: React.ComponentType<any> | undefined;
  iconSize?: number;
  iconClassName?: string;
  iconActiveClass?: string;
  containerClassName?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}) {
  const [touched, setTouched] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  const clearTouch = (delay = 600) => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => setTouched(false), delay);
  };

  const onTouchStart = () => {
    setTouched(true);
    // keep visual for a short while after touchend
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
  };

  const onTouchEnd = () => {
    clearTouch(700);
  };

  const onPointerDown = () => {
    setTouched(true);
  };

  const onPointerUp = () => {
    clearTouch(300);
  };

  let clonedIcon: React.ReactNode;
  const IconComp = iconComponent;
  if (IconComp) {
    // create element only if component exists (avoids creating element of undefined)
    clonedIcon = React.createElement(IconComp, {
      size: iconSize,
      'aria-hidden': true,
      className: `${iconClassName ?? ""} ${touched ? iconActiveClass : ""} stroke-current`.trim(),
      strokeWidth: 1.5,
    });
  } else {
    // Fallback if the icon import is missing or invalid (prevents runtime crash)
    // eslint-disable-next-line no-console
    console.warn('PublicFooter: icon component is missing for', label);
    clonedIcon = <span className="inline-block w-5 h-5 rounded-sm bg-gray-300" aria-hidden="true" />;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      aria-label={label}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      className={`inline-flex items-center justify-center p-2 rounded-full no-underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#02665e] transition transform hover:scale-110 ${touched ? 'scale-110' : ''} ${containerClassName}`}
    >
      {clonedIcon}
      <span className="sr-only">{label}</span>
    </a>
  );
}

export default function PublicFooter({ withRail = true }: { withRail?: boolean }) {
  const year = new Date().getFullYear();
  const innerRailClass = withRail ? 'md:ml-56' : '';
  const [contactSubject, setContactSubject] = useState<string>('');
  const [contactBody, setContactBody] = useState<string>('');
  const [newsletterEmail, setNewsletterEmail] = useState<string>('');
  const [newsletterLoading, setNewsletterLoading] = useState(false);
  const [newsletterStatus, setNewsletterStatus] = useState<null | { ok: boolean; message: string }>(null);

  const openMailClient = () => {
    const mailto = `mailto:info@nolsaf.org?subject=${encodeURIComponent(contactSubject)}&body=${encodeURIComponent(contactBody)}`;
    window.location.href = mailto;
  };

  const subscribeNewsletter = async () => {
    setNewsletterStatus(null);
    const email = (newsletterEmail || '').trim();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setNewsletterStatus({ ok: false, message: 'Please enter a valid email address.' });
      return;
    }
    setNewsletterLoading(true);
    try {
      // Best-effort: try application API endpoint
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setNewsletterStatus({ ok: true, message: 'Subscribed — check your inbox.' });
        setNewsletterEmail('');
      } else {
        // show server message if available
        let text = 'Subscription failed';
        try { const j = await res.json(); if (j?.message) text = String(j.message); } catch {}
        setNewsletterStatus({ ok: false, message: text });
      }
    } catch (e) {
      // fallback: instruct user to email
      setNewsletterStatus({ ok: false, message: 'Could not reach server. Please email info@nolsaf.org to subscribe.' });
    } finally {
      setNewsletterLoading(false);
    }
  };
  return (
    <footer className={`w-full mt-12 page-bottom-buffer bg-slate-50`}>
      {/* separator */}
      <SectionSeparator />
      <h2 className="sr-only">Footer</h2>

      <div className={`max-w-6xl mx-auto px-4 py-6 ${innerRailClass}`}>
        {/* Reorganized footer: 3 columns for better balance */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {/* Column 1: Brand + short intro + Newsletter */}
          <div>
            <div className="flex items-start gap-3">
              <Image src="/assets/NoLS2025-04.png" alt="NoLSAF" width={100} height={28} className="object-contain" />
            </div>
            <p className="text-sm text-gray-600 mt-3">NoLSAF connects travellers, owners and drivers with safe, local stays and services across Tanzania.</p>

            {/* Newsletter signup moved here for prominence */}
            <div className="mt-4">
              <label htmlFor="newsletter-email-2" className="text-sm font-medium text-gray-800 block mb-2">Newsletter</label>
              <div className="flex gap-2">
                <input
                  id="newsletter-email-2"
                  type="email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="Your email"
                  className="flex-1 border rounded-xl px-3 py-2 text-sm"
                  aria-label="Newsletter email"
                />
                <button
                  className={`px-3 py-2 rounded-xl border bg-[#02665e] text-white text-sm ${newsletterLoading ? 'opacity-70 cursor-wait' : 'hover:bg-[#02564f]'}`}
                  onClick={subscribeNewsletter}
                  disabled={newsletterLoading}
                >
                  {newsletterLoading ? 'Subscribing…' : 'Subscribe'}
                </button>
              </div>
              {newsletterStatus && (
                <div className={`mt-2 text-sm ${newsletterStatus.ok ? 'text-emerald-600' : 'text-rose-600'}`}>{newsletterStatus.message}</div>
              )}
            </div>
          </div>

          {/* Column 2: About + Resources (two stacked lists) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">About NoLSAF</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/about/who" className="text-gray-700 hover:text-[#02665e] no-underline">Who are we</Link></li>
                <li><Link href="/about/what" className="text-gray-700 hover:text-[#02665e] no-underline">What we do</Link></li>
                <li><Link href="/about/why" className="text-gray-700 hover:text-[#02665e] no-underline">Why us</Link></li>
                <li><Link href="/about/story" className="text-gray-700 hover:text-[#02665e] no-underline">Our Best Story</Link></li>
              </ul>

              {/* Move Contact here under About */}
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-800 mb-2">Contact</h4>
                <label htmlFor="contact-subject-about" className="sr-only">Subject</label>
                <input
                  id="contact-subject-about"
                  type="text"
                  value={contactSubject}
                  onChange={(e) => setContactSubject(e.target.value)}
                  onFocus={() => { if (!contactSubject) setContactSubject('Inquiry from website'); }}
                  placeholder="Subject (optional)"
                  className="w-full mb-2 border rounded px-2 py-1 text-sm"
                />

                <label htmlFor="contact-body-about" className="sr-only">Message</label>
                <textarea
                  id="contact-body-about"
                  value={contactBody}
                  onChange={(e) => setContactBody(e.target.value)}
                  placeholder="Write your message here..."
                  className="w-full h-24 border rounded px-2 py-1 text-sm resize-y"
                />

                <div className="mt-2">
                  <button
                    className="px-3 py-2 rounded-xl border bg-[#02665e] text-white text-sm"
                    onClick={(e) => { e.preventDefault(); openMailClient(); }}
                  >
                    Email NoLSAF
                  </button>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Resources</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/version" className="text-gray-700 hover:text-[#02665e] no-underline">v0.1.0</Link></li>
                <li><Link href="/careers" className="text-gray-700 hover:text-[#02665e] no-underline">Careers</Link></li>
                <li><Link href="/blog" className="text-gray-700 hover:text-[#02665e] no-underline">Blog</Link></li>
                <li><Link href="/help" className="text-gray-700 hover:text-[#02665e] no-underline">Help Center</Link></li>
              </ul>
            </div>
          </div>

          {/* Column 3: Contact card + Legal */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <button onClick={() => window.dispatchEvent(new CustomEvent('open-legal', { detail: { type: 'terms' } }))} className="text-[#02665e] font-semibold no-underline hover:no-underline">Terms of Service</button>
              </li>
              <li>
                <button onClick={() => window.dispatchEvent(new CustomEvent('open-legal', { detail: { type: 'privacy' } }))} className="text-[#02665e] font-semibold no-underline hover:no-underline">Privacy Policy</button>
              </li>
              <li>
                <button onClick={() => window.dispatchEvent(new CustomEvent('open-legal', { detail: { type: 'security' } }))} className="text-[#02665e] font-semibold no-underline hover:no-underline">Security Policy</button>
              </li>
            </ul>
          </div>
        </div>
        {/* separator above the centered logo */}
        <SectionSeparator className="my-4" />

        {/* Centered logo and copyright (centered within footer) */}
        <div className="w-full flex flex-col items-center gap-1 mt-1">
          <Image src="/assets/NoLS2025-04.png" alt="NoLSAF" width={120} height={30} className="object-contain" />
          <div className="text-sm text-[#02665e] font-semibold">© {year} NoLSAF — All rights reserved</div>
        </div>

        {/* Social icons below the centered logo */}
        <div className="w-full flex justify-center mt-3">
          <div className="flex items-center gap-3">
            <IconLinkButton href="https://www.linkedin.com/company/nolsaf" label="NoLSAF on LinkedIn" iconComponent={Linkedin} iconSize={20} iconClassName="text-[#0A66C2] transition-colors hover:text-[#084A9A]" iconActiveClass="text-[#084A9A]" />
            <IconLinkButton href="https://www.instagram.com/nolsaf" label="NoLSAF on Instagram" iconComponent={Instagram} iconSize={20} iconClassName="text-[#E4405F] transition-colors hover:text-[#C32B4E]" iconActiveClass="text-[#C32B4E]" />
            <IconLinkButton href="https://www.youtube.com/@nolsaf" label="NoLSAF on YouTube" iconComponent={Youtube} iconSize={20} iconClassName="text-[#FF0000] transition-colors hover:text-[#CC0000]" iconActiveClass="text-[#CC0000]" />
            <IconLinkButton href="https://x.com/nolsaf" label="NoLSAF on X" iconComponent={X} iconSize={20} iconClassName="text-[#000000] transition-colors hover:text-[#111111]" iconActiveClass="text-[#111111]" />
            <IconLinkButton href="https://www.facebook.com/nolsaf" label="NoLSAF on Facebook" iconComponent={Facebook} iconSize={20} iconClassName="text-[#1877F2] transition-colors hover:text-[#165db8]" iconActiveClass="text-[#165db8]" />
          </div>
        </div>
      </div>
    </footer>
  );
}
