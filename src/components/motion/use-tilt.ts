"use client";

import type { PointerEvent } from "react";

const MAX_DEGREES = 6;

/**
 * Pointer handlers for a subtle 3D tilt on desktop. They only set CSS variables;
 * the `.tilt` class in globals.css applies them (and skips touch screens and
 * reduced motion).
 */
export function useTilt() {
  return {
    onPointerMove(event: PointerEvent<HTMLElement>) {
      if (event.pointerType !== "mouse") return;
      const box = event.currentTarget.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width - 0.5;
      const y = (event.clientY - box.top) / box.height - 0.5;
      event.currentTarget.style.setProperty("--tilt-x", `${(-y * MAX_DEGREES).toFixed(2)}deg`);
      event.currentTarget.style.setProperty("--tilt-y", `${(x * MAX_DEGREES).toFixed(2)}deg`);
    },
    onPointerLeave(event: PointerEvent<HTMLElement>) {
      event.currentTarget.style.removeProperty("--tilt-x");
      event.currentTarget.style.removeProperty("--tilt-y");
    },
  };
}
