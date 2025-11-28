"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Linkedin, Instagram, Youtube, X, Facebook, Mail } from "lucide-react";
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

  const openMailClient = () => {
    const mailto = `mailto:info@nolsaf.org?subject=${encodeURIComponent(contactSubject)}&body=${encodeURIComponent(contactBody)}`;
    window.location.href = mailto;
  };
  return (
    <footer className={`w-full mt-12 page-bottom-buffer bg-slate-50`}>
      {/* full-width separator line styled with Tanzania flag colors (green, yellow, black, blue) */}
      <div className="w-full h-1 flex" aria-hidden>
        <span className="flex-1 footer-rail-seg footer-rail-green" />
        <span className="flex-1 footer-rail-seg footer-rail-yellow" />
        <span className="flex-1 footer-rail-seg footer-rail-black" />
        <span className="flex-1 footer-rail-seg footer-rail-blue" />
      </div>
      <h2 className="sr-only">Footer</h2>

      <div className={`max-w-6xl mx-auto px-4 py-6 ${innerRailClass}`}>
        {/* 5-column responsive footer for public pages */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
          {/* Column 1: About NoLSAF (vertical links) */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">About NoLSAF</h3>
            <ul className="space-y-2 text-sm list-none p-0 m-0">
              <li>
                <a href="/about/who" className="block w-full text-left text-gray-700 hover:text-[#02665e] no-underline px-2 py-1 rounded hover:bg-[#02665e]/10 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#02665e]">Who are we</a>
              </li>
              <li>
                <a href="/about/what" className="block w-full text-left text-gray-700 hover:text-[#02665e] no-underline px-2 py-1 rounded hover:bg-[#02665e]/10 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#02665e]">What we do</a>
              </li>
              <li>
                <a href="/about/why" className="block w-full text-left text-gray-700 hover:text-[#02665e] no-underline px-2 py-1 rounded hover:bg-[#02665e]/10 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#02665e]">Why us</a>
              </li>
              <li>
                <a href="/about/story" className="block w-full text-left text-gray-700 hover:text-[#02665e] no-underline px-2 py-1 rounded hover:bg-[#02665e]/10 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#02665e]">Our Best Story</a>
              </li>
            </ul>
          </div>

          {/* Column 2: Contact card (compose message) */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Contact NoLSAF</h3>
            <div className="p-0">
              <label htmlFor="contact-subject" className="sr-only">Subject</label>
              <input
                id="contact-subject"
                type="text"
                value={contactSubject}
                onChange={(e) => setContactSubject(e.target.value)}
                onFocus={() => { if (!contactSubject) setContactSubject('Inquiry from website'); }}
                placeholder="Subject (optional)"
                className="w-full mb-2 border rounded px-2 py-1 text-sm"
              />

              <label htmlFor="contact-body" className="sr-only">Message</label>
              <textarea
                id="contact-body"
                value={contactBody}
                onChange={(e) => setContactBody(e.target.value)}
                placeholder="Write your message here..."
                className="w-full h-24 border rounded px-2 py-1 text-sm resize-y"
              />

              <div className="mt-2 flex items-center gap-2">
                {/* mailto icon button (opens mail client on touch/click) */}
                <IconLinkButton
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    openMailClient();
                  }}
                  label="Email NoLSAF"
                  iconComponent={Mail}
                  iconSize={18}
                  iconClassName="text-white"
                  containerClassName="bg-[#02665e]"
                />

                
              </div>
            </div>
          </div>

          {/* Column 3: Legal / Links */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Legal & Links</h3>
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

          {/* Column 4: Resources / Version */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Resources</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/version" className="text-gray-700 hover:text-[#02665e] no-underline">v0.1.0</Link></li>
            </ul>
          </div>

          {/* removed reserved column to make a 4-column layout */}
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
