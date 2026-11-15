"use client";

import { Flag } from "lucide-react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useState } from "react";

const triggerClass =
  "invite-focus inline-flex min-h-8 items-center gap-1.5 rounded text-invite-muted text-xs underline-offset-4 hover:underline";

function TriggerLookalike(props: { onIntent?: () => void; onOpen?: () => void }) {
  const t = useTranslations("report");
  return (
    <button
      type="button"
      className={triggerClass}
      onPointerEnter={props.onIntent}
      onFocus={props.onIntent}
      onClick={props.onOpen}
    >
      <Flag className="size-3" aria-hidden="true" />
      {t("title")}
    </button>
  );
}

const ReportDialog = dynamic(
  () => import("./report-dialog").then((module) => module.ReportDialog),
  {
    ssr: false,
    loading: () => <TriggerLookalike />,
  },
);

/**
 * The "Report this event" link. The dialog's code (and its UI library) only
 * loads when someone shows intent, so it costs nothing on a normal page view.
 */
export function ReportLauncher({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    // Intent only warms the download. Swapping the button out here would swallow the tap
    // that follows it, so a phone needed two taps to open the dialog.
    return (
      <TriggerLookalike
        onIntent={() => void import("./report-dialog")}
        onOpen={() => setOpen(true)}
      />
    );
  }
  return <ReportDialog eventId={eventId} defaultOpen />;
}
