"use client";

import { type RefObject, useCallback, useEffect, useReducer, useRef } from "react";

/** How long a request waits for an invalid field to appear before it gives up. */
const GIVE_UP_AFTER_MS = 1500;

/**
 * After a failed submit, moves focus to the first invalid control in the form (the first
 * element with `aria-invalid="true"`, in page order) and scrolls it to the middle of the
 * screen, clear of any sticky bar.
 *
 * Call the returned function when a submit fails, in the browser or on the server. The
 * focus happens after the next render that shows an invalid field. A collapsed
 * `<details>` section around the field is opened first.
 */
export function useFocusFirstInvalid(formRef: RefObject<HTMLElement | null>): () => void {
  const wanted = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, rerender] = useReducer((count: number) => count + 1, 0);

  // No dependency list on purpose: the errors may reach the page a render or two after the request.
  useEffect(() => {
    if (!wanted.current) return;
    const target = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    if (!target) return;
    wanted.current = false;
    // The field may sit in a collapsed <details> section: open every one around it first.
    for (
      let section = target.closest("details");
      section;
      section = section.parentElement?.closest("details") ?? null
    ) {
      section.open = true;
    }
    target.focus({ preventScroll: true });
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ block: "center", behavior: calm ? "auto" : "smooth" });
  });

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return useCallback(() => {
    wanted.current = true;
    if (timer.current) clearTimeout(timer.current);
    // A failure with no field to point at must not grab focus on some later, unrelated error.
    timer.current = setTimeout(() => {
      wanted.current = false;
    }, GIVE_UP_AFTER_MS);
    rerender();
  }, []);
}
