"use client";

import { Download, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Spinner } from "@/components/ui/spinner";
import { deleteMyResponseAction } from "../actions";

const linkClass =
  "invite-focus inline-flex items-center gap-1.5 rounded-full px-2 py-1.5 text-invite-muted text-sm underline-offset-4 transition hover:text-(--invite-fg) hover:underline";

/** A guest's own data rights: download what we hold about their response, or delete it. */
export function GuestDataControls({
  eventId,
  onDeleted,
}: {
  eventId: string;
  onDeleted: () => void;
}) {
  const t = useTranslations("rsvp");
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const remove = () => {
    setError(null);
    startTransition(async () => {
      const result = await deleteMyResponseAction(eventId);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      onDeleted();
    });
  };

  return (
    <div className="flex flex-col items-center gap-2 border-(--invite-card-border) border-t pt-4">
      {confirming ? (
        <div
          role="alertdialog"
          aria-labelledby="delete-response-title"
          aria-describedby="delete-response-body"
          className="invite-chip flex w-full flex-col items-center gap-3 rounded-2xl px-4 py-4 text-center"
        >
          <p id="delete-response-title" className="font-semibold text-sm">
            {t("deleteConfirmTitle")}
          </p>
          <p id="delete-response-body" className="text-invite-muted text-sm">
            {t("deleteConfirmBody")}
          </p>
          {error ? (
            <p role="alert" className="text-sm">
              {error}
            </p>
          ) : null}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={remove}
              className="invite-focus inline-flex h-10 items-center gap-2 rounded-full bg-invite-accent px-5 font-semibold text-invite-accent-fg text-sm disabled:opacity-70"
            >
              {pending ? <Spinner /> : <Trash2 className="size-4" aria-hidden="true" />}
              {t("deleteConfirm")}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirming(false)}
              className="invite-focus invite-chip inline-flex h-10 items-center rounded-full px-5 font-semibold text-sm"
            >
              {t("deleteCancel")}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-center gap-x-2">
          <a href={`/api/rsvp/export?event=${eventId}`} download className={linkClass}>
            <Download className="size-4" aria-hidden="true" />
            {t("downloadData")}
          </a>
          <button type="button" onClick={() => setConfirming(true)} className={linkClass}>
            <Trash2 className="size-4" aria-hidden="true" />
            {t("deleteResponse")}
          </button>
        </div>
      )}
    </div>
  );
}
