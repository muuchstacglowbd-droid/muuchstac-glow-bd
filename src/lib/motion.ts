/**
 * Shared motion vocabulary for the whole app.
 * Keeping variants/springs centralized means every page that adopts
 * framer-motion animates with the same "feel" — no ad-hoc timings.
 */
import { useRef, useState, type MouseEvent } from "react";
import { useMotionTemplate, useMotionValue, useSpring, useTransform } from "framer-motion";
import type { Transition, Variants } from "framer-motion";

/** Standard spring used for hover/press micro-interactions. */
export const springSnappy: Transition = { type: "spring", stiffness: 420, damping: 32, mass: 0.6 };

/** Softer spring for larger movements (page transitions, panels). */
export const springSoft: Transition = { type: "spring", stiffness: 220, damping: 26, mass: 0.7 };

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: springSoft },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  show: { opacity: 1, scale: 1, transition: springSnappy },
};

/** Wrap a list container with this + give each child `variants={staggerItem}`. */
export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: springSoft },
};

/** Page-level enter transition (used by <PageTransition>). */
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 14, scale: 0.99 },
  enter: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } },
};

/**
 * Mouse-tracked 3D tilt, the kind used on premium product/dashboard cards.
 * Attach the returned handlers + style to any element inside a `.tilt-scene`
 * parent and give the element the `.tilt-card` utility class.
 */
export function useTilt3D(strength = 10) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [hovering, setHovering] = useState(false);

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const rotateX = useSpring(useTransform(rawY, [-0.5, 0.5], [strength, -strength]), springSnappy);
  const rotateY = useSpring(useTransform(rawX, [-0.5, 0.5], [-strength, strength]), springSnappy);
  const glowX = useTransform(rawX, [-0.5, 0.5], [0, 100]);
  const glowY = useTransform(rawY, [-0.5, 0.5], [0, 100]);
  const glowPosition = useMotionTemplate`${glowX}% ${glowY}%`;

  function onMouseMove(e: MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    rawX.set((e.clientX - rect.left) / rect.width - 0.5);
    rawY.set((e.clientY - rect.top) / rect.height - 0.5);
  }

  function onMouseLeave() {
    rawX.set(0);
    rawY.set(0);
    setHovering(false);
  }

  return {
    ref,
    hovering,
    style: { rotateX, rotateY, transformPerspective: 1000 },
    glowStyle: { backgroundPosition: glowPosition },
    handlers: {
      onMouseMove,
      onMouseEnter: () => setHovering(true),
      onMouseLeave,
    },
  };
}