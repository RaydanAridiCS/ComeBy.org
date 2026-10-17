import type { Transition } from "motion/react";

/*
 * Shared motion tokens for `motion/react` (always used via LazyMotion + m.*).
 * Entrances use the CSS `animate-rise` utility instead (see globals.css).
 */

/** Natural "settle" curve; matches --ease-out-soft in globals.css. */
export const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Snappy spring for presses and selections. */
export const SPRING_PRESS: Transition = { type: "spring", stiffness: 520, damping: 30, mass: 0.8 };

/** Softer spring for layout changes (lists, sliding indicators). */
export const SPRING_LAYOUT: Transition = { type: "spring", stiffness: 300, damping: 30 };

/** Fade + slight rise for items entering a list. */
export const LIST_ITEM = {
  initial: { opacity: 0, y: -8, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, scale: 0.98 },
  transition: { duration: 0.32, ease: EASE_OUT },
} as const;
