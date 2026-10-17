import { Lock, Users } from "lucide-react";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { env } from "@/env";
import { formatEventDay } from "@/lib/dates";
import type { EventRecord } from "@/server/repositories/types";
import { rsvpService } from "@/server/services";
import { rsvpBlockReason } from "@/server/services/rsvp.service";
import { readRsvpCredential } from "../cookies";
import { type CalendarLinks, CalendarMenu } from "./calendar-menu";
import { RsvpForm } from "./rsvp-form";

/**
 * The live part of an invite: who's going, and the guest's own response form.
 * Reads cookies and fresh counts, so it renders per request inside <Suspense>.
 */
export async function GuestSection({
  event,
  calendarLinks,
}: {
  event: EventRecord;
  calendarLinks: CalendarLinks;
}) {
  const [credential, guestList, t] = await Promise.all([
    readRsvpCredential(event.id),
    rsvpService.publicGuestList(event),
    getTranslations("eventPage"),
  ]);
  await connection();
  const blocked = rsvpBlockReason(event, new Date());
  // Names can repeat (two "Sara"s), so each gets a positional key.
  const names = (guestList?.names ?? []).map((name, position) => ({
    name,
    key: `${position}:${name}`,
  }));
  const mine = await rsvpService.findByCredential(event.id, credential);

  return (
    <div className="flex flex-col gap-6">
      {guestList ? (
        <section className="flex flex-col gap-2">
          <h2 className="flex items-center gap-2 font-semibold">
            <Users className="size-4 text-invite-muted" aria-hidden="true" />
            {t("goingCount", { count: guestList.going })}
          </h2>
          {names.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5">
              {names.map((entry) => (
                <li
                  key={entry.key}
                  className="rounded-full bg-invite-accent-soft px-3 py-1 text-sm"
                >
                  {entry.name}
                </li>
              ))}
              {guestList.more > 0 ? (
                <li className="px-2 py-1 text-invite-muted text-sm">
                  {t("andMore", { count: guestList.more })}
                </li>
              ) : null}
            </ul>
          ) : null}
        </section>
      ) : null}

      <div className="rounded-2xl border border-[color:var(--invite-card-border)] p-4 sm:p-5">
        {blocked === null ? (
          <RsvpForm
            settings={{
              eventId: event.id,
              hostName: event.hostName,
              phoneMode: event.phoneMode,
              allowMessage: event.allowMessage,
              allowPlusOnes: event.allowPlusOnes,
              maxPlusOnes: event.maxPlusOnes,
              questions: event.customQuestions,
            }}
            existing={
              mine
                ? {
                    status: mine.status,
                    name: mine.name,
                    phone: mine.phone ?? "",
                    email: mine.email ?? "",
                    message: mine.message ?? "",
                    plusOnes: mine.plusOnes,
                    answers: mine.answers,
                  }
                : null
            }
            turnstileSiteKey={env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
            afterSuccess={<CalendarMenu links={calendarLinks} />}
          />
        ) : (
          <p className="flex items-center justify-center gap-2 py-2 text-center font-medium">
            <Lock className="size-4" aria-hidden="true" />
            {blocked === "cancelled"
              ? t("cancelledBanner")
              : blocked === "ended"
                ? t("ended")
                : t("closedBanner")}
          </p>
        )}
      </div>

      {blocked === null && event.rsvpDeadline ? (
        <p className="text-center text-invite-muted text-sm">
          {t("deadline", { date: formatEventDay(event.rsvpDeadline, event.timezone) })}
        </p>
      ) : null}
    </div>
  );
}
