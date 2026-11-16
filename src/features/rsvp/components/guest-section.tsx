import { CheckCircle2, Users } from "lucide-react";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { env } from "@/env";
import { formatEventDay, formatEventTime } from "@/lib/dates";
import type { EventRecord } from "@/server/repositories/types";
import { rsvpService } from "@/server/services";
import { rsvpBlockReason } from "@/server/services/rsvp.service";
import { avatarTone, THEME_TOKENS } from "@/themes";
import { readRsvpCredential } from "../cookies";
import { type CalendarLinks, CalendarMenu } from "./calendar-menu";
import { RsvpForm } from "./rsvp-form";

const AVATARS_SHOWN = 5;
/** Name chips before the answer buttons; the rest are counted, so the buttons stay put. */
const NAMES_SHOWN = 8;

type NameEntry = { name: string; key: string; tone: readonly [string, string] };

/**
 * The live part of an invite: who's going, and the guest's own response form.
 * Reads cookies and fresh counts, so it renders per request inside <Suspense>.
 * When answers are off, the notice is at the top of the page (`Banners`), so this part
 * only keeps the guest list and the guest's own answer.
 */
export async function GuestSection({
  event,
  calendarLinks,
}: {
  event: EventRecord;
  calendarLinks: CalendarLinks;
}) {
  const [credential, guestList, t, tStatus] = await Promise.all([
    readRsvpCredential(event.id),
    rsvpService.publicGuestList(event),
    getTranslations("eventPage"),
    getTranslations("status"),
  ]);
  await connection();
  const blocked = rsvpBlockReason(event, new Date());
  const theme = THEME_TOKENS[event.theme];
  // Names can repeat (two "Sara"s), so each gets a positional key.
  const names: NameEntry[] = (guestList?.names ?? []).map((name, position) => ({
    name,
    key: `${position}:${name}`,
    tone: avatarTone(theme, name),
  }));
  const mine = await rsvpService.findByCredential(event.id, credential);

  // A cancelled event's headcount means nothing; an ended one's is history.
  const list =
    guestList && blocked !== "cancelled" ? (
      <GuestList
        names={names}
        more={guestList.more}
        title={countLabel(t, {
          going: guestList.going,
          people: guestList.people,
          past: blocked === "ended",
        })}
      />
    ) : null;

  if (blocked !== null) {
    if (!list && !mine) return null;
    return (
      <div className="flex flex-col gap-6">
        {list}
        {mine ? (
          <p className="invite-chip flex items-center gap-2 self-start rounded-full py-1.5 ps-2.5 pe-3.5 text-sm">
            <CheckCircle2 className="size-4 text-(--invite-accent-ink)" aria-hidden="true" />
            {t("yourAnswer", { answer: tStatus(mine.status) })}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {list}
      <section className="flex flex-col gap-4 border-(--invite-card-border) border-t pt-6">
        <RsvpForm
          settings={{
            eventId: event.id,
            hostName: event.hostName,
            namesShown: event.guestListVisibility === "names",
            dateLabel: `${formatEventDay(event.startsAt, event.timezone)} · ${formatEventTime(event.startsAt, event.timezone)}`,
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
          afterSuccess={<CalendarMenu links={calendarLinks} size="lg" />}
        />
      </section>
    </div>
  );
}

/** "3 people going", or "were going" once it's over; "counting +1s" when they make it larger. */
function countLabel(
  t: Awaited<ReturnType<typeof getTranslations<"eventPage">>>,
  { going, people, past }: { going: number; people: number; past: boolean },
): string {
  const withPlusOnes = going > people && people > 0;
  if (past) {
    return withPlusOnes
      ? t("wentCountWithPlusOnes", { count: going })
      : t("wentCount", { count: going });
  }
  return withPlusOnes
    ? t("goingCountWithPlusOnes", { count: going })
    : t("goingCount", { count: going });
}

async function GuestList({
  names,
  more: hiddenMore,
  title,
}: {
  names: NameEntry[];
  /** People going who aren't in `names` (the host shows only the count past a limit). */
  more: number;
  title: string;
}) {
  const t = await getTranslations("eventPage");
  const shown = names.slice(0, NAMES_SHOWN);
  const more = hiddenMore + names.length - shown.length;
  return (
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
        <h2 className="font-semibold text-[1.0625rem]">{title}</h2>
      </div>
      {names.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {shown.map((entry) => (
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
          {more > 0 ? (
            <li className="px-2 py-1 text-invite-muted text-sm">{t("andMore", { count: more })}</li>
          ) : null}
        </ul>
      ) : null}
    </section>
  );
}
