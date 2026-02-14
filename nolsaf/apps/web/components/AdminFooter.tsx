"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

type FooterPillVariant = 'brand' | 'neutral';

function FooterPolicyItem({
  children,
  href,
  onClick,
}: {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
}) {
  const className =
    'group relative inline-flex appearance-none items-center rounded-md border border-transparent bg-transparent px-2.5 py-1.5 text-sm font-semibold cursor-pointer ' +
    'text-slate-700 no-underline transition-all duration-300 ease-out ' +
    'hover:text-[#02665e] hover:bg-slate-100/70 ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#02665e]/25 focus-visible:ring-offset-2 focus-visible:ring-offset-white ' +
    'motion-reduce:transition-none';

  const content = (
    <span className="relative">
      {children}
      <span className="pointer-events-none absolute -bottom-1 left-0 h-px w-0 bg-gradient-to-r from-[#02665e] to-sky-500 transition-all duration-300 group-hover:w-full" />
    </span>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <a
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={className}
    >
      {content}
    </a>
  );
}

function FooterPill({
  children,
  href,
  onClick,
  variant = 'brand',
}: {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: FooterPillVariant;
}) {
  const base =
    'group relative inline-flex items-center rounded-full border bg-white px-3 py-1.5 text-xs font-semibold no-underline overflow-hidden ' +
    'transition-[transform,background-color,border-color,color] duration-300 ease-out ' +
    'hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.99] ' +
    'motion-reduce:transition-none motion-reduce:hover:transform-none motion-reduce:active:transform-none';

  const brand =
    'border-gray-200/70 text-[#02665e] hover:bg-[#02665e]/10 hover:border-[#02665e]/30 focus-visible:ring-2 focus-visible:ring-[#02665e]/25';
  const neutral =
    'border-gray-200/70 text-slate-700 hover:bg-slate-50 hover:border-slate-300 focus-visible:ring-2 focus-visible:ring-slate-200';

  const overlayTint =
    variant === 'brand'
      ? 'bg-gradient-to-b from-[#02665e]/10 to-[#02665e]/6'
      : 'bg-gradient-to-b from-slate-50 to-white';

  const overlayShine =
    variant === 'brand'
      ? 'via-white/70'
      : 'via-slate-200/80';

  const className = `${base} ${variant === 'brand' ? brand : neutral}`;

  const content = (
    <>
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100 ${overlayTint}`}
      />
      <span
        aria-hidden
        className={`pointer-events-none absolute -inset-y-2 -left-1/3 w-1/3 rotate-12 bg-gradient-to-r from-transparent ${overlayShine} to-transparent opacity-0 blur-[1px] transition-all duration-500 ease-out group-hover:left-full group-hover:opacity-60 motion-reduce:hidden`}
      />
      <span className="relative z-10">{children}</span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}
export default function AdminFooter({
  policyBasePath = "",
  showDriverDisbursementPolicy = true,
  showPropertyOwnerDisbursementPolicy = true,
  containerClassName,
}: {
  policyBasePath?: "" | "/owner" | "/driver" | "/admin";
  showDriverDisbursementPolicy?: boolean;
  showPropertyOwnerDisbursementPolicy?: boolean;
  containerClassName?: string;
}) {
  const year = new Date().getFullYear();
  
  const handleLegalClick = (type: 'terms' | 'privacy' | 'cookies') => {
    window.dispatchEvent(new CustomEvent('open-legal', { detail: { type } }));
  };

  const policyHref = (path: string) => {
    if (!policyBasePath) return path;
    return `${policyBasePath}${path}`;
  };

  const docsHref = policyBasePath === "/owner" ? "/owner/docs" : "/docs";

  return (
    <footer
      aria-label="Footer"
      className="relative overflow-hidden border-t border-gray-200/70 bg-gradient-to-b from-white via-slate-50 to-white"
    >
      <h2 className="sr-only">Footer</h2>

      {/* Tanzania rail */}
      <div aria-hidden className="absolute inset-x-0 top-0 h-1 flex">
        <span className="footer-rail-seg footer-rail-green w-[34%]" />
        <span className="footer-rail-seg footer-rail-yellow w-[8%]" />
        <span className="footer-rail-seg footer-rail-black w-[8%]" />
        <span className="footer-rail-seg footer-rail-blue w-[50%]" />
      </div>

      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(2,102,94,0.16),transparent_70%)] blur-2xl"
      />

      <div className={containerClassName ?? "max-w-6xl mx-auto px-4 pt-10 pb-9"}>
        <div className="rounded-3xl border border-gray-200/70 bg-white/75 backdrop-blur-xl shadow-[0_18px_70px_rgba(2,6,23,0.10)]">
          <div className="px-5 py-8 sm:px-8">
            {/* Header line */}
            <div className="flex flex-col items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-gray-200/70 bg-white px-3 py-1 text-xs font-semibold tracking-wide text-slate-700">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#02665e]" />
                Legal & Platform
              </div>
              <div className="text-center text-sm text-slate-600 max-w-2xl">
                Quick access to policies, docs, and platform information.
              </div>
            </div>

            {/* Links */}
            <nav aria-label="Footer navigation" className="mt-6">
              <ul className="m-0 flex list-none flex-wrap items-center justify-center gap-2.5 p-0">
                <li>
                  {policyBasePath ? (
                    <FooterPolicyItem href={policyHref('/terms')}>Terms of Service</FooterPolicyItem>
                  ) : (
                    <FooterPolicyItem onClick={() => handleLegalClick('terms')}>Terms of Service</FooterPolicyItem>
                  )}
                </li>
                <li className="lg:relative lg:pl-4 lg:before:content-[''] lg:before:absolute lg:before:left-1 lg:before:top-1/2 lg:before:-translate-y-1/2 lg:before:h-4 lg:before:w-px lg:before:bg-slate-200/80">
                  {policyBasePath ? (
                    <FooterPolicyItem href={policyHref('/privacy')}>Privacy Policy</FooterPolicyItem>
                  ) : (
                    <FooterPolicyItem onClick={() => handleLegalClick('privacy')}>Privacy Policy</FooterPolicyItem>
                  )}
                </li>
                <li className="lg:relative lg:pl-4 lg:before:content-[''] lg:before:absolute lg:before:left-1 lg:before:top-1/2 lg:before:-translate-y-1/2 lg:before:h-4 lg:before:w-px lg:before:bg-slate-200/80">
                  <FooterPolicyItem href={policyHref('/cookies-policy')}>Cookies Policy</FooterPolicyItem>
                </li>
                <li className="lg:relative lg:pl-4 lg:before:content-[''] lg:before:absolute lg:before:left-1 lg:before:top-1/2 lg:before:-translate-y-1/2 lg:before:h-4 lg:before:w-px lg:before:bg-slate-200/80">
                  <FooterPolicyItem href={policyHref('/verification-policy')}>Verification Policy</FooterPolicyItem>
                </li>
                <li className="lg:relative lg:pl-4 lg:before:content-[''] lg:before:absolute lg:before:left-1 lg:before:top-1/2 lg:before:-translate-y-1/2 lg:before:h-4 lg:before:w-px lg:before:bg-slate-200/80">
                  <FooterPolicyItem href={policyHref('/cancellation-policy')}>Cancellation Policy</FooterPolicyItem>
                </li>
                {showDriverDisbursementPolicy ? (
                  <li className="lg:relative lg:pl-4 lg:before:content-[''] lg:before:absolute lg:before:left-1 lg:before:top-1/2 lg:before:-translate-y-1/2 lg:before:h-4 lg:before:w-px lg:before:bg-slate-200/80">
                    <FooterPolicyItem href={policyHref('/driver-disbursement-policy')}>Driver Disbursement Policy</FooterPolicyItem>
                  </li>
                ) : null}
                {showPropertyOwnerDisbursementPolicy ? (
                  <li className="lg:relative lg:pl-4 lg:before:content-[''] lg:before:absolute lg:before:left-1 lg:before:top-1/2 lg:before:-translate-y-1/2 lg:before:h-4 lg:before:w-px lg:before:bg-slate-200/80">
                    <FooterPolicyItem href={policyHref('/property-owner-disbursement-policy')}>Property Owner Disbursement Policy</FooterPolicyItem>
                  </li>
                ) : null}
              </ul>
            </nav>

            {/* Docs + Version */}
            <div className="mt-7 flex flex-col items-center justify-center gap-3">
              <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
              <div className="flex flex-wrap items-center justify-center gap-2">
                <FooterPill href={docsHref} variant="neutral">
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-300" />
                    Docs
                  </span>
                </FooterPill>
                <FooterPill href="/version" variant="neutral">
                  v0.1.0
                </FooterPill>
              </div>
            </div>

            {/* Copyright */}
            <div className="mt-7 flex flex-col items-center gap-2">
              <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
              <div className="flex flex-col items-center gap-2">
                <div className="transition-transform duration-300 hover:scale-105">
                  <Image
                    src="/assets/NoLS2025-04.png"
                    alt="NoLSAF"
                    width={120}
                    height={30}
                    className="object-contain"
                    style={{ width: "auto", height: "auto" }}
                  />
                </div>
                <div className="text-xs sm:text-sm text-slate-600 text-center">
                  <span className="font-semibold text-slate-800">© {year} </span>
                  <span className="font-extrabold text-[#02665e] tracking-wide">NoLSAF</span>
                  <span className="text-slate-500"> — All rights reserved</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
