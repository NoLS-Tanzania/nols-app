"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

type Direction = "up" | "down" | "left" | "right" | "none";

interface ScrollRevealProps {
  children: ReactNode;
  /** Direction the element slides in from (default: "up") */
  direction?: Direction;
  /** Animation delay in seconds */
  delay?: number;
  /** Animation duration in seconds (default: 0.55) */
  duration?: number;
  /** Slide distance in pixels (default: 32) */
  distance?: number;
  /** Extra className on the wrapper */
  className?: string;
  /** Whether to animate only once (default: true) */
  once?: boolean;
  /** Viewport margin before triggering (default: "-60px") */
  margin?: string;
  /** Scale factor start (default: 1, no scale) */
  scale?: number;
}

const offsets: Record<Direction, { x: number; y: number }> = {
  up:    { x: 0,  y: 1 },
  down:  { x: 0,  y: -1 },
  left:  { x: 1,  y: 0 },
  right: { x: -1, y: 0 },
  none:  { x: 0,  y: 0 },
};

export default function ScrollReveal({
  children,
  direction = "up",
  delay = 0,
  duration = 0.55,
  distance = 32,
  className,
  once = true,
  margin = "-60px",
  scale = 1,
}: ScrollRevealProps) {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  const off = offsets[direction];

  return (
    <motion.div
      initial={{ opacity: 0, x: off.x * distance, y: off.y * distance, scale }}
      whileInView={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      viewport={{ once, margin }}
      transition={{
        duration,
        delay,
        ease: [0.2, 0.8, 0.2, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Stagger-wrap children — each child animates in sequence.
 * Use around a grid/flex container's children.
 */
export function StaggerReveal({
  children,
  direction = "up",
  staggerDelay = 0.08,
  baseDelay = 0,
  duration = 0.5,
  distance = 28,
  className,
  once = true,
  margin = "-40px",
}: {
  children: ReactNode[];
  direction?: Direction;
  staggerDelay?: number;
  baseDelay?: number;
  duration?: number;
  distance?: number;
  className?: string;
  once?: boolean;
  margin?: string;
}) {
  const prefersReduced = useReducedMotion();
  const off = offsets[direction];

  if (prefersReduced) {
    return <>{children}</>;
  }

  return (
    <>
      {(Array.isArray(children) ? children : [children]).map((child, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: off.x * distance, y: off.y * distance }}
          whileInView={{ opacity: 1, x: 0, y: 0 }}
          viewport={{ once, margin }}
          transition={{
            duration,
            delay: baseDelay + i * staggerDelay,
            ease: [0.2, 0.8, 0.2, 1],
          }}
          className={className}
        >
          {child}
        </motion.div>
      ))}
    </>
  );
}
