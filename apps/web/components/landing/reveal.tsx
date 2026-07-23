"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** Stagger offset in seconds. */
  delay?: number;
  /** Vertical travel distance in px. */
  y?: number;
  /** Animate on mount instead of when scrolled into view. */
  mount?: boolean;
};

/**
 * Minimal fade-up wrapper. Honors `prefers-reduced-motion` by rendering the
 * content instantly (no transform, no fade) so reduced-motion users get the
 * final state with zero movement.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 16,
  mount = false,
}: RevealProps) {
  const reduce = useReducedMotion();

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  const hidden = { opacity: 0, y };
  const shown = { opacity: 1, y: 0 };

  const anim = mount
    ? { initial: hidden, animate: shown }
    : {
        initial: hidden,
        whileInView: shown,
        viewport: { once: true, amount: 0.3 },
      };

  return (
    <motion.div
      className={className}
      transition={{ duration: 0.4, ease: [0, 0, 0.2, 1], delay }}
      {...anim}
    >
      {children}
    </motion.div>
  );
}
