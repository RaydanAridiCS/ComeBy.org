"use client";

import { domAnimation, LazyMotion, m, useReducedMotion } from "motion/react";

const COLORS = ["#ff4f79", "#ffc23e", "#4fc3ff", "#8b5cf6", "#22c55e", "#ff8a3d"];
const PIECES = Array.from({ length: 28 }, (_, index) => ({
  id: index,
  x: ((index * 47) % 200) - 100,
  y: -120 - ((index * 31) % 120),
  rotate: (index * 67) % 360,
  color: COLORS[index % COLORS.length],
  delay: (index % 7) * 0.02,
}));

/** A small confetti burst for "You're in!". Skipped when the user prefers reduced motion. */
export function Celebration() {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return null;
  return (
    <LazyMotion features={domAnimation} strict>
      <div
        className="pointer-events-none absolute inset-x-0 top-8 flex justify-center"
        aria-hidden="true"
      >
        {PIECES.map((piece) => (
          <m.span
            key={piece.id}
            className="absolute size-2 rounded-[2px]"
            style={{ background: piece.color }}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
            animate={{
              x: piece.x * 1.6,
              y: [0, piece.y, piece.y + 260],
              opacity: [1, 1, 0],
              rotate: piece.rotate * 3,
            }}
            transition={{ duration: 1.6, ease: "easeOut", delay: piece.delay }}
          />
        ))}
      </div>
    </LazyMotion>
  );
}
