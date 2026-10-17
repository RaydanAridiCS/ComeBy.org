"use client";

import { Flag } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Toaster } from "@/components/ui/sonner";
import { Textarea } from "@/components/ui/textarea";
import { FIELD_LIMITS } from "@/config/limits";
import { reportEventAction } from "../actions";

const REASONS = ["spam", "scam", "inappropriate", "other"] as const;
type Reason = (typeof REASONS)[number];

export function ReportDialog({
  eventId,
  defaultOpen = false,
}: {
  eventId: string;
  /** Open straight away (when the guest clicked before the dialog code loaded). */
  defaultOpen?: boolean;
}) {
  const t = useTranslations("report");
  const [open, setOpen] = useState(defaultOpen);
  const [reason, setReason] = useState<Reason>("spam");
  const [details, setDetails] = useState("");
  const [pending, startTransition] = useTransition();

  const labels: Record<Reason, string> = {
    spam: t("reasonSpam"),
    scam: t("reasonScam"),
    inappropriate: t("reasonInappropriate"),
    other: t("reasonOther"),
  };

  return (
    <>
      {/* The invite page has no global toaster (it stays light), so this dialog brings its own. */}
      <Toaster position="top-center" richColors />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger className="invite-focus inline-flex min-h-8 items-center gap-1.5 rounded text-invite-muted text-xs underline-offset-4 hover:underline">
          <Flag className="size-3" aria-hidden="true" />
          {t("title")}
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("body")}</DialogDescription>
          </DialogHeader>
          <RadioGroup value={reason} onValueChange={(value) => setReason(value as Reason)}>
            {REASONS.map((value) => (
              <label key={value} className="flex items-center gap-2 text-sm">
                <RadioGroupItem value={value} />
                {labels[value]}
              </label>
            ))}
          </RadioGroup>
          <label className="flex flex-col gap-2 text-sm">
            {t("details")}
            <Textarea
              value={details}
              maxLength={FIELD_LIMITS.reportDetailsMaxLength}
              onChange={(event) => setDetails(event.target.value)}
            />
          </label>
          <DialogFooter>
            <Button
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await reportEventAction({ eventId, reason, details });
                  if (!result.ok) return void toast.error(result.error.message);
                  toast.success(t("thanks"));
                  setOpen(false);
                })
              }
            >
              {t("submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
