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
        // Prefer httpOnly cookie session (more secure) — no localStorage needed.
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
    
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          const scrollDifference = currentScrollY - lastScrollTop;
          const scrollSpeed = Math.abs(scrollDifference);
          
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
            if (scrollSpeed > 3) { // Lower threshold for more responsive feel
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
    };
  }, [pathname]);

  const heroBlend = pathname === "/public" && isOverHero ? Math.min(scrollAmount / 180, 1) : 1;
  const isPublicPath = pathname?.startsWith("/public") ?? false;
  // Detect non-public pages (like /account, /help, policy pages, etc.) that need strong visibility
  const isNonPublicPage = !isPublicPath && pathname !== "/public";

  // Two-state public header:
  // - Over hero (not scrolled): white glass (tinted) that blends in smoothly.
  // - After scroll: brand green glass (tinted) for strong identity.
  // - Non-public pages: always use dark variant with strong contrast for maximum visibility
  const overHero = isPublicPath && pathname === "/public" && isOverHero && !scrolled;
  // For readability, the top of the header needs more white than the bottom.
  // This keeps hero photos visible but guarantees nav text/icons stay legible.
  const heroTopAlpha = Math.min(0.74 + heroBlend * 0.18, 0.95); // 0.74 -> 0.92
  const heroBottomAlpha = Math.min(0.42 + heroBlend * 0.16, 0.70); // 0.42 -> 0.58
  // Non-public pages should always use dark variant for strong visibility
  const headerVariant: "light" | "dark" = (overHero && !isNonPublicPage) ? "light" : "dark";

  // Text color rule requested:
  // When header is in light/white state -> brand green text.
  const navTextClass = headerVariant === "light" ? "text-[#02665e]" : "text-white";
  const navHoverBgClass = headerVariant === "light" ? "hover:bg-[#02665e]/10" : "hover:bg-white/15";
  const navActiveBgClass = headerVariant === "light" ? "bg-[#02665e]/10" : "bg-white/20";
  const navDotBgClass = headerVariant === "light" ? "bg-[#02665e]" : "bg-white";

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
  ], []);

  const NavLink = ({ href, children, onClick }: { href: string; children: React.ReactNode; onClick?: () => void }) => {
    const isActive = pathname === href;
    return (
      <Link 
        href={href} 
        onClick={onClick}
        className={`relative ${navTextClass} font-semibold no-underline rounded-full transition-all duration-300 ease-out ${navHoverBgClass} hover:scale-105 active:scale-95 group ${
          isActive ? navActiveBgClass : ''
        }`}
        style={{
          fontSize: scrolled ? '13px' : '14px',
          padding: scrolled ? '8px 14px' : '10px 16px',
          textShadow: (headerVariant === "light" || isNonPublicPage)
            ? 'none'
            : scrolled 
            ? `0 1px 2px rgba(0, 0, 0, ${0.4 + scrollProgress * 0.2}), 0 0 8px rgba(0, 0, 0, ${0.25 + scrollProgress * 0.15})` 
            : '0 1px 2px rgba(0, 0, 0, 0.3), 0 0 8px rgba(0, 0, 0, 0.2)',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <span className="relative z-10">{children}</span>
        {isActive && (
          <span 
            className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 ${navDotBgClass} rounded-full transition-all duration-300`}
            style={{
              width: scrolled ? '3px' : '4px',
              height: scrolled ? '3px' : '4px',
            }}
          />
        )}
        <span
          className="absolute inset-0 rounded-full transition-all duration-300 transform scale-0 group-hover:scale-100"
          style={{
            backgroundColor: (headerVariant === "light" || isNonPublicPage) ? "rgba(2, 102, 94, 0.08)" : "rgba(255,255,255,0.10)",
          }}
        />
      </Link>
    );
  };

  return (
    <>
      <header 
        ref={headerRef}
        className={`fixed z-50 ${(headerVariant === "light" || isNonPublicPage) ? "text-[#02665e]" : "text-white"} ${
          headerVisible 
            ? 'translate-y-0 opacity-100' 
            : '-translate-y-full opacity-0 pointer-events-none'
        } ${compact ? 'h-14' : scrolled ? 'h-16' : 'h-20'}`}
        style={{
          // Shape morphing: from full-width to contained with rounded corners
          top: scrolled ? '12px' : '0',
          left: scrolled ? '16px' : '0',
          right: scrolled ? '16px' : '0',
          width: scrolled ? 'calc(100% - 32px)' : '100%',
          maxWidth: scrolled ? '1200px' : '100%',
          margin: scrolled ? '0 auto' : '0',
          borderRadius: scrolled ? '24px' : '0',
          // Naspers-style coupling: transparent over hero, then smoothly fills into our brand glass header.
          // Non-public pages get full opacity for maximum visibility
          background: overHero && !isNonPublicPage
            ? `linear-gradient(180deg, rgba(255,255,255,${heroTopAlpha}) 0%, rgba(255,255,255,${heroBottomAlpha}) 100%)`
            : scrolled
            ? `rgba(2, 102, 94, ${0.92 + scrollProgress * 0.06})`
            : isNonPublicPage
            ? `rgba(2, 102, 94, 0.98)`
            : `rgba(2, 102, 94, ${pathname === "/public" ? (0.20 + heroBlend * 0.55) : 0.98})`,
          backdropFilter: (overHero && !isNonPublicPage)
            ? `blur(${14 + heroBlend * 10}px) saturate(170%)`
            : isNonPublicPage
            ? `blur(16px) saturate(180%)`
            : scrolled
            ? `blur(${16 + scrollProgress * 6}px) saturate(${160 + scrollProgress * 20}%)`
            : `blur(${6 + heroBlend * 10}px) saturate(${120 + heroBlend * 40}%)`,
          WebkitBackdropFilter: (overHero && !isNonPublicPage)
            ? `blur(${14 + heroBlend * 10}px) saturate(170%)`
            : isNonPublicPage
            ? `blur(16px) saturate(180%)`
            : scrolled
            ? `blur(${16 + scrollProgress * 6}px) saturate(${160 + scrollProgress * 20}%)`
            : `blur(${6 + heroBlend * 10}px) saturate(${120 + heroBlend * 40}%)`,
          boxShadow: (overHero && !isNonPublicPage)
            ? "0 14px 36px rgba(15,23,42,0.14), 0 1px 0 rgba(255,255,255,0.45), inset 0 -1px 0 rgba(2,102,94,0.06)"
            : scrolled
            ? `0 10px 28px rgba(0,0,0,0.18), 0 0 0 1px rgba(255,255,255,0.10), inset 0 1px 0 rgba(255,255,255,0.10)`
            : isNonPublicPage
            ? `0 4px 16px rgba(0,0,0,0.12), 0 0 0 1px rgba(255,255,255,0.15), inset 0 1px 0 rgba(255,255,255,0.15)`
            : pathname === "/public" && heroBlend > 0.2
            ? `0 10px 30px rgba(0,0,0,0.18), 0 0 0 1px rgba(255,255,255,0.08)`
            : 'none',
          border: (overHero && !isNonPublicPage)
            ? "1px solid rgba(255,255,255,0.55)"
            : scrolled
            ? '1px solid rgba(255, 255, 255, 0.12)'
            : isNonPublicPage
            ? '1px solid rgba(255,255,255,0.15)'
            : pathname === "/public" && heroBlend > 0.25
            ? '1px solid rgba(255,255,255,0.08)'
            : 'none',
          transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1), transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.4s ease-out',
          willChange: 'transform, opacity, width, border-radius, top, left, right, background, backdrop-filter, box-shadow',
        }}
      >
        {/* Scroll Progress Indicator - More subtle */}
        {scrolled && scrollProgress > 0 && (
          <div 
            className="absolute bottom-0 left-0 h-[2px] transition-all duration-300 rounded-full"
            style={{
              width: `${scrollProgress * 100}%`,
              background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 20%, rgba(255,255,255,0.7) 50%, rgba(255,255,255,0.5) 80%, transparent 100%)`,
              borderRadius: '0 0 24px 24px',
            }}
          />
        )}
        <div 
          className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between ${
            compact ? 'h-14' : scrolled ? 'h-16' : 'h-20'
          }`}
          style={{
            textShadow: (headerVariant === "light" || isNonPublicPage)
              ? 'none'
              : scrolled 
              ? `0 2px 4px rgba(0, 0, 0, ${0.4 + scrollProgress * 0.2}), 0 0 12px rgba(0, 0, 0, ${0.25 + scrollProgress * 0.15})` 
              : '0 1px 2px rgba(0, 0, 0, 0.2)',
            // On non-public pages with white background, no drop shadow needed for green text
            filter: (headerVariant === "light" || isNonPublicPage)
              ? "none"
              : "none",
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            paddingLeft: scrolled ? '20px' : '16px',
            paddingRight: scrolled ? '20px' : '16px',
          }}
        >
          {/* Left: Logo */}
          <div 
            className="flex items-center z-30 flex-shrink-0"
            style={{
              gap: scrolled ? '12px' : '24px',
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
                  height: compact ? '34px' : (scrolled ? '38px' : '48px'),
                  transform: scrolled ? 'scale(0.98)' : 'scale(1)',
                  // Keep it readable on tinted/hero states:
                  // - light header or non-public pages: use brand green color (no filter needed)
                  // - dark/green header on public pages: make it white
                  filter:
                    (headerVariant === "light" || isNonPublicPage)
                      ? 'none'
                      : 'brightness(0) invert(1) drop-shadow(0 2px 10px rgba(0,0,0,0.28))',
                  transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                priority
              />
            </Link>

            {/* Desktop Navigation */}
            <nav 
              className="hidden xl:flex items-center"
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
                      className={`hidden sm:inline-flex items-center justify-center rounded-full no-underline transition-all duration-300 hover:scale-105 hover:shadow-md active:scale-95 font-semibold ${
                        (headerVariant === "light" || isNonPublicPage)
                          ? 'bg-[#02665e]/10 hover:bg-[#02665e]/15 text-[#02665e]'
                          : 'bg-white/10 hover:bg-white/20 text-white'
                      }`}
                      style={{
                        padding: scrolled ? '8px 16px' : '10px 20px',
                        fontSize: scrolled ? '13px' : '14px',
                        textShadow: (headerVariant === "light" || isNonPublicPage) ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.3), 0 0 8px rgba(0, 0, 0, 0.2)',
                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                    >
                      Sign in
                    </Link>
                    <Link 
                      href="/account/register" 
                      className="hidden sm:inline-flex items-center justify-center rounded-full bg-white text-[#02665e] hover:bg-gray-50 no-underline transition-all duration-300 hover:scale-105 hover:shadow-md active:scale-95 font-semibold"
                      style={{
                        padding: scrolled ? '8px 16px' : '10px 20px',
                        fontSize: scrolled ? '13px' : '14px',
                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                    >
                      Register
                    </Link>
                  </>
                )}

                <GlobalPicker variant={headerVariant} />
                <ThemeToggle variant={headerVariant} />

                {authed && <UserMenu variant={headerVariant} />}

                {/* Mobile Menu Button */}
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className={`xl:hidden p-2 rounded-full bg-transparent transition-all duration-300 hover:scale-110 active:scale-95 border-0 outline-none focus:outline-none focus:ring-0 ${
                    (headerVariant === "light" || isNonPublicPage) ? 'text-[#02665e] hover:bg-[#02665e]/10' : 'text-white hover:bg-white/10'
                  }`}
                  aria-label="Toggle menu"
                  aria-expanded={mobileMenuOpen}
                >
                  {mobileMenuOpen ? (
                    <X className="h-6 w-6 transition-transform duration-300" />
                  ) : (
                    <Menu className="h-6 w-6 transition-transform duration-300" />
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        <div 
          className={`xl:hidden absolute top-full left-0 right-0 bg-[#02665e] border-t border-white/5 transition-all duration-300 ease-out overflow-hidden backdrop-blur-sm ${
            mobileMenuOpen 
              ? 'max-h-[600px] opacity-100 shadow-lg' 
              : 'max-h-0 opacity-0'
          }`}
        >
          <nav className="flex flex-col py-3 px-4">
            {navLinks.map((link) => (
              <Link 
                key={link.href}
                href={link.href} 
                onClick={() => setMobileMenuOpen(false)}
                className={`relative text-white font-medium text-sm py-3 px-4 rounded-lg transition-all duration-200 active:scale-[0.98] no-underline ${
                  pathname === link.href 
                    ? 'bg-white/15 text-white' 
                    : 'hover:bg-white/8 text-white/95'
                }`}
              >
                {pathname === link.href && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-full"></span>
                )}
                <span className="relative z-10">{link.label}</span>
              </Link>
            ))}
            <div className="pt-2 pb-2 border-t border-white/5 mt-1">
              <div className="px-4">
                <RegionsDropdown />
              </div>
            </div>
            {!authed && (
              <div className="pt-2 border-t border-white/5 mt-1 flex flex-col gap-2 px-4 pb-2">
                <Link 
                  href="/account/login" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-white font-medium text-sm py-2.5 px-4 rounded-lg bg-white/10 hover:bg-white/15 transition-all duration-200 text-center active:scale-[0.98] no-underline"
                >
                  Sign in
                </Link>
                <Link 
                  href="/account/register" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-[#02665e] font-semibold text-sm py-2.5 px-4 rounded-lg bg-white hover:bg-gray-50 transition-all duration-200 text-center active:scale-[0.98] no-underline shadow-sm"
                >
                  Register
                </Link>
              </div>
            )}
          </nav>
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

function RegionsDropdown({ variant = "dark" }:{ variant?: "light" | "dark" }) {
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
          "w-full text-left font-semibold no-underline text-sm py-2.5 px-4 rounded-full bg-transparent appearance-none border-0 transition-all duration-200 active:scale-[0.98] group relative",
          variant === "light" ? "text-[#02665e] hover:bg-[#02665e]/10" : "text-white hover:bg-white/8",
        ].join(" ")}
      >
        <div className="flex items-center justify-between">
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
          className={`${pos ? 'fixed' : 'absolute left-1/2 transform -translate-x-1/2'} mt-2 bg-white rounded-2xl shadow-2xl ring-1 ring-black/10 z-50 min-w-[24rem] sm:min-w-[32rem] lg:min-w-[40rem] xl:min-w-[48rem] max-w-[calc(100vw-2rem)] transition-all duration-300 ease-out animate-in fade-in slide-in-from-top-2`}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 cursor-move select-none">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-800">Regions</span>
              <span className="text-xs text-gray-500">Select a region</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label={minimized ? 'Restore regions' : 'Minimize regions'}
                onClick={(ev) => { ev.stopPropagation(); setMinimized(m => { const nm = !m; saveMinimized(nm); return nm; }); }}
                className="text-gray-600 hover:text-gray-800 text-sm px-2 py-1 rounded transition-colors"
              >
                {minimized ? '▸' : '▾'}
              </button>
              <div
                onMouseDown={startDrag}
                onTouchStart={startDrag}
                className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-move"
                title="Drag to move"
              >
                ≡
              </div>
            </div>
          </div>

          {!minimized && (
            <div className="p-3 grid grid-cols-5 gap-0 divide-y divide-gray-100 sm:divide-y-0 sm:divide-x">
              {REGIONS.map((r: any) => (
                <Link
                  key={r.id}
                  href={`/public/properties?region=${encodeURIComponent(r.id)}`}
                  onClick={() => setOpen(false)}
                  className="block px-3 py-3 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-800 hover:font-semibold transition-all duration-300 ease-out no-underline text-center rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-200 transform hover:scale-105 active:scale-95"
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
