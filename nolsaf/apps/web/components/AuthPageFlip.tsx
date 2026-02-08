"use client";

import { useEffect, useRef, useState } from 'react';

import { PageFlip } from 'page-flip';

interface AuthPageFlipProps {
  children: [React.ReactNode, React.ReactNode, React.ReactNode?]; // [RegisterPage, LoginPage, ForgotPasswordPage?]
  currentPage: number; // 0 for register, 1 for login, 2 for forgot password
  onPageChange?: (page: number) => void;
  width?: number;
  height?: number;
}

export default function AuthPageFlip({ 
  children, 
  currentPage, 
  onPageChange,
  width = 500,
  height = 700
}: AuthPageFlipProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pageFlipRef = useRef<PageFlip | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [useFlip, setUseFlip] = useState(false); // Start with false, enable if page-flip works
  const [dimensions, setDimensions] = useState({ width, height });
  const [viewport, setViewport] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [focusSide, setFocusSide] = useState<'left' | 'right' | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [screenWidth, setScreenWidth] = useState(1200);
  const [bookHeight, setBookHeight] = useState<number | null>(null);
  const [maxBookHeight, setMaxBookHeight] = useState<number>(900);
  const leftMeasureRef = useRef<HTMLDivElement>(null);
  const rightMeasureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    
    // Responsive sizing
    const updateDimensions = () => {
      setScreenWidth(window.innerWidth || 1200);
      setMaxBookHeight(Math.max(520, (window.innerHeight || 900) - 40));
      const isMobile = window.innerWidth < 640;
      const isTablet = window.innerWidth < 1024;
      setViewport(isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop');
      setDimensions({
        width: isMobile ? 350 : isTablet ? 450 : width,
        height: isMobile ? 600 : isTablet ? 650 : height,
      });
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [width, height]);

  useEffect(() => {
    if (!mounted || !containerRef.current || !useFlip) return;

    // Small delay to ensure DOM is ready
    const initTimer = setTimeout(() => {
      if (!containerRef.current) return;

      try {
        // Initialize PageFlip
        const pageFlip = new PageFlip(containerRef.current, {
          width: dimensions.width,
          height: dimensions.height,
          maxShadowOpacity: 0.5,
          showCover: false,
          drawShadow: true,
          flippingTime: 800,
          usePortrait: true,
          startPage: currentPage,
          size: 'stretch',
          minWidth: 300,
          maxWidth: 600,
          minHeight: 400,
          maxHeight: 900,
          autoSize: true,
          mobileScrollSupport: false,
        });

        // Load pages from HTML - wait a bit for pages to render
        setTimeout(() => {
          if (!containerRef.current || !pageFlip) return;
          const pages = containerRef.current.querySelectorAll('.auth-pageflip-page');
          if (pages.length >= 2) {
            pageFlip.loadFromHTML(Array.from(pages) as any);
            // Only enable flip if it successfully loaded
            setUseFlip(true);
          } else {
            setUseFlip(false);
          }
        }, 300);

        pageFlipRef.current = pageFlip;

        // Handle page flip events
        pageFlip.on('flip', (e: any) => {
          setIsFlipping(true);
          const page = e.data as number;
          if (onPageChange) {
            onPageChange(page);
          }
        });

        pageFlip.on('flipEnd', () => {
          setIsFlipping(false);
        });
      } catch (error) {
        console.error('PageFlip initialization error:', error);
        setUseFlip(false);
      }
    }, 100);

    // Cleanup
    return () => {
      clearTimeout(initTimer);
      if (pageFlipRef.current) {
        try {
          pageFlipRef.current.destroy();
        } catch (e) {
          // Ignore cleanup errors
        }
        pageFlipRef.current = null;
      }
    };
  }, [mounted, dimensions.width, dimensions.height, onPageChange, useFlip, currentPage]);

  // Sync currentPage with PageFlip
  useEffect(() => {
    if (useFlip && pageFlipRef.current && !isFlipping) {
      try {
        const currentFlipPage = pageFlipRef.current.getCurrentPageIndex();
        if (currentFlipPage !== currentPage) {
          pageFlipRef.current.flip(currentPage);
        }
      } catch (e) {
        // Ignore errors
      }
    }
  }, [currentPage, isFlipping, useFlip]);

  // Fallback: Simple transition without page-flip - ALWAYS show this first
  const showFallback = !mounted || !useFlip;

  // Once the user interacts (clicks/taps a side or changes mode), keep the focused side
  // aligned with the currently selected auth mode.
  useEffect(() => {
    if (!hasInteracted) return;
    if (currentPage === 0) setFocusSide('right');
    else setFocusSide('left');
  }, [currentPage, hasInteracted]);

  // Measure the rendered page heights so the “book” can compact with no empty gap.
  useEffect(() => {
    if (viewport === 'mobile') return;

    const measure = () => {
      const leftH = leftMeasureRef.current?.scrollHeight ?? leftMeasureRef.current?.offsetHeight ?? 0;
      const rightH = rightMeasureRef.current?.scrollHeight ?? rightMeasureRef.current?.offsetHeight ?? 0;
      const openH = Math.max(leftH, rightH);
      const focusedH = focusSide === 'left' ? leftH : focusSide === 'right' ? rightH : openH;
      const capped = focusedH > 0 ? Math.min(focusedH, maxBookHeight) : 0;
      setBookHeight(capped > 0 ? capped : null);
    };

    const raf = window.requestAnimationFrame(measure);
    window.addEventListener('resize', measure);

    // React to content changes (e.g. switching login method) so the shell
    // height/scrolling stays correct without relying on window resize.
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => measure());
      if (leftMeasureRef.current) ro.observe(leftMeasureRef.current);
      if (rightMeasureRef.current) ro.observe(rightMeasureRef.current);
    }

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', measure);
      if (ro) ro.disconnect();
    };
  }, [focusSide, viewport, currentPage, screenWidth, dimensions.width, maxBookHeight]);
  
  if (showFallback) {
    const leftIndex = currentPage === 2 && children[2] ? 2 : 1;
    const leftContent = children[leftIndex] ?? children[1];
    const rightContent = children[0];

    const selectLeft = () => {
      setHasInteracted(true);
      setFocusSide('left');
      if (onPageChange) onPageChange(leftIndex);
    };

    const selectRight = () => {
      setHasInteracted(true);
      setFocusSide('right');
      if (onPageChange) onPageChange(0);
    };

    // Mobile: keep the existing single-page transition.
    if (viewport === 'mobile') {
      return (
        <div className="auth-pageflip-wrapper">
          <style jsx global>{`
            .auth-pageflip-wrapper {
              display: flex;
              justify-content: center;
              align-items: center;
              padding: 20px;
              width: 100%;
              min-height: 100vh;
            }
            .auth-pageflip-container-fallback {
              position: relative;
              box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
              border-radius: 12px;
              overflow: hidden;
              background: white;
              width: ${dimensions.width}px;
              min-height: auto;
              height: auto;
            }
            .auth-pageflip-page-fallback {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              min-height: auto;
              height: auto;
              transition: opacity 0.4s ease, transform 0.4s ease;
              background: white;
            }
            .auth-pageflip-page-fallback.active {
              opacity: 1;
              transform: translateX(0);
              z-index: 1;
              position: relative;
            }
            .auth-pageflip-page-fallback.inactive {
              opacity: 0;
              transform: translateX(20px);
              z-index: 0;
              pointer-events: none;
            }
            .auth-pageflip-page-fallback .page-content {
              width: 100%;
              height: 100%;
              display: flex;
              flex-direction: column;
            }
          `}</style>
          <div className="auth-pageflip-container-fallback">
            <div className={`auth-pageflip-page-fallback ${currentPage === 0 ? 'active' : 'inactive'}`}>
              <div className="page-content">{children[0]}</div>
            </div>
            <div className={`auth-pageflip-page-fallback ${currentPage === 1 ? 'active' : 'inactive'}`}>
              <div className="page-content">{children[1]}</div>
            </div>
            {children[2] && (
              <div className={`auth-pageflip-page-fallback ${currentPage === 2 ? 'active' : 'inactive'}`}>
                <div className="page-content">{children[2]}</div>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="auth-pageflip-wrapper">
        <style jsx global>{`
          .auth-pageflip-wrapper {
            display: flex;
            justify-content: center;
            align-items: flex-start;
            padding: 16px 20px 24px;
            width: 100%;
            min-height: 100vh;
            background:
              radial-gradient(1200px 600px at 50% -10%, rgba(2, 102, 94, 0.18), rgba(2, 102, 94, 0) 60%),
              radial-gradient(900px 520px at 10% 10%, rgba(15, 23, 42, 0.06), rgba(15, 23, 42, 0) 55%),
              linear-gradient(180deg, rgba(248, 250, 252, 1) 0%, rgba(241, 245, 249, 1) 100%);
          }

          .auth-book-shell {
            width: 100%;
            border-radius: 16px;
            overflow: hidden;
            box-shadow:
              0 24px 70px rgba(0, 0, 0, 0.18),
              0 1px 0 rgba(255, 255, 255, 0.7) inset;
            border: 1px solid rgba(15, 23, 42, 0.08);
            background:
              radial-gradient(900px 240px at 50% 0%, rgba(2, 102, 94, 0.10), rgba(2, 102, 94, 0) 70%),
              linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(250,252,252,1) 100%);
            transition: width 520ms cubic-bezier(.2,.8,.2,1), height 520ms cubic-bezier(.2,.8,.2,1);
            display: flex;
            flex-direction: column;
          }

          .auth-book-shell:before {
            content: '';
            position: absolute;
            inset: 0;
            pointer-events: none;
          }

          .auth-book {
            position: relative;
            display: flex;
            width: 100%;
            height: auto;
            background: linear-gradient(180deg, rgba(255,255,255,1), rgba(250,252,252,1));
            perspective: 2400px;
            transform-style: preserve-3d;
          }

          /* When the shell height is capped, ensure the book & pages honor it */
          .auth-book-shell[style*="height"] .auth-book {
            height: 100%;
          }

          .auth-book-spine {
            position: absolute;
            top: 0;
            bottom: 0;
            left: 50%;
            width: 14px;
            transform: translateX(-50%);
            background: linear-gradient(
              90deg,
              rgba(15, 23, 42, 0.14),
              rgba(15, 23, 42, 0.045),
              rgba(255, 255, 255, 0.94),
              rgba(15, 23, 42, 0.045),
              rgba(15, 23, 42, 0.14)
            );
            pointer-events: none;
            transition: opacity 450ms ease;
          }

          .auth-book-spine:before {
            content: '';
            position: absolute;
            top: 0;
            bottom: 0;
            left: 50%;
            width: 1px;
            transform: translateX(-50%);
            background: rgba(15, 23, 42, 0.16);
          }

          .auth-book-spine:after {
            content: '';
            position: absolute;
            top: 0;
            bottom: 0;
            left: 50%;
            width: 6px;
            transform: translateX(-50%);
            background: linear-gradient(180deg, rgba(255,255,255,0.0), rgba(255,255,255,0.22), rgba(255,255,255,0.0));
            opacity: 0.55;
          }

          .auth-book-page {
            flex: 1 1 50%;
            min-width: 0;
            background: white;
            overflow: hidden;
            transition: flex 520ms cubic-bezier(.2,.8,.2,1), opacity 520ms ease, transform 520ms cubic-bezier(.2,.8,.2,1);
            transform-style: preserve-3d;
            position: relative;
            display: flex;
            flex-direction: column;
          }

          .auth-book-shell[style*="height"] .auth-book-page {
            height: 100%;
          }

          .auth-book-page.left {
            transform-origin: right center;
            transform: rotateY(1.6deg);
          }

          .auth-book-page.right {
            transform-origin: left center;
            transform: rotateY(-1.6deg);
          }

          .auth-book-page.left:before {
            content: '';
            position: absolute;
            top: 0;
            bottom: 0;
            right: 0;
            width: 44px;
            background: linear-gradient(90deg, rgba(0, 0, 0, 0.0), rgba(0, 0, 0, 0.07));
            opacity: 0.28;
            pointer-events: none;
          }

          .auth-book-page.right:before {
            content: '';
            position: absolute;
            top: 0;
            bottom: 0;
            left: 0;
            width: 44px;
            background: linear-gradient(270deg, rgba(0, 0, 0, 0.0), rgba(0, 0, 0, 0.07));
            opacity: 0.28;
            pointer-events: none;
          }

          .auth-book-page.left:after {
            content: '';
            position: absolute;
            top: 0;
            bottom: 0;
            right: 0;
            width: 24px;
            background: linear-gradient(90deg, rgba(255,255,255,0.0), rgba(255,255,255,0.55));
            opacity: 0.22;
            pointer-events: none;
          }

          .auth-book-page.right:after {
            content: '';
            position: absolute;
            top: 0;
            bottom: 0;
            left: 0;
            width: 24px;
            background: linear-gradient(270deg, rgba(255,255,255,0.0), rgba(255,255,255,0.55));
            opacity: 0.22;
            pointer-events: none;
          }

          .auth-book.focus-left .auth-book-page.left {
            transform: rotateY(0deg);
          }

          .auth-book.focus-right .auth-book-page.right {
            transform: rotateY(0deg);
          }

          .auth-book.focus-left .auth-book-page.right {
            flex: 0 0 0%;
            opacity: 0;
            transform: translateX(16px);
            pointer-events: none;
          }

          .auth-book.focus-right .auth-book-page.left {
            flex: 0 0 0%;
            opacity: 0;
            transform: translateX(-16px);
            pointer-events: none;
          }

          .auth-book.focus-left .auth-book-spine,
          .auth-book.focus-right .auth-book-spine {
            opacity: 0;
          }

          .auth-book-page-scroll {
            width: 100%;
            display: flex;
            flex-direction: column;
            flex: 1 1 auto;
            min-height: 0;
            overflow: hidden;
            position: relative;
          }

          /* Default open-book: add a subtle "half-open" curl on the register (right) page */
          .auth-book:not(.focus-left):not(.focus-right) .auth-book-page.right > .auth-book-page-scroll:before {
            content: '';
            position: absolute;
            right: 0;
            bottom: 0;
            width: 124px;
            height: 124px;
            clip-path: polygon(100% 0%, 100% 100%, 0% 100%);
            background: linear-gradient(
                315deg,
                rgba(255, 255, 255, 0.96) 0%,
                rgba(255, 255, 255, 0.70) 35%,
                rgba(255, 255, 255, 0.0) 72%
              );
            opacity: 0.85;
            pointer-events: none;
          }

          .auth-book:not(.focus-left):not(.focus-right) .auth-book-page.right > .auth-book-page-scroll:after {
            content: '';
            position: absolute;
            right: 0;
            bottom: 0;
            width: 140px;
            height: 140px;
            clip-path: polygon(100% 0%, 100% 100%, 0% 100%);
            background: radial-gradient(
              160px 160px at 100% 100%,
              rgba(15, 23, 42, 0.22) 0%,
              rgba(15, 23, 42, 0.10) 38%,
              rgba(15, 23, 42, 0.0) 70%
            );
            opacity: 0.28;
            transform: translate(10px, 10px);
            pointer-events: none;
          }
        `}</style>
        <div
          className="auth-book-shell"
          style={{
            width: `${Math.min(
              focusSide ? dimensions.width : dimensions.width * 2,
              Math.max(320, (screenWidth || 1200) - 40)
            )}px`,
            height: bookHeight ? `${bookHeight}px` : 'auto',
          }}
        >
          <div className={`auth-book ${focusSide === 'left' ? 'focus-left' : focusSide === 'right' ? 'focus-right' : ''}`}>
            <div className="auth-book-spine" />

            <div
              className="auth-book-page left"
              onPointerDownCapture={selectLeft}
              role="presentation"
            >
              <div ref={leftMeasureRef} className="auth-book-page-scroll">{leftContent}</div>
            </div>

            <div
              className="auth-book-page right"
              onPointerDownCapture={selectRight}
              role="presentation"
            >
              <div ref={rightMeasureRef} className="auth-book-page-scroll">{rightContent}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        .auth-pageflip-wrapper {
          display: flex;
          justify-content: center;
          align-items: flex-start;
          perspective: 2000px;
          padding: 16px 20px 24px;
          width: 100%;
          min-height: 100vh;
          background:
            radial-gradient(1200px 600px at 50% -10%, rgba(2, 102, 94, 0.18), rgba(2, 102, 94, 0) 60%),
            radial-gradient(900px 520px at 10% 10%, rgba(15, 23, 42, 0.06), rgba(15, 23, 42, 0) 55%),
            linear-gradient(180deg, rgba(248, 250, 252, 1) 0%, rgba(241, 245, 249, 1) 100%);
        }
        .auth-pageflip-container {
          position: relative;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          border-radius: 12px;
          overflow: hidden;
          background: white;
          min-height: auto;
          height: auto;
        }
        .auth-pageflip-page {
          background: white !important;
          display: flex !important;
          flex-direction: column;
          align-items: stretch;
          justify-content: flex-start;
          padding: 0;
          box-sizing: border-box;
          overflow: hidden;
          border-radius: 12px;
          width: 100%;
          min-height: auto;
          height: auto;
          position: relative;
          max-width: 100%;
        }
        .auth-pageflip-page .page-content {
          width: 100%;
          min-height: auto;
          height: auto;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
          overflow: visible;
          background: white;
        }
        /* Ensure pages are visible */
        .auth-pageflip-container > .auth-pageflip-page {
          opacity: 1 !important;
          visibility: visible !important;
        }
        /* Page-flip library overrides */
        .stf__block {
          border-radius: 12px !important;
        }
        .stf__item {
          border-radius: 12px !important;
          background: white !important;
        }
      `}</style>
      <div className="auth-pageflip-wrapper">
        <div 
          ref={containerRef}
          className="auth-pageflip-container"
          style={{ width: `${dimensions.width}px`, minHeight: `${dimensions.height}px` }}
        >
          <div className="auth-pageflip-page">
            <div className="page-content">{children[0]}</div>
          </div>
          <div className="auth-pageflip-page">
            <div className="page-content">{children[1]}</div>
          </div>
          {children[2] && (
            <div className="auth-pageflip-page">
              <div className="page-content">{children[2]}</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
