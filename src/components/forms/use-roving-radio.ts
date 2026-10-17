"use client";

import { type KeyboardEvent, useRef } from "react";

/** Arrow keys move between options in a radio group of buttons. */
export function useRovingRadio<T>(options: T[], value: T | undefined, onChange: (next: T) => void) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const forward = event.key === "ArrowRight" || event.key === "ArrowDown";
    const back = event.key === "ArrowLeft" || event.key === "ArrowUp";
    if (!forward && !back) return;
    event.preventDefault();
    const horizontal = event.key === "ArrowLeft" || event.key === "ArrowRight";
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const step = (forward ? 1 : -1) * (rtl && horizontal ? -1 : 1);
    const next = (index + step + options.length) % options.length;
    const nextValue = options[next];
    if (nextValue === undefined) return;
    onChange(nextValue);
    refs.current[next]?.focus();
  };
  const tabIndex = (option: T, index: number) =>
    value === undefined ? (index === 0 ? 0 : -1) : option === value ? 0 : -1;
  return { refs, onKeyDown, tabIndex };
}
