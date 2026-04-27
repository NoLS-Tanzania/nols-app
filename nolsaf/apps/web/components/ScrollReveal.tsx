"use client";

import { motion, useReducedMotion, useInView } from "framer-motion";
import { useRef, type ReactNode } from "react";

/**
 * Direction is kept in the API for backward-compatibility but is no longer
 * used for translation — elements no longer slide in from any direction.
 * The reveal is a pure opacity + scale + blur materialise, which is
 * consistent on both downward and upward scroll.
 */
type Direction = "up" | "down" | "left" | "right" | "none";

interface ScrollRevealProps {
  children: ReactNode;
  /** @deprecated kept for API compatibility — no longer affects animation */
  direction?: Direction;
  /** Entry delay in seconds */
  delay?: number;
  /** Entry duration in seconds (default: 0.6) */
  duration?: number;
  /** @deprecated kept for API compatibility */
  distance?: number;
  /** Extra className on the wrapper */
  className?: string;
  /** Animate only once (default: false — re-animates on every entry) */
  once?: boolean;
  /** Viewport margin before triggering (default: "-60px") */
  margin?: string;
  /** @deprecated kept for API compatibility */
  scale?: number;
}

// Expo-out: snappy entry, silky settle — same easing Vercel/Linear use
const EASE_IN  = [0.16, 1, 0.3, 1] as const;
const EASE_OUT = [0.4, 0, 1, 1]    as const;

const VISIBLE = {
  opacity: 1,
  scale: 1,
  filter: "blur(0px)",
};

const HIDDEN = {
  opacity: 0,
  scale: 0.97,
  filter: "blur(6px)",
};

export default function ScrollReveal({
  children,
  delay = 0,
  duration = 0.6,
  className,
  once = false,
  margin = "-60px",
  // below: accepted but unused
  direction: _direction,
  distance: _distance,
  scale: _scale,
}: ScrollRevealProps) {
  const prefersReduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once, margin });

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={{
        visible: {
          ...VISIBLE,
          transition: { duration, delay, ease: EASE_IN },
        },
        hidden: {
          ...HIDDEN,
          transition: { duration: 0.3, ease: EASE_OUT },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Stagger-wraps children so each materialises in sequence.
 */
export function StaggerReveal({
  children,
  staggerDelay = 0.07,
  baseDelay = 0,
  duration = 0.55,
  className,
  once = false,
  margin = "-40px",
  // below: accepted but unused
  direction: _direction,
  distance: _distance,
}: {
  children: ReactNode[];
  /** @deprecated */
  direction?: Direction;
  staggerDelay?: number;
  baseDelay?: number;
  duration?: number;
  /** @deprecated */
  distance?: number;
  className?: string;
  once?: boolean;
  margin?: string;
}) {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <>{children}</>;
  }

  return (
    <>
      {(Array.isArray(children) ? children : [children]).map((child, i) => (
        <_StaggerItem
          key={i}
          duration={duration}
          delay={baseDelay + i * staggerDelay}
          once={once}
          margin={margin}
          className={className}
        >
          {child}
        </_StaggerItem>
      ))}
    </>
  );
}

function _StaggerItem({
  children,
  duration,
  delay,
  once,
  margin,
  className,
}: {
  children: ReactNode;
  duration: number;
  delay: number;
  once: boolean;
  margin: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once, margin });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={{
        visible: {
          ...VISIBLE,
          transition: { duration, delay, ease: EASE_IN },
        },
        hidden: {
          ...HIDDEN,
          transition: { duration: 0.3, ease: EASE_OUT },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

