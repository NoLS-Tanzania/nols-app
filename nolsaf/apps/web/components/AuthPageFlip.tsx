"use client";

import { useEffect, useRef, useState } from 'react';
// @ts-ignore - page-flip doesn't have TypeScript definitions
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

  useEffect(() => {
    setMounted(true);
    
    // Responsive sizing
    const updateDimensions = () => {
      const isMobile = window.innerWidth < 640;
      const isTablet = window.innerWidth < 1024;
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
  }, [mounted, dimensions.width, dimensions.height, onPageChange, useFlip]);

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
  
  if (showFallback) {
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
    <>
      <style jsx global>{`
        .auth-pageflip-wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
          perspective: 2000px;
          padding: 20px;
          width: 100%;
          min-height: 100vh;
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
