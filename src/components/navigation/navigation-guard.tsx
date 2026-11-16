"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  type ComponentProps,
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/*
 * "You have unsaved changes" for the host area, built the way the Next.js docs describe
 * (Link's `onNavigate` plus a shared context; there is no app-wide navigation hook).
 *
 * - A form calls `useUnsavedChanges(dirty)`.
 * - Links that can leave the form are `GuardedLink`s: the dashboard header, the user menu
 *   and the form page's back link.
 * - Closing or reloading the tab is covered by the browser's own `beforeunload` prompt.
 * - The browser's Back button is NOT covered: Next.js gives no supported way to stop it.
 */

type Guard = {
  setBlocked: (blocked: boolean) => void;
  isBlocked: () => boolean;
  /** Runs the action now, or after the person confirms if there are unsaved changes. */
  attempt: (action: () => void) => void;
};

const GuardContext = createContext<Guard>({
  setBlocked: () => {},
  isBlocked: () => false,
  attempt: (action) => action(),
});

export function NavigationGuardProvider({ children }: { children: ReactNode }) {
  const t = useTranslations("common");
  const blocked = useRef(false);
  const [pending, setPending] = useState<(() => void) | null>(null);

  const guard = useMemo<Guard>(
    () => ({
      setBlocked: (value) => {
        blocked.current = value;
      },
      isBlocked: () => blocked.current,
      attempt: (action) => {
        if (blocked.current) setPending(() => action);
        else action();
      },
    }),
    [],
  );

  return (
    <GuardContext.Provider value={guard}>
      {children}
      <AlertDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("unsavedTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("unsavedBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("unsavedStay")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                const action = pending;
                setPending(null);
                // They chose to leave: nothing may ask again on the way out.
                blocked.current = false;
                action?.();
              }}
            >
              {t("unsavedLeave")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </GuardContext.Provider>
  );
}

export function useNavigationGuard(): Guard {
  return useContext(GuardContext);
}

/**
 * Marks the page as having unsaved changes while `dirty` is true. Returns `release`:
 * call it once the changes are saved, before navigating away.
 */
export function useUnsavedChanges(dirty: boolean): () => void {
  const guard = useContext(GuardContext);
  const released = useRef(false);

  useEffect(() => {
    // A page can outlive a save (Next keeps it, hidden, and shows it again later). Once it
    // is clean again, the next edit must be guarded like the first.
    if (!dirty) released.current = false;
    if (!dirty || released.current) return;
    guard.setBlocked(true);
    const warn = (event: BeforeUnloadEvent) => {
      if (released.current || !guard.isBlocked()) return;
      event.preventDefault();
      // Older browsers only show the prompt when this is set.
      event.returnValue = true;
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      guard.setBlocked(false);
      window.removeEventListener("beforeunload", warn);
    };
  }, [dirty, guard]);

  return useCallback(() => {
    released.current = true;
    guard.setBlocked(false);
  }, [guard]);
}

/** A `next/link` that asks before leaving a page with unsaved changes. */
export function GuardedLink({
  href,
  onNavigate,
  ...props
}: Omit<ComponentProps<typeof Link>, "href"> & { href: string }) {
  const guard = useContext(GuardContext);
  const router = useRouter();
  return (
    <Link
      href={href}
      onNavigate={(event) => {
        onNavigate?.(event);
        if (!guard.isBlocked()) return;
        event.preventDefault();
        guard.attempt(() => router.push(href));
      }}
      {...props}
    />
  );
}
