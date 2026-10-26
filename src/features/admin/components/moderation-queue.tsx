"use client";

import { ExternalLink, EyeOff, RotateCcw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/result";
import { deleteEventAsAdminAction, restoreEventAction } from "../actions";

/** What the page passes down: plain values only, so it can cross the server/client boundary. */
export type QueueItem = {
  id: string;
  slug: string;
  title: string;
  status: "active" | "cancelled";
  hostName: string;
  hostEmail: string;
  reportCount: number;
  hidden: boolean;
  /** Reason key (e.g. `spam`) and how many reports gave it. */
  reasons: { reason: "spam" | "scam" | "inappropriate" | "other"; count: number }[];
  recentDetails: string[];
};

const REASON_LABEL = {
  spam: "reasonSpam",
  scam: "reasonScam",
  inappropriate: "reasonInappropriate",
  other: "reasonOther",
} as const;

export function ModerationQueue({ items }: { items: QueueItem[] }) {
  const t = useTranslations("admin");
  const tReport = useTranslations("report");
  const tCommon = useTranslations("common");
  const [pending, startTransition] = useTransition();
  const [dialog, setDialog] = useState<{ kind: "restore" | "delete"; item: QueueItem } | null>(
    null,
  );

  const run = (work: () => Promise<ActionResult>, success: string) =>
    startTransition(async () => {
      const result = await work();
      if (result.ok) toast.success(success);
      else toast.error(result.error.message);
      setDialog(null);
    });

  if (items.length === 0) {
    return (
      <p className="rounded-3xl border bg-card p-6 text-muted-foreground">{t("queueEmpty")}</p>
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex flex-col gap-3 rounded-3xl border bg-card p-5 shadow-xs"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-1">
                <h3 className="heading truncate text-lg">{item.title}</h3>
                <p className="text-muted-foreground text-sm">
                  {t("host", { name: item.hostName, email: item.hostEmail })}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {item.hidden ? (
                  <Badge variant="destructive">
                    <EyeOff aria-hidden="true" />
                    {t("hidden")}
                  </Badge>
                ) : (
                  <Badge variant="secondary">{t("visible")}</Badge>
                )}
                {item.status === "cancelled" ? (
                  <Badge variant="outline">{t("cancelled")}</Badge>
                ) : null}
                <Badge variant="outline">{t("reportsCount", { count: item.reportCount })}</Badge>
              </div>
            </div>

            {item.reasons.length > 0 ? (
              <p className="text-sm">
                {item.reasons
                  .map(({ reason, count }) => `${tReport(REASON_LABEL[reason])} (${count})`)
                  .join(" · ")}
              </p>
            ) : null}
            {item.recentDetails.length > 0 ? (
              <ul className="flex flex-col gap-1.5">
                {item.recentDetails.map((details) => (
                  <li
                    key={details}
                    className="whitespace-pre-wrap break-words rounded-xl bg-muted px-3 py-2 text-sm"
                  >
                    {details}
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={`/${item.slug}`} target="_blank">
                  <ExternalLink />
                  {t("viewInvite")}
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => setDialog({ kind: "restore", item })}
              >
                <RotateCcw />
                {t("restore")}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={pending}
                onClick={() => setDialog({ kind: "delete", item })}
              >
                <Trash2 />
                {t("delete")}
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <AlertDialog open={dialog !== null} onOpenChange={(open) => !open && setDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {dialog?.kind === "delete" ? t("deleteTitle") : t("restoreTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {dialog?.item.title}
              {" — "}
              {dialog?.kind === "delete" ? t("deleteBody") : t("restoreBody")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                if (!dialog) return;
                const { kind, item } = dialog;
                if (kind === "delete") {
                  run(() => deleteEventAsAdminAction(item.id), t("deleted"));
                } else {
                  run(() => restoreEventAction(item.id), t("restored"));
                }
              }}
            >
              {dialog?.kind === "delete" ? t("delete") : t("restore")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
