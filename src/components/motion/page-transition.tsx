import { type ReactNode, ViewTransition } from "react";

/**
 * Soft fade + rise between dashboard pages, using React's <ViewTransition>
 * (see the view-transition CSS in globals.css). Browsers without the View
 * Transitions API just swap pages, and reduced motion turns it off.
 * Use it in page.tsx, not layouts: layouts persist, so they never enter or exit.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter="page-enter" exit="page-exit" default="none">
      {children}
    </ViewTransition>
  );
}
