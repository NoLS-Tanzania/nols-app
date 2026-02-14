"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Linkedin, Instagram, Youtube, X, Facebook } from "lucide-react";

type FooterPillVariant = "brand" | "neutral";

const APP_VERSION = "v0.1.0";

function FooterPolicyItem({
  children,
  href,
}: {
  children: React.ReactNode;
  href: string;
}) {
  const className =
    "group relative inline-flex appearance-none items-center rounded-md border border-transparent bg-transparent px-2.5 py-1.5 text-sm font-semibold cursor-pointer " +
    "text-slate-200 no-underline transition-all duration-300 ease-out " +
    "hover:text-white hover:bg-white/10 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#02665e]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 " +
    "motion-reduce:transition-none";

  return (
    <Link href={href} className={className}>
      <span className="relative">
        {children}
        <span className="pointer-events-none absolute -bottom-1 left-0 h-px w-0 bg-gradient-to-r from-[#02665e] to-sky-500 transition-all duration-300 group-hover:w-full" />
      </span>
    </Link>
  );
}

function FooterPill({
  children,
  href,
  variant = "brand",
}: {
  children: React.ReactNode;
  href: string;
  variant?: FooterPillVariant;
}) {
  const base =
    "group relative inline-flex items-center rounded-full border bg-white/10 px-3 py-1.5 text-xs font-semibold no-underline overflow-hidden " +
    "transition-[transform,background-color,border-color,color] duration-300 ease-out " +
    "hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.99] " +
    "motion-reduce:transition-none motion-reduce:hover:transform-none motion-reduce:active:transform-none";

  const brand =
    "border-white/15 text-emerald-200 hover:bg-white/15 hover:border-white/25 focus-visible:ring-2 focus-visible:ring-[#02665e]/25";
  const neutral =
    "border-white/15 text-slate-200 hover:bg-white/10 hover:border-white/25 focus-visible:ring-2 focus-visible:ring-white/20";

  const overlayTint =
    variant === "brand"
      ? "bg-gradient-to-b from-[#02665e]/20 to-[#02665e]/10"
      : "bg-gradient-to-b from-white/10 to-white/0";

  const overlayShine = variant === "brand" ? "via-white/70" : "via-slate-200/80";

  const className = `${base} ${variant === "brand" ? brand : neutral}`;

  return (
    <Link href={href} className={className}>
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100 ${overlayTint}`}
      />
      <span
        aria-hidden
        className={`pointer-events-none absolute -inset-y-2 -left-1/3 w-1/3 rotate-12 bg-gradient-to-r from-transparent ${overlayShine} to-transparent opacity-0 blur-[1px] transition-all duration-500 ease-out group-hover:left-full group-hover:opacity-60 motion-reduce:hidden`}
      />
      <span className="relative z-10">{children}</span>
    </Link>
  );
}

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
      style={{ animationDelay: `${delay}ms` }}
      className={`group relative inline-flex items-center justify-center rounded-full no-underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#02665e]/30 focus:ring-offset-slate-950 transition-all duration-300 ease-out transform hover:-translate-y-[1px] hover:shadow-md active:translate-y-0 active:shadow-sm ${touched ? "-translate-y-[1px]" : ""} ${containerClassName}`}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-white/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />
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
    } catch {
      // fallback: instruct user to email
      setNewsletterStatus({ ok: false, message: 'Could not reach server. Please email info@nolsaf.com to subscribe.' });
    } finally {
      setNewsletterLoading(false);
    }
  };
  // Set navigation context for policy pages
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('navigationContext', 'public');
    }
  }, []);

  return (
    <footer
      aria-label="Footer"
      className="relative w-full mt-10 page-bottom-buffer overflow-hidden border-t border-gray-200/70 bg-gradient-to-b from-white via-slate-50 to-white"
    >
      <h2 className="sr-only">Footer</h2>

      {withRail ? (
        <div aria-hidden className="absolute inset-x-0 top-0 h-1 flex">
          <span className="footer-rail-seg footer-rail-green w-[34%]" />
          <span className="footer-rail-seg footer-rail-yellow w-[8%]" />
          <span className="footer-rail-seg footer-rail-black w-[8%]" />
          <span className="footer-rail-seg footer-rail-blue w-[50%]" />
        </div>
      ) : null}

      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(2,102,94,0.22),transparent_70%)] blur-2xl"
      />

      <div className="public-container pt-10 pb-10 relative z-10">
        <div className="rounded-3xl border border-white/12 bg-gradient-to-b from-slate-950/85 via-slate-900/80 to-slate-950/85 backdrop-blur-xl shadow-[0_18px_70px_rgba(0,0,0,0.45)] text-slate-200">
          <div className="px-5 py-8 sm:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-5 space-y-4">
                <div className="flex items-start gap-3">
                  <Image
                    src="/assets/NoLS2025-04.png"
                    alt="NoLSAF"
                    width={120}
                    height={32}
                    className="object-contain brightness-0 invert"
                    style={{ width: "auto", height: "auto" }}
                  />
                  <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-slate-200">
                    {APP_VERSION}
                  </span>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed max-w-sm">
                  NoLSAF connects travellers, owners and drivers with safe, local stays and services across East Africa.
                </p>

                <div className="flex items-center gap-3 pt-2 flex-wrap">
                  <IconLinkButton
                    href="https://www.linkedin.com/company/nolsaf"
                    label="NoLSAF on LinkedIn"
                    iconComponent={Linkedin}
                    iconSize={20}
                    iconClassName="text-[#0A66C2] relative z-10"
                    iconActiveClass="text-[#084A9A]"
                    containerClassName="h-11 w-11 bg-white/10 backdrop-blur-sm border border-white/15 hover:bg-white/15 hover:border-white/25"
                    delay={0}
                  />
                  <IconLinkButton
                    href="https://www.instagram.com/nolsaf"
                    label="NoLSAF on Instagram"
                    iconComponent={Instagram}
                    iconSize={20}
                    iconClassName="text-[#E4405F] relative z-10"
                    iconActiveClass="text-[#C32B4E]"
                    containerClassName="h-11 w-11 bg-white/10 backdrop-blur-sm border border-white/15 hover:bg-white/15 hover:border-white/25"
                    delay={100}
                  />
                  <IconLinkButton
                    href="https://www.youtube.com/@nolsaf"
                    label="NoLSAF on YouTube"
                    iconComponent={Youtube}
                    iconSize={20}
                    iconClassName="text-[#FF0000] relative z-10"
                    iconActiveClass="text-[#CC0000]"
                    containerClassName="h-11 w-11 bg-white/10 backdrop-blur-sm border border-white/15 hover:bg-white/15 hover:border-white/25"
                    delay={200}
                  />
                  <IconLinkButton
                    href="https://x.com/nolsaf"
                    label="NoLSAF on X"
                    iconComponent={X}
                    iconSize={20}
                    iconClassName="text-white relative z-10"
                    iconActiveClass="text-white"
                    containerClassName="h-11 w-11 bg-white/10 backdrop-blur-sm border border-white/15 hover:bg-white/15 hover:border-white/25"
                    delay={300}
                  />
                  <IconLinkButton
                    href="https://www.facebook.com/nolsaf"
                    label="NoLSAF on Facebook"
                    iconComponent={Facebook}
                    iconSize={20}
                    iconClassName="text-[#1877F2] relative z-10"
                    iconActiveClass="text-[#165db8]"
                    containerClassName="h-11 w-11 bg-white/10 backdrop-blur-sm border border-white/15 hover:bg-white/15 hover:border-white/25"
                    delay={400}
                  />
                </div>
              </div>

              <div className="lg:col-span-7">
                <div className="rounded-2xl border border-white/12 bg-white/6 backdrop-blur-sm p-5 shadow-sm shadow-black/20">
                  <div className="flex flex-col gap-1">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-slate-100 w-fit">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-300" />
                      Newsletter
                    </div>
                    <div className="text-sm text-slate-300">
                      Monthly updates on new stays, destinations, and platform improvements.
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col sm:flex-row gap-2">
                    <form
                      className="flex flex-1 flex-col sm:flex-row gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!newsletterLoading) void subscribeNewsletter();
                      }}
                    >
                      <label htmlFor="newsletter-email-2" className="sr-only">
                        Newsletter email
                      </label>
                      <input
                        id="newsletter-email-2"
                        type="email"
                        value={newsletterEmail}
                        onChange={(e) => setNewsletterEmail(e.target.value)}
                        placeholder="Your email"
                        autoComplete="email"
                        className="flex-1 border border-white/12 rounded-xl px-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#02665e]/25 focus:border-[#02665e] transition-all duration-300 bg-white/10 text-slate-100 placeholder:text-slate-400 hover:border-white/20"
                        aria-label="Newsletter email"
                      />
                      <button
                        type="submit"
                        className={`px-5 py-2.5 rounded-xl border border-transparent bg-[#02665e] text-white text-sm font-semibold shadow-sm transition-all duration-300 hover:bg-[#024d47] active:scale-[0.99] ${newsletterLoading ? "opacity-70 cursor-wait" : ""}`}
                        disabled={newsletterLoading}
                      >
                        {newsletterLoading ? (
                          <span className="flex items-center gap-2">
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span className="hidden sm:inline">Subscribing…</span>
                          </span>
                        ) : (
                          "Subscribe"
                        )}
                      </button>
                    </form>
                  </div>

                  {newsletterStatus ? (
                    <div
                      className={`mt-3 text-sm px-3 py-2 rounded-xl ${newsletterStatus.ok ? "bg-emerald-500/10 text-emerald-200 border border-emerald-400/20" : "bg-red-500/10 text-red-200 border border-red-400/20"}`}
                      role="status"
                      aria-live="polite"
                    >
                      {newsletterStatus.message}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="space-y-3">
                <h3 className="text-base font-semibold text-white">About NoLSAF</h3>
                <ul className="m-0 list-none p-0 space-y-1">
                  {[
                    { href: "/about/who", label: "Who are we" },
                    { href: "/about/what", label: "What we do" },
                    { href: "/about/why", label: "Why us" },
                    { href: "/about/story", label: "Our Best Story" },
                  ].map((item) => (
                    <li key={item.href}>
                      <FooterPolicyItem href={item.href}>{item.label}</FooterPolicyItem>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="text-base font-semibold text-white">Resources</h3>
                <ul className="m-0 list-none p-0 space-y-1">
                  {[
                    { href: "/help", label: "Help Center" },
                    { href: "/careers", label: "Careers" },
                  ].map((item) => (
                    <li key={item.href}>
                      <FooterPolicyItem href={item.href}>{item.label}</FooterPolicyItem>
                    </li>
                  ))}
                  <li>
                    <span className="inline-flex items-center px-2.5 py-1.5 text-sm font-semibold text-slate-200">
                      Version: <span className="ml-1 text-slate-400">{APP_VERSION}</span>
                    </span>
                  </li>
                </ul>
              </div>

              <div className="col-span-2 lg:col-span-1 space-y-3">
                <h3 className="text-base font-semibold text-white">Portals</h3>
                <ul className="m-0 list-none p-0 grid grid-cols-2 gap-x-6 gap-y-1">
                  {[
                    { href: "/account/register?mode=register&role=owner&next=%2Fowner", label: "Owner Portal" },
                    { href: "/account/register?mode=register&role=driver&next=%2Fdriver", label: "Driver Portal" },
                  ].map((item) => (
                    <li key={item.href}>
                      <FooterPolicyItem href={item.href}>{item.label}</FooterPolicyItem>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-8">
              <div className="h-px w-full bg-gradient-to-r from-transparent via-white/15 to-transparent" />
              <nav aria-label="Footer legal navigation" className="mt-4">
                <ul className="m-0 flex list-none flex-wrap items-center justify-center gap-2.5 p-0">
                  {[
                    { href: "/terms", label: "Terms" },
                    { href: "/privacy", label: "Privacy" },
                    { href: "/cookies-policy", label: "Cookies" },
                    { href: "/verification-policy", label: "Verification" },
                    { href: "/cancellation-policy", label: "Cancellation" },
                  ].map((item, index) => (
                    <li
                      key={item.href}
                      className={
                        index === 0
                          ? ""
                          : "lg:relative lg:pl-4 lg:before:content-[''] lg:before:absolute lg:before:left-1 lg:before:top-1/2 lg:before:-translate-y-1/2 lg:before:h-4 lg:before:w-px lg:before:bg-white/15"
                      }
                    >
                      <FooterPolicyItem href={item.href}>{item.label}</FooterPolicyItem>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>

            <div className="mt-8">
              <div className="h-px w-full bg-gradient-to-r from-transparent via-white/15 to-transparent" />
              <div className="mt-5 flex flex-col items-center gap-2">
                <div className="text-xs sm:text-sm text-slate-300 text-center">
                  <span className="font-semibold text-slate-200">© {year} </span>
                  <span className="font-extrabold text-emerald-200 tracking-wide">NoLSAF</span>
                  <span className="text-slate-400"> — All rights reserved</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
