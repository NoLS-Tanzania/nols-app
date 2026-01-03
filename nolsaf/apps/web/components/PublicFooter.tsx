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
  delay = 0,
}: {
  href: string;
  label: string;
  iconComponent?: React.ComponentType<any> | undefined;
  iconSize?: number;
  iconClassName?: string;
  iconActiveClass?: string;
  containerClassName?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  delay?: number;
}) {
  const [touched, setTouched] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
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
    clonedIcon = React.createElement(IconComp, {
      size: iconSize,
      'aria-hidden': true,
      className: `${iconClassName ?? ""} ${touched ? iconActiveClass : ""} stroke-current transition-all duration-300`.trim(),
      strokeWidth: 1.5,
    });
  } else {
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
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ animationDelay: `${delay}ms` }}
      className={`inline-flex items-center justify-center p-3 rounded-full no-underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#02665e] transition-all duration-300 transform hover:scale-110 hover:rotate-3 hover:shadow-lg ${touched ? 'scale-110 rotate-3' : ''} ${containerClassName} relative`}
    >
      <span className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
      {clonedIcon}
      <span className="sr-only">{label}</span>
    </a>
  );
}

export default function PublicFooter({ withRail = true }: { withRail?: boolean }) {
  const year = new Date().getFullYear();
  const [newsletterEmail, setNewsletterEmail] = useState<string>('');
  const [newsletterLoading, setNewsletterLoading] = useState(false);
  const [newsletterStatus, setNewsletterStatus] = useState<null | { ok: boolean; message: string }>(null);

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
      setNewsletterStatus({ ok: false, message: 'Could not reach server. Please email info@nolsaf.com to subscribe.' });
    } finally {
      setNewsletterLoading(false);
    }
  };
  const [isVisible, setIsVisible] = useState(false);
  const footerRef = useRef<HTMLElement>(null);

  // Set navigation context for policy pages
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('navigationContext', 'public');
    }
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (footerRef.current) {
      observer.observe(footerRef.current);
    }

    return () => {
      if (footerRef.current) {
        observer.unobserve(footerRef.current);
      }
    };
  }, []);

  return (
    <footer 
      ref={footerRef}
      className={`w-full mt-12 page-bottom-buffer bg-gradient-to-b from-slate-50 via-white to-slate-50 relative overflow-hidden`}
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#02665e]/5 via-transparent to-blue-500/5 pointer-events-none" />
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#02665e]/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '1s' }} />
      </div>

      {/* separator */}
      <div className={`relative transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <SectionSeparator />
      </div>
      <h2 className="sr-only">Footer</h2>

      <div className="public-container py-8 md:py-12 relative z-10">
        {/* Reorganized footer: 3 balanced columns */}
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10 lg:gap-12 items-start transition-all duration-1000 delay-100 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {/* Column 1: Brand + short intro + Newsletter */}
          <div className="space-y-6 md:space-y-7">
            <div className="flex items-start gap-3 transform transition-all duration-500 hover:scale-105">
              <Image 
                src="/assets/NoLS2025-04.png" 
                alt="NoLSAF" 
                width={120} 
                height={32} 
                className="object-contain transition-all duration-300 hover:brightness-110" 
                style={{ width: "auto", height: "auto" }}
              />
            </div>
            <p className="text-sm text-gray-600 leading-relaxed max-w-sm transition-colors duration-300">
              NoLSAF connects travellers, owners and drivers with safe, local stays and services across East Africa.
            </p>

            <div className="space-y-3 max-w-sm">
              <label htmlFor="newsletter-email-2" className="text-sm font-semibold text-gray-900 block transition-colors duration-300">
                Newsletter
              </label>
              <div className="flex gap-2">
                <input
                  id="newsletter-email-2"
                  type="email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="Your email"
                  className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] transition-all duration-300 bg-white hover:border-gray-300 hover:shadow-sm"
                  aria-label="Newsletter email"
                />
                <button
                  className={`px-5 py-2.5 rounded-lg border border-transparent bg-[#02665e] text-white text-sm font-semibold shadow-sm transition-all duration-300 transform hover:bg-[#024d47] hover:shadow-md hover:scale-[1.02] active:scale-95 ${newsletterLoading ? 'opacity-70 cursor-wait' : ''}`}
                  onClick={subscribeNewsletter}
                  disabled={newsletterLoading}
                >
                  {newsletterLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span className="hidden sm:inline">Subscribing…</span>
                    </span>
                  ) : 'Subscribe'}
                </button>
              </div>
              {newsletterStatus && (
                <div className={`text-sm transition-all duration-500 animate-fade-in px-3 py-2 rounded-lg ${newsletterStatus.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {newsletterStatus.message}
                </div>
              )}
            </div>
          </div>

          {/* Column 2: About */}
          <div className="space-y-4 md:space-y-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 transition-colors duration-300">
              About NoLSAF
            </h3>
            <ul className="space-y-2.5 text-sm list-none pl-0">
              {[
                { href: "/about/who", label: "Who are we" },
                { href: "/about/what", label: "What we do" },
                { href: "/about/why", label: "Why us" },
                { href: "/about/story", label: "Our Best Story" },
              ].map((item, index) => (
                <li 
                  key={item.href} 
                  style={{ animationDelay: `${200 + index * 50}ms` }} 
                  className={isVisible ? "opacity-0 animate-fade-in-up" : "opacity-0"}
                >
                  <Link 
                    href={item.href} 
                    className="text-gray-600 hover:text-[#02665e] no-underline transition-all duration-300 inline-flex items-center gap-2 group py-1.5 px-2 -mx-2 rounded-md hover:bg-[#02665e]/5"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#02665e] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <span className="group-hover:font-medium transition-all duration-300">{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Resources */}
          <div className="space-y-4 md:space-y-5">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 transition-colors duration-300">
                Resources
              </h3>
              <ul className="space-y-2.5 text-sm list-none pl-0">
                {[
                  { href: "/version", label: "v0.1.0" },
                  { href: "/careers", label: "Careers" },
                  { href: "/help", label: "Help Center" },
                ].map((item, index) => (
                  <li 
                    key={item.href} 
                    style={{ animationDelay: `${300 + index * 50}ms` }} 
                    className={isVisible ? "opacity-0 animate-fade-in-up" : "opacity-0"}
                  >
                    <Link 
                      href={item.href} 
                      className="text-gray-600 hover:text-[#02665e] no-underline transition-all duration-300 inline-flex items-center gap-2 group py-1.5 px-2 -mx-2 rounded-md hover:bg-[#02665e]/5"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#02665e] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <span className="group-hover:font-medium transition-all duration-300">{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Full-width legal bar */}
        <div className={`w-full mt-10 pt-6 border-t border-slate-200/60 transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-700 font-semibold">
            {[
              { href: "/terms", label: "Terms of Service" },
              { href: "/privacy", label: "Privacy Policy" },
              { href: "/cookies-policy", label: "Cookies Policy" },
              { href: "/verification-policy", label: "Verification Policy" },
              { href: "/cancellation-policy", label: "Cancellation Policy" },
            ].map((item, index) => (
              <Link 
                key={item.href}
                href={item.href} 
                className="text-slate-700 hover:text-[#02665e] hover:underline no-underline transition-all duration-300 relative group px-2 py-1 rounded-md hover:bg-slate-100/50"
                style={{ animationDelay: `${400 + index * 100}ms` }}
              >
                {item.label}
                <span className="absolute inset-0 rounded-md bg-[#02665e]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Link>
            ))}
          </div>
        </div>

        {/* separator above the centered logo */}
        <div className={`transition-all duration-1000 delay-400 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
          <SectionSeparator className="my-8" />
        </div>

        {/* Centered logo and copyright */}
        <div className={`w-full flex flex-col items-center gap-3 mt-4 transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="transform transition-all duration-500 hover:scale-110">
            <Image 
              src="/assets/NoLS2025-04.png" 
              alt="NoLSAF" 
              width={120} 
              height={30} 
              className="object-contain transition-all duration-300 hover:brightness-110 drop-shadow-sm" 
              style={{ width: "auto", height: "auto" }}
            />
          </div>
          <div className="text-sm text-[#02665e] font-semibold transition-colors duration-300">
            © {year} NoLSAF — All rights reserved
          </div>
        </div>

        {/* Social icons below the centered logo */}
        <div className={`w-full flex justify-center mt-6 transition-all duration-1000 delay-600 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <div
              style={{ animationDelay: '600ms' }}
              className={isVisible ? "opacity-0 animate-fade-in-up" : "opacity-0"}
            >
              <IconLinkButton 
                href="https://www.linkedin.com/company/nolsaf" 
                label="NoLSAF on LinkedIn" 
                iconComponent={Linkedin} 
                iconSize={20} 
                iconClassName="text-[#0A66C2] relative z-10" 
                iconActiveClass="text-[#084A9A]" 
                containerClassName="bg-white/80 backdrop-blur-sm border border-slate-200/50 hover:bg-[#0A66C2]/10 hover:border-[#0A66C2]/30"
                delay={0}
              />
            </div>
            <div
              style={{ animationDelay: '700ms' }}
              className={isVisible ? "opacity-0 animate-fade-in-up" : "opacity-0"}
            >
              <IconLinkButton 
                href="https://www.instagram.com/nolsaf" 
                label="NoLSAF on Instagram" 
                iconComponent={Instagram} 
                iconSize={20} 
                iconClassName="text-[#E4405F] relative z-10" 
                iconActiveClass="text-[#C32B4E]" 
                containerClassName="bg-white/80 backdrop-blur-sm border border-slate-200/50 hover:bg-[#E4405F]/10 hover:border-[#E4405F]/30"
                delay={100}
              />
            </div>
            <div
              style={{ animationDelay: '800ms' }}
              className={isVisible ? "opacity-0 animate-fade-in-up" : "opacity-0"}
            >
              <IconLinkButton 
                href="https://www.youtube.com/@nolsaf" 
                label="NoLSAF on YouTube" 
                iconComponent={Youtube} 
                iconSize={20} 
                iconClassName="text-[#FF0000] relative z-10" 
                iconActiveClass="text-[#CC0000]" 
                containerClassName="bg-white/80 backdrop-blur-sm border border-slate-200/50 hover:bg-[#FF0000]/10 hover:border-[#FF0000]/30"
                delay={200}
              />
            </div>
            <div
              style={{ animationDelay: '900ms' }}
              className={isVisible ? "opacity-0 animate-fade-in-up" : "opacity-0"}
            >
              <IconLinkButton 
                href="https://x.com/nolsaf" 
                label="NoLSAF on X" 
                iconComponent={X} 
                iconSize={20} 
                iconClassName="text-[#000000] relative z-10" 
                iconActiveClass="text-[#111111]" 
                containerClassName="bg-white/80 backdrop-blur-sm border border-slate-200/50 hover:bg-black/10 hover:border-black/30"
                delay={300}
              />
            </div>
            <div
              style={{ animationDelay: '1000ms' }}
              className={isVisible ? "opacity-0 animate-fade-in-up" : "opacity-0"}
            >
              <IconLinkButton 
                href="https://www.facebook.com/nolsaf" 
                label="NoLSAF on Facebook" 
                iconComponent={Facebook} 
                iconSize={20} 
                iconClassName="text-[#1877F2] relative z-10" 
                iconActiveClass="text-[#165db8]" 
                containerClassName="bg-white/80 backdrop-blur-sm border border-slate-200/50 hover:bg-[#1877F2]/10 hover:border-[#1877F2]/30"
                delay={400}
              />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
