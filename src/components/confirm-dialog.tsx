"use client";

import { useTranslations } from "next-intl";
import { AlertDialog as AlertDialogPrimitive } from "radix-ui";
import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialogOverlay, AlertDialogPortal } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { ActionResult } from "@/lib/result";

/** What `onConfirm` reports back: close the dialog, or keep it open with this message. */
export type ConfirmOutcome = { ok: true } | { ok: false; message: string };

/** Turns a server action's result into a `ConfirmOutcome`. */
export function outcomeOf(result: ActionResult<unknown>): ConfirmOutcome {
  return result.ok ? { ok: true } : { ok: false, message: result.error.message };
}

/**
 * How far a phone's on-screen keyboard reaches into the layout viewport. Chrome on Android
 * draws the keyboard over the page instead of shrinking it, which would hide a sheet pinned
 * to the bottom while its text field is being typed into.
 */
function useKeyboardInset(active: boolean): number {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!active || !viewport) return;
    const update = () =>
      setInset(Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop));
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      setInset(0);
    };
  }, [active]);
  return inset;
}

/**
 * The one confirm step for actions that can't be taken back. A sheet from the bottom on a
 * phone, with the confirm button last, where the thumb is; a centred dialog from `sm` up.
 *
 * While `onConfirm` runs the dialog stays open: the confirm button spins, nothing else can
 * close it, and on failure the message shows inside the dialog. It closes once `onConfirm`
 * reports `{ ok: true }`. Focus goes back to the trigger, to `returnFocusTo()` if given, or
 * to the page's `<main>` when the element that opened it is gone.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  confirmLabel,
  cancelLabel,
  variant = "default",
  confirmDisabled = false,
  onConfirm,
  returnFocusTo,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** The button that opens it, when the dialog isn't controlled from outside. */
  trigger?: ReactNode;
  title: ReactNode;
  description: ReactNode;
  /** Anything to fill in before confirming (a message, a typed word). */
  children?: ReactNode;
  confirmLabel: ReactNode;
  cancelLabel?: ReactNode;
  variant?: "default" | "destructive";
  confirmDisabled?: boolean;
  onConfirm: () => Promise<ConfirmOutcome>;
  returnFocusTo?: () => HTMLElement | null | undefined;
}) {
  const t = useTranslations("common");
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isOpen = open ?? uncontrolledOpen;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const keyboard = useKeyboardInset(isOpen);
  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  function setOpen(next: boolean) {
    // Nothing closes it halfway through: the result decides.
    if (!next && pending) return;
    if (next) setError(null);
    setUncontrolledOpen(next);
    onOpenChange?.(next);
  }

  async function confirm() {
    setPending(true);
    setError(null);
    let outcome: ConfirmOutcome;
    try {
      outcome = await onConfirm();
    } catch {
      // The request never came back: offline, or the server is down.
      outcome = { ok: false, message: t("networkError") };
    }
    if (!mounted.current) return;
    setPending(false);
    if (outcome.ok) {
      setUncontrolledOpen(false);
      onOpenChange?.(false);
    } else {
      setError(outcome.message);
    }
  }

  return (
    <AlertDialogPrimitive.Root open={isOpen} onOpenChange={setOpen}>
      {trigger ? (
        <AlertDialogPrimitive.Trigger asChild>{trigger}</AlertDialogPrimitive.Trigger>
      ) : null}
      <AlertDialogPortal>
        <AlertDialogOverlay />
        <AlertDialogPrimitive.Content
          data-slot="confirm-dialog"
          aria-busy={pending}
          onEscapeKeyDown={(event) => {
            if (pending) event.preventDefault();
          }}
          onCloseAutoFocus={(event) => {
            const target = returnFocusTo?.();
            if (target) {
              event.preventDefault();
              target.focus();
              return;
            }
            // Radix puts focus back on the opener; if that has gone (a removed row),
            // start again from the top of the page's content rather than the document.
            requestAnimationFrame(() => {
              if (document.activeElement === document.body) {
                document.getElementById("main")?.focus();
              }
            });
          }}
          // Below sm: a sheet on the bottom edge, lifted above an on-screen keyboard and
          // clear of the home bar. From sm: the centred dialog.
          style={{ "--keyboard": `${keyboard}px` } as CSSProperties}
          className="fixed inset-x-0 bottom-(--keyboard) z-50 flex max-h-[85dvh] flex-col gap-4 overflow-y-auto rounded-t-3xl bg-popover ps-[max(1.25rem,var(--safe-left))] pe-[max(1.25rem,var(--safe-right))] pt-6 pb-[calc(1rem+var(--safe-bottom))] text-popover-foreground shadow-xl outline-none ring-1 ring-foreground/10 duration-200 data-closed:animate-out data-closed:fade-out-0 data-closed:slide-out-to-bottom-10 data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-bottom-10 sm:inset-x-auto sm:start-1/2 sm:top-1/2 sm:bottom-auto sm:w-full sm:max-w-sm sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:p-6 sm:duration-100 sm:data-closed:slide-out-to-bottom-0 sm:data-closed:zoom-out-95 sm:data-open:slide-in-from-bottom-0 sm:data-open:zoom-in-95 rtl:sm:translate-x-1/2"
        >
          <div className="flex flex-col gap-1.5">
            <AlertDialogPrimitive.Title className="heading text-lg leading-snug">
              {title}
            </AlertDialogPrimitive.Title>
            <AlertDialogPrimitive.Description className="text-muted-foreground text-sm text-pretty">
              {description}
            </AlertDialogPrimitive.Description>
          </div>
          {children}
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          {/* On a phone the confirm button comes last, nearest the thumb. */}
          <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-end">
            <AlertDialogPrimitive.Cancel asChild>
              <Button variant="outline" disabled={pending} className="w-full sm:w-auto">
                {cancelLabel ?? t("cancel")}
              </Button>
            </AlertDialogPrimitive.Cancel>
            <Button
              variant={variant}
              disabled={pending || confirmDisabled}
              onClick={confirm}
              className="w-full sm:w-auto"
            >
              {pending ? <Spinner aria-label={t("working")} /> : null}
              {confirmLabel}
            </Button>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPortal>
    </AlertDialogPrimitive.Root>
  );
}
