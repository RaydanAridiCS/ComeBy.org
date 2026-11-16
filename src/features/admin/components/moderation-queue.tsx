"use client";

import { ExternalLink, EyeOff, RotateCcw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog, outcomeOf } from "@/components/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  const [dialog, setDialog] = useState<{ kind: "restore" | "delete"; item: QueueItem } | null>(
    null,
  );

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
                onClick={() => setDialog({ kind: "restore", item })}
              >
                <RotateCcw />
                {t("restore")}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDialog({ kind: "delete", item })}
              >
                <Trash2 />
                {t("delete")}
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={dialog !== null}
        onOpenChange={(open) => !open && setDialog(null)}
        variant={dialog?.kind === "delete" ? "destructive" : "default"}
        title={dialog?.kind === "delete" ? t("deleteTitle") : t("restoreTitle")}
        description={
          <>
            {dialog?.item.title}
            {" — "}
            {dialog?.kind === "delete" ? t("deleteBody") : t("restoreBody")}
          </>
        }
        confirmLabel={dialog?.kind === "delete" ? t("delete") : t("restore")}
        onConfirm={async () => {
          if (!dialog) return { ok: true };
          const { kind, item } = dialog;
          const result =
            kind === "delete"
              ? await deleteEventAsAdminAction(item.id)
              : await restoreEventAction(item.id);
          if (result.ok) toast.success(kind === "delete" ? t("deleted") : t("restored"));
          return outcomeOf(result);
        }}
      />
    </>
  );
}
