import { Ban, CalendarCheck2, Clock, Lock, Users } from "lucide-react";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { env } from "@/env";
import { formatEventDay } from "@/lib/dates";
import type { EventRecord } from "@/server/repositories/types";
import { rsvpService } from "@/server/services";
import { rsvpBlockReason } from "@/server/services/rsvp.service";
import { avatarTone, THEME_TOKENS } from "@/themes";
import { readRsvpCredential } from "../cookies";
import { type CalendarLinks, CalendarMenu } from "./calendar-menu";
import { RsvpForm } from "./rsvp-form";

const AVATARS_SHOWN = 5;

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
  const theme = THEME_TOKENS[event.theme];
  // Names can repeat (two "Sara"s), so each gets a positional key.
  const names = (guestList?.names ?? []).map((name, position) => ({
    name,
    key: `${position}:${name}`,
    tone: avatarTone(theme, name),
  }));
  const mine = await rsvpService.findByCredential(event.id, credential);

  const notice =
    blocked === "cancelled"
      ? { icon: Ban, title: t("cancelledBanner"), body: t("cancelledBody") }
      : blocked === "ended"
        ? { icon: CalendarCheck2, title: t("ended"), body: t("endedBody") }
        : { icon: Lock, title: t("closedBanner"), body: t("closedBody") };

  return (
    <div className="flex flex-col gap-6">
      {guestList ? (
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            {names.length > 0 ? (
              <span className="flex -space-x-2 rtl:space-x-reverse" aria-hidden="true">
                {names.slice(0, AVATARS_SHOWN).map((entry) => (
                  <span
                    key={entry.key}
                    className="flex size-9 items-center justify-center rounded-full font-bold text-sm ring-[3px] ring-(--invite-card)"
                    style={{ background: entry.tone[0], color: entry.tone[1] }}
                  >
                    {entry.name.trim().charAt(0).toUpperCase()}
                  </span>
                ))}
              </span>
            ) : (
              <span className="invite-chip flex size-9 items-center justify-center rounded-full text-(--invite-accent-ink)">
                <Users className="size-4" aria-hidden="true" />
              </span>
            )}
            <h2 className="font-semibold text-[1.0625rem]">
              {t("goingCount", { count: guestList.going })}
            </h2>
          </div>
          {names.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5">
              {names.map((entry) => (
                <li
                  key={entry.key}
                  className="invite-chip inline-flex items-center gap-1.5 rounded-full py-1 ps-1 pe-3 text-sm"
                >
                  <span
                    className="flex size-6 items-center justify-center rounded-full font-bold text-[0.6875rem]"
                    style={{ background: entry.tone[0], color: entry.tone[1] }}
                    aria-hidden="true"
                  >
                    {entry.name.trim().charAt(0).toUpperCase()}
                  </span>
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

      <section className="flex flex-col gap-4 border-(--invite-card-border) border-t pt-6">
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
              confettiColors: theme.confettiColors,
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
          <div className="flex flex-col items-center gap-3 py-2 text-center">
            <span className="invite-chip flex size-12 items-center justify-center rounded-2xl text-(--invite-accent-ink)">
              <notice.icon className="size-5" aria-hidden="true" />
            </span>
            <div className="flex flex-col gap-1">
              <p className="invite-heading text-xl">{notice.title}</p>
              <p className="text-invite-muted text-sm">{notice.body}</p>
            </div>
          </div>
        )}

        {blocked === null && event.rsvpDeadline ? (
          <p className="flex items-center justify-center gap-1.5 text-invite-muted text-sm">
            <Clock className="size-3.5" aria-hidden="true" />
            {t("deadline", { date: formatEventDay(event.rsvpDeadline, event.timezone) })}
          </p>
        ) : null}
      </section>
    </div>
  );
}
