"use client";

import { m, useReducedMotion } from "motion/react";

const PIECES = Array.from({ length: 34 }, (_, index) => {
  const angle = (index / 34) * Math.PI * 2 + (index % 3) * 0.2;
  const distance = 90 + ((index * 37) % 70);
  return {
    id: index,
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance * 0.75 - 40,
    rotate: ((index * 67) % 360) * (index % 2 ? 1 : -1),
    round: index % 4 === 0,
    wide: index % 3 === 0,
    delay: (index % 6) * 0.015,
  };
});

/**
 * A burst of confetti in the invite theme's colours for "You're in!", plus a
 * soft ring. Must render inside a LazyMotion provider. Skipped for reduced motion.
 */
export function Celebration({ colors }: { colors: string[] }) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return null;
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-12 flex justify-center"
      aria-hidden="true"
    >
      <m.span
        className="absolute size-20 rounded-full border-2"
        style={{ borderColor: colors[0] }}
        initial={{ scale: 0.6, opacity: 0.7 }}
        animate={{ scale: 2.6, opacity: 0 }}
        transition={{ duration: 0.9, ease: "easeOut" }}
      />
      {PIECES.map((piece) => (
        <m.span
          key={piece.id}
          className={piece.round ? "absolute size-2 rounded-full" : "absolute rounded-[2px]"}
          style={{
            background: colors[piece.id % colors.length],
            width: piece.round ? undefined : piece.wide ? 10 : 6,
            height: piece.round ? undefined : piece.wide ? 4 : 6,
          }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.4 }}
          animate={{
            x: [0, piece.x, piece.x * 1.15],
            y: [0, piece.y, piece.y + 180],
            opacity: [1, 1, 0],
            rotate: piece.rotate * 2,
            scale: 1,
          }}
          transition={{ duration: 1.5, times: [0, 0.35, 1], ease: "easeOut", delay: piece.delay }}
        />
      ))}
    </div>
  );
}
