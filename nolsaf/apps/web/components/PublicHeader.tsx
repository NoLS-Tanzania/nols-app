"use client";

import Link from "next/link";
import Image from "next/image";
import React, { useEffect, useState, useRef, useMemo } from "react";
import { ChevronDown, Menu, X } from 'lucide-react';
import { REGIONS } from '@/lib/tzRegions';
import UserMenu from '@/components/UserMenu';
import ThemeToggle from "@/components/ThemeToggle";
import GlobalPicker from "@/components/GlobalPicker";
import { usePathname } from "next/navigation";

export default function PublicHeader({
  tools,
  compact = false,
}: {
  /** Optional right-side tools area (e.g. search, login, locale) */
  tools?: React.ReactNode;
  /** smaller height when embedded */
  compact?: boolean;
}) {
  const [authed, setAuthed] = React.useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [scrolled, setScrolled] = useState<boolean>(false);
  const [headerVisible, setHeaderVisible] = useState<boolean>(true);
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [scrollAmount, setScrollAmount] = useState<number>(0);
  const headerRef = useRef<HTMLElement>(null);
  const pathname = usePathname();
  const [isOverHero, setIsOverHero] = useState<boolean>(false);
  const isPublicHome = pathname === "/public";

  // Auth state management
  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/account/me", { credentials: "include" });
        if (!alive) return;
        setAuthed(r.ok);
        return;
      } catch {
        // ignore
      }
      if (!alive) return;
      setAuthed(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Set navigation context for policy pages
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('navigationContext', 'public');
    }
  }, []);

  // Advanced scroll detection with smooth transitions and visual effects
  useEffect(() => {
    let ticking = false;
    let lastScrollTop = 0;
    let scrollTimeout: NodeJS.Timeout | null = null;
    let scrollStopTimeout: NodeJS.Timeout | null = null;
    let publicHideTimeout: NodeJS.Timeout | null = null;
    let lastPublicY = 0;
    let publicHidden = false;
    
    const handleScroll = () => {
      const isPublic = pathname?.startsWith("/public") ?? false;

      // Public pages: hide while scrolling, show again once scrolling stops.
      // This runs outside the rAF/ticking gate so it can't be skipped.
      if (isPublic) {
        const yNow = window.scrollY;
        const delta = Math.abs(yNow - lastPublicY);
        lastPublicY = yNow;

        // Cancel any delayed hide logic (only used on non-public routes).
        if (scrollTimeout) {
          clearTimeout(scrollTimeout);
          scrollTimeout = null;
        }

        if (publicHideTimeout) {
          clearTimeout(publicHideTimeout);
          publicHideTimeout = null;
        }

        // Near the top, always keep header visible.
        if (yNow <= 80) {
          publicHidden = false;
          setHeaderVisible(true);
          if (scrollStopTimeout) {
            clearTimeout(scrollStopTimeout);
            scrollStopTimeout = null;
          }
        } else {
          // Past the top: hide while actively scrolling, then show after a stop debounce.
          // Only trigger state changes on transitions to avoid flicker.
          if (delta > 0.5 && !publicHidden) {
            publicHidden = true;
            setHeaderVisible(false);
          }

          if (scrollStopTimeout) clearTimeout(scrollStopTimeout);
          const scheduledY = yNow;
          scrollStopTimeout = setTimeout(() => {
            // Show only if scroll position has stabilized.
            if (Math.abs(window.scrollY - scheduledY) < 2) {
              publicHidden = false;
              setHeaderVisible(true);
            }
          }, 260);
        }
      }

      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          const scrollDifference = currentScrollY - lastScrollTop;
          const scrollSpeed = Math.abs(scrollDifference);
          const isPublic = pathname?.startsWith("/public") ?? false;
          
          // Calculate scroll progress (0-1) for smooth transitions
          const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
          const progress = Math.min(currentScrollY / Math.max(maxScroll * 0.3, 100), 1);
          setScrollProgress(progress);
          setScrollAmount(currentScrollY);
          // Public home hero coupling: treat header as "over hero" until hero bottom is passed.
          let heroOverNow = false;
          try {
            if (pathname === "/public") {
              const hero = document.getElementById("public-hero");
              if (hero) {
                const rect = hero.getBoundingClientRect();
                // rect.bottom is relative to viewport; consider header "over hero" while hero still intersects the top region
                heroOverNow = rect.bottom > 72;
                setIsOverHero(heroOverNow);
              } else {
                setIsOverHero(false);
              }
            } else {
              setIsOverHero(false);
            }
          } catch {
            // ignore
          }
          
          // Always show header at the very top
          if (currentScrollY < 5) {
            setHeaderVisible(true);
            setScrolled(false);
          } else {
            // Determine scroll direction with better threshold
            if (!isPublic && scrollSpeed > 3) { // Lower threshold for more responsive feel
              if (scrollDifference > 0) {
                // Scrolling down
                // Hide header when scrolling down (with delay for smooth feel)
                if (currentScrollY > 80) {
                  // Clear any existing timeout
                  if (scrollTimeout) clearTimeout(scrollTimeout);
                  // Small delay before hiding for smoother UX
                  scrollTimeout = setTimeout(() => {
                    if (window.scrollY > 80) {
                      setHeaderVisible(false);
                    }
                  }, 150);
                }
              } else {
                // Scrolling up - show immediately
                if (scrollTimeout) clearTimeout(scrollTimeout);
                setHeaderVisible(true);
              }
            }
            
            // Update scrolled state for visual changes
            // On /public, keep header in "hero mode" (transparent/glass) while hero is visible,
            // then switch to the green glass header AFTER the hero ends.
            if (pathname === "/public" && heroOverNow) setScrolled(false);
            else setScrolled(currentScrollY > 15);
          }
          
          lastScrollTop = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    };
    
    // Initial check
    handleScroll();
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeout) clearTimeout(scrollTimeout);
      if (scrollStopTimeout) clearTimeout(scrollStopTimeout);
      if (publicHideTimeout) clearTimeout(publicHideTimeout);
    };
  }, [pathname]);

  const heroBlend = pathname === "/public" && isOverHero ? Math.min(scrollAmount / 180, 1) : 1;
  const isPublicPath = pathname?.startsWith("/public") ?? false;
  // Detect non-public pages (like /account, /help, policy pages, etc.) that need strong visibility
  const isNonPublicPage = !isPublicPath && pathname !== "/public";

  // Header is always dark/glass — matches the premium hero background.
  // 'overHero'  = floating pill state (transparent dark glass, not scrolled yet)
  // 'scrolled'  = compact pill after user scrolls
  const overHero = isPublicPath && pathname === "/public" && isOverHero && !scrolled;
  const headerVariant: "light" | "dark" = "dark";

  const navTextClass    = "text-white";
  const navHoverBgClass = "hover:bg-white/12";
  const navActiveBgClass = "bg-white/[0.14]";
  const navDotBgClass   = "bg-emerald-400";

  // Nav pill: premium dark-glass matching hero outer surround palette
  const chromePillClass = overHero
    ? "bg-[rgba(5,14,35,0.52)] ring-1 ring-white/[0.16] shadow-[0_8px_32px_rgba(0,0,0,0.44)]"
    : scrolled
    ? "bg-[rgba(8,22,50,0.80)] ring-1 ring-[#02665e]/50 shadow-[0_4px_20px_rgba(0,0,0,0.32)]"
    : "bg-[rgba(11,31,92,0.88)] ring-1 ring-white/[0.14] shadow-[0_4px_16px_rgba(0,0,0,0.30)]";

  // Logo handling:
  // - Always use the icon-only logo (no names), same as the footer.
  // - On dark/green header, adjust the icon so it's visible.
  const logoSrc = "/assets/NoLS2025-04.png";
  const logoDims = { width: 64, height: 64 };

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mobileMenuOpen && headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    if (mobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [mobileMenuOpen]);


  // Memoized navigation links for performance
  const navLinks = useMemo(() => [
    { href: '/public', label: 'Home' },
    { href: '/public/properties', label: 'Properties' },
    { href: '/public/group-stays', label: 'Group Stays' },
    { href: '/public/plan-with-us', label: 'Plan With Us' },
    { href: '/public/no4p-ai', label: 'No4P AI' },
  ], []);

  const NavLink = ({ href, children, onClick }: { href: string; children: React.ReactNode; onClick?: () => void }) => {
    const isActive = pathname === href;
    return (
      <Link
        href={href}
        onClick={onClick}
        className={`relative text-white/90 font-medium no-underline rounded-full transition-all duration-300 ease-out hover:text-white hover:bg-white/12 hover:scale-105 active:scale-95 group ${
          isActive ? 'text-white bg-white/[0.14]' : ''
        }`}
        style={{
          fontSize: '13px',
          padding: scrolled ? '6px 12px' : '7px 13px',
          textShadow: '0 1px 3px rgba(0,0,0,0.35)',
          transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <span className="relative z-10">{children}</span>
        {isActive && (
          <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#2dd4bf] shadow-[0_0_8px_rgba(45,212,191,0.90)] transition-all duration-300" />
        )}
        {/* Hover fill */}
        <span className="absolute inset-0 rounded-full transition-all duration-300 transform scale-0 group-hover:scale-100 bg-white/10" />
      </Link>
    );
  };

  return (
    <>
      <header 
        ref={headerRef}
        className={`fixed z-50 text-white ${
          headerVisible 
            ? 'translate-y-0 opacity-100' 
            : '-translate-y-full opacity-0 pointer-events-none'
        } w-full`}
        style={{
          top: 0,
          left: 0,
          right: 0,
          transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1), transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.4s ease-out',
          willChange: 'transform, opacity',
        }}
      >
        <div className="public-container">
          <div
            className={`relative ${compact ? 'h-14' : scrolled ? 'h-16' : 'h-14'}`}
            style={{
              // On /public, the header overlays the hero. Keep a small inset from the top
              // so the header + hero read as a single, intentional composition.
              marginTop: isPublicHome ? 'clamp(10px, 1.5vw, 14px)' : (scrolled ? '10px' : '0'),
              borderRadius: compact ? '20px' : (isPublicHome && !scrolled ? '28px' : '24px'),
              width: '100%',
              // Always constrain width so logo and icons never get clipped to screen edges.
              maxWidth: (overHero || scrolled) ? '1200px' : '100%',
              marginLeft: (overHero || scrolled) ? 'auto' : undefined,
              marginRight: (overHero || scrolled) ? 'auto' : undefined,
              // Naspers-style coupling: transparent over hero, then smoothly fills into our brand glass header.
              // Non-public pages get full opacity for maximum visibility
              // Dark premium glass — matches the hero card background (#05080f) with a subtle emerald tint.
              background: overHero
                ? `linear-gradient(135deg, rgba(8,18,50,${0.62 + heroBlend * 0.14}) 0%, rgba(10,50,100,${0.44 + heroBlend * 0.12}) 55%, rgba(2,102,94,${0.12 + heroBlend * 0.10}) 100%)`
                : scrolled
                ? `linear-gradient(135deg, rgba(8,18,50,${0.90 + scrollProgress * 0.06}) 0%, rgba(10,92,130,${0.60 + scrollProgress * 0.14}) 55%, rgba(2,102,94,${0.50 + scrollProgress * 0.18}) 100%)`
                : isNonPublicPage
                ? `linear-gradient(135deg, #0b1f5c 0%, #0a5c82 52%, #02665e 100%)`
                : `linear-gradient(135deg, rgba(11,31,92,${pathname === "/public" ? (0.18 + heroBlend * 0.60) : 0.92}) 0%, rgba(10,92,130,${pathname === "/public" ? (0.10 + heroBlend * 0.48) : 0.80}) 55%, rgba(2,102,94,${pathname === "/public" ? (0.08 + heroBlend * 0.38) : 0.72}) 100%)`,

              backdropFilter: overHero
                ? `blur(${18 + heroBlend * 8}px) saturate(180%)`
                : isNonPublicPage
                ? `blur(16px) saturate(180%)`
                : scrolled
                ? `blur(${16 + scrollProgress * 6}px) saturate(${160 + scrollProgress * 20}%)`
                : `blur(${6 + heroBlend * 10}px) saturate(${120 + heroBlend * 40}%)`,
              WebkitBackdropFilter: overHero
                ? `blur(${18 + heroBlend * 8}px) saturate(180%)`
                : isNonPublicPage
                ? `blur(16px) saturate(180%)`
                : scrolled
                ? `blur(${16 + scrollProgress * 6}px) saturate(${160 + scrollProgress * 20}%)`
                : `blur(${6 + heroBlend * 10}px) saturate(${120 + heroBlend * 40}%)`,
              boxShadow: overHero
                ? `0 8px 32px rgba(2,102,94,0.18), inset 0 1px 0 rgba(255,255,255,0.10), inset 0 0 0 1px rgba(255,255,255,0.06)`
                : scrolled
                ? `0 12px 36px rgba(8,18,50,0.48), 0 0 0 1px rgba(2,102,94,0.30), inset 0 1px 0 rgba(255,255,255,0.10)`
                : isNonPublicPage
                ? `0 4px 20px rgba(2,102,94,0.28), 0 0 0 1px rgba(255,255,255,0.10)`
                : pathname === "/public" && heroBlend > 0.2
                ? `0 10px 32px rgba(8,18,50,0.32), 0 0 0 1px rgba(2,102,94,0.18)`
                : 'none',
              border: overHero
                ? "none"
                : scrolled
                ? '1px solid rgba(255,255,255,0.11)'
                : isNonPublicPage
                ? '1px solid rgba(255,255,255,0.14)'
                : pathname === "/public" && heroBlend > 0.25
                ? '1px solid rgba(255,255,255,0.07)'
                : 'none',
              transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
              willChange: 'border-radius, background, backdrop-filter, box-shadow',
            }}
          >
            {/* Scroll Progress Indicator */}
            {scrolled && scrollProgress > 0 && (
              <div
                className="absolute bottom-0 left-0 h-[2px] transition-all duration-300"
                style={{
                  width: `${scrollProgress * 100}%`,
                  background: `linear-gradient(90deg, transparent 0%, rgba(52,211,153,0.6) 20%, rgba(56,189,248,0.8) 60%, rgba(52,211,153,0.6) 80%, transparent 100%)`,
                  borderRadius: '0 0 24px 24px',
                }}
              />
            )}

            <div 
              className={`flex items-center justify-between px-3 sm:px-5 ${
                compact ? 'h-14' : scrolled ? 'h-16' : 'h-14'
              }`}
              style={{
                textShadow: scrolled
                  ? `0 2px 4px rgba(0,0,0,${0.4 + scrollProgress * 0.2}), 0 0 12px rgba(0,0,0,${0.25 + scrollProgress * 0.15})`
                  : '0 1px 2px rgba(0,0,0,0.25)',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
          {/* Left: Logo */}
          <div 
            className="flex items-center z-30 flex-shrink-0"
            style={{
              gap: scrolled ? '10px' : '14px',
              transition: 'gap 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <Link 
              href="/" 
              className="inline-flex items-center transition-all duration-300 hover:scale-105 active:scale-95 group" 
              aria-label="NoLSAF Home"
            >
              <Image 
                src={logoSrc}
                alt="NoLSAF" 
                width={logoDims.width}
                height={logoDims.height}
                className="object-contain transition-all duration-300 group-hover:brightness-110 w-auto max-w-[56px] sm:max-w-[64px]"
                style={{
                  width: "auto",
                  // Bigger + responsive like footer brand presence, but compact when scrolled.
                  height: compact ? '32px' : (scrolled ? '36px' : '36px'),
                  transform: scrolled ? 'scale(0.98)' : 'scale(1)',
                  // Keep it readable on tinted/hero states:
                  // - light header or non-public pages: use brand green color (no filter needed)
                  // - dark/green header on public pages: make it white
                  filter: 'brightness(0) invert(1) drop-shadow(0 2px 10px rgba(0,0,0,0.28))',
                  boxShadow: undefined,
                  transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                priority
              />
            </Link>

            {/* Desktop Navigation */}
            <nav 
              className={`hidden xl:flex items-center rounded-full px-1.5 py-1 backdrop-blur-md ${chromePillClass}`}
              style={{
                gap: scrolled ? '4px' : '8px',
                opacity: scrolled ? 1 : 1,
                transform: scrolled ? 'scale(0.95)' : 'scale(1)',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              {navLinks.map((link) => (
                <NavLink key={link.href} href={link.href}>
                  {link.label}
                </NavLink>
              ))}
              <RegionsDropdown variant={headerVariant} />
            </nav>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Right: Auth & Tools */}
          <div 
            className="flex items-center z-30 flex-shrink-0"
            style={{
              gap: scrolled ? '8px' : '12px',
              transition: 'gap 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            {tools ?? (
              <>
                {!authed && (
                  <>
                    <Link
                      href="/account/login"
                      className="hidden sm:inline-flex items-center justify-center rounded-full no-underline transition-all duration-300 hover:scale-105 active:scale-95 font-medium text-white/85 hover:text-white bg-white/[0.09] hover:bg-white/[0.15] ring-1 ring-white/[0.12]"
                      style={{
                        padding: scrolled ? '7px 15px' : '9px 18px',
                        fontSize: scrolled ? '13px' : '14px',
                        textShadow: '0 1px 3px rgba(0,0,0,0.35)',
                        transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                    >
                      Sign in
                    </Link>
                    <Link
                      href="/account/register"
                      className="hidden sm:inline-flex items-center justify-center rounded-full no-underline transition-all duration-300 hover:scale-105 active:scale-95 font-semibold text-white"
                      style={{
                        padding: scrolled ? '7px 15px' : '9px 18px',
                        fontSize: scrolled ? '13px' : '14px',
                        background: 'linear-gradient(135deg,#0b1f5c 0%,#0a5c82 52%,#02665e 100%)',
                        boxShadow: '0 0 0 1px rgba(2,102,94,0.45), 0 4px 16px rgba(2,102,94,0.28)',
                        transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                    >
                      Register
                    </Link>
                  </>
                )}

                <div className={`flex items-center rounded-full px-1.5 py-1 backdrop-blur-md ${chromePillClass}`} style={{ gap: scrolled ? '4px' : '6px' }}>
                  <GlobalPicker variant={headerVariant} />
                  <ThemeToggle variant={headerVariant} />

                  {authed && <UserMenu variant={headerVariant} />}

                  {/* Mobile Menu Button */}
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="xl:hidden p-2 rounded-full bg-transparent transition-all duration-300 hover:scale-110 active:scale-95 border-0 outline-none focus:outline-none focus:ring-0 text-white hover:bg-white/10"
                    aria-label="Toggle menu"
                    aria-expanded={mobileMenuOpen}
                  >
                    {mobileMenuOpen ? (
                      <X className="h-6 w-6 transition-transform duration-300" />
                    ) : (
                      <Menu className="h-6 w-6 transition-transform duration-300" />
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Mobile Menu — dark premium glass, matches hero */}
        <div
          className={`xl:hidden absolute top-full left-0 right-0 transition-all duration-300 ease-out overflow-hidden ${
            mobileMenuOpen
              ? 'max-h-[640px] opacity-100'
              : 'max-h-0 opacity-0'
          }`}
          style={{
            background: 'linear-gradient(180deg, rgba(5,8,15,0.97) 0%, rgba(5,8,15,0.94) 100%)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 24px 56px rgba(0,0,0,0.54)',
          }}
        >
          {/* Top accent line */}
          <div className="h-px bg-gradient-to-r from-transparent via-[#02665e]/60 to-transparent" />
          <nav className="flex flex-col py-3 px-4 gap-0.5">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`relative text-white/90 font-medium text-sm py-3 px-4 rounded-xl transition-all duration-200 active:scale-[0.98] no-underline hover:text-white ${
                  pathname === link.href
                    ? 'bg-white/[0.12] text-white'
                    : 'hover:bg-white/[0.07]'
                }`}
              >
                {pathname === link.href && (
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#2dd4bf] rounded-full shadow-[0_0_8px_rgba(45,212,191,0.70)]"></span>
                )}
                <span className="relative z-10 pl-2">{link.label}</span>
              </Link>
            ))}
            <div className="mt-2 mb-1 border-t border-white/[0.08] pt-2">
              <div className="px-4">
                <RegionsDropdown fullWidth />
              </div>
            </div>
            {!authed && (
              <div className="pt-2 border-t border-white/[0.08] mt-1 flex flex-col gap-2 px-2 pb-3">
                <Link
                  href="/account/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-white/85 font-medium text-sm py-2.5 px-4 rounded-xl bg-white/[0.08] hover:bg-white/[0.13] ring-1 ring-white/[0.10] transition-all duration-200 text-center active:scale-[0.98] no-underline"
                >
                  Sign in
                </Link>
                <Link
                  href="/account/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-white font-semibold text-sm py-2.5 px-4 rounded-xl transition-all duration-200 text-center active:scale-[0.98] no-underline"
                  style={{ background: 'linear-gradient(135deg,#0b1f5c 0%,#0a5c82 52%,#02665e 100%)', boxShadow: '0 4px 16px rgba(2,102,94,0.30)' }}
                >
                  Register
                </Link>
              </div>
            )}
          </nav>
        </div>
          </div>
        </div>
      </header>

      {/* Spacer to prevent content from going under fixed header */}
      <div 
        style={{
          // On /public we want the hero image to be treated as the header background,
          // so we don't push the page content down with a spacer.
          height: isPublicHome ? 0 : (scrolled ? 'calc(64px + 24px)' : (compact ? '56px' : '80px')),
          transition: 'height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />
    </>
  );
}

function RegionsDropdown({ variant = "dark", fullWidth = false }:{ variant?: "light" | "dark"; fullWidth?: boolean }) {
  const [open, setOpen] = useState<boolean>(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<HTMLDivElement | null>(null);
  const [minimized, setMinimized] = useState<boolean>(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const draggingRef = useRef<{ active: boolean; startX: number; startY: number; origLeft: number; origTop: number }>({ active: false, startX: 0, startY: 0, origLeft: 0, origTop: 0 });

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('nols_regions_pos');
      if (raw) setPos(JSON.parse(raw));
    } catch (e) {}
  }, []);

  const savePos = (p: { left: number; top: number }) => {
    try { localStorage.setItem('nols_regions_pos', JSON.stringify(p)); } catch (e) {}
  };

  useEffect(() => {
    const el = dragRef.current as HTMLDivElement | null;
    if (!el) return;
    if (pos) {
      el.style.left = `${pos.left}px`;
      el.style.top = `${pos.top}px`;
    } else {
      el.style.left = '';
      el.style.top = '';
    }
  }, [pos]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('nols_regions_minimized');
      if (raw) setMinimized(raw === '1');
    } catch (e) {}
  }, []);

  const saveMinimized = (m: boolean) => {
    try { localStorage.setItem('nols_regions_minimized', m ? '1' : '0'); } catch (e) {}
  };

  const startDrag = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    const isTouch = (e as React.TouchEvent).touches != null;
    const clientX = isTouch ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = isTouch ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;
    const rect = ref.current?.getBoundingClientRect();
    const origLeft = rect ? rect.left : (window.innerWidth - 400) / 2;
    const origTop = rect ? rect.top : 80;
    draggingRef.current = { active: true, startX: clientX, startY: clientY, origLeft, origTop };

    const onMove = (ev: MouseEvent | TouchEvent) => {
      if (!draggingRef.current.active) return;
      let moveX = 0, moveY = 0;
      if ((ev as TouchEvent).touches) {
        moveX = (ev as TouchEvent).touches[0].clientX; moveY = (ev as TouchEvent).touches[0].clientY;
      } else {
        moveX = (ev as MouseEvent).clientX; moveY = (ev as MouseEvent).clientY;
      }
      const dx = moveX - draggingRef.current.startX;
      const dy = moveY - draggingRef.current.startY;
      const newLeft = Math.max(8, Math.min(window.innerWidth - 16, draggingRef.current.origLeft + dx));
      const newTop = Math.max(8, Math.min(window.innerHeight - 16, draggingRef.current.origTop + dy));
      setPos({ left: newLeft, top: newTop });
    };

    const onUp = () => {
      if (!draggingRef.current.active) return;
      draggingRef.current.active = false;
      if (pos) savePos(pos);
      window.removeEventListener('mousemove', onMove as any);
      window.removeEventListener('touchmove', onMove as any);
      window.removeEventListener('mouseup', onUp as any);
      window.removeEventListener('touchend', onUp as any);
    };

    window.addEventListener('mousemove', onMove as any, { passive: false });
    window.addEventListener('touchmove', onMove as any, { passive: false });
    window.addEventListener('mouseup', onUp as any);
    window.addEventListener('touchend', onUp as any);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        className={[
          fullWidth
            ? "w-full text-left font-semibold no-underline text-sm py-2.5 px-4 rounded-full bg-transparent appearance-none border-0 transition-all duration-200 active:scale-[0.98] group relative"
            : "inline-flex items-center justify-center font-semibold no-underline text-sm py-2 px-3.5 rounded-full bg-transparent appearance-none border-0 transition-all duration-200 active:scale-[0.98] group relative",
          variant === "light" ? "text-[#02665e] hover:bg-[#02665e]/10" : "text-white hover:bg-white/8",
        ].join(" ")}
      >
        <div className={fullWidth ? "flex items-center justify-between" : "flex items-center gap-2"}>
          <span className="relative z-10">Regions</span>
          <ChevronDown 
            className={`h-4 w-4 ml-2 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} 
            aria-hidden 
          />
        </div>
      </button>

      {open && (
        <div
          ref={dragRef}
          className={`${pos ? 'fixed' : 'absolute left-1/2 transform -translate-x-1/2'} mt-2 rounded-2xl z-50 min-w-[24rem] sm:min-w-[32rem] lg:min-w-[40rem] xl:min-w-[48rem] max-w-[calc(100vw-2rem)] transition-all duration-300 ease-out animate-in fade-in slide-in-from-top-2`}
          style={{ background: 'linear-gradient(155deg,#080e28 0%,#0a2235 55%,#012018 100%)', backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)', boxShadow: '0 24px 64px rgba(0,0,0,0.60), 0 0 0 1px rgba(2,102,94,0.30)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {/* Top accent */}
          <div className="h-px bg-gradient-to-r from-transparent via-[#02665e]/60 to-transparent rounded-t-2xl" />
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07] cursor-move select-none">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white/90">Regions</span>
              <span className="text-xs text-white/40">Select a region</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label={minimized ? 'Restore regions' : 'Minimize regions'}
                onClick={(ev) => { ev.stopPropagation(); setMinimized(m => { const nm = !m; saveMinimized(nm); return nm; }); }}
                className="text-white/50 hover:text-white/90 text-sm px-2 py-1 rounded transition-colors"
              >
                {minimized ? '▸' : '▾'}
              </button>
              <div
                onMouseDown={startDrag}
                onTouchStart={startDrag}
                className="w-6 h-6 flex items-center justify-center text-white/30 hover:text-white/70 cursor-move"
                title="Drag to move"
              >
                ≡
              </div>
            </div>
          </div>

          {!minimized && (
            <div className="p-3 grid grid-cols-5 gap-0">
              {REGIONS.map((r: any) => (
                <Link
                  key={r.id}
                  href={`/public/properties?region=${encodeURIComponent(r.id)}`}
                  onClick={() => setOpen(false)}
                  className="block px-3 py-2.5 text-sm text-white/75 hover:text-white hover:bg-white/[0.08] hover:font-semibold transition-all duration-200 ease-out no-underline text-center rounded-lg cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#02665e]/60 transform hover:scale-105 active:scale-95"
                >
                  {r.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
