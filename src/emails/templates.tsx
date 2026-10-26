import { Text } from "react-email";
import { getServerTranslator } from "@/i18n/config";
import { EmailLayout, EventDetails, emailStyles } from "./layout";

/*
 * Every email Comeby sends. Each template returns its subject next to the React
 * element so the email service can render both from one place.
 */

export type RenderableEmail = { subject: string; element: React.ReactElement };

export function verifyEmail(props: { name: string; url: string }): RenderableEmail {
  const t = getServerTranslator();
  return {
    subject: t("emails.verifySubject"),
    element: (
      <EmailLayout
        preview={t("emails.verifyHeading")}
        heading={t("emails.verifyHeading")}
        action={{ label: t("emails.verifyButton"), href: props.url }}
        footnote={t("emails.verifyIgnore")}
      >
        <Text style={emailStyles.paragraph}>{t("emails.verifyBody", { name: props.name })}</Text>
      </EmailLayout>
    ),
  };
}

/** Sent to the current address when the account's email is about to change. */
export function changeEmailConfirm(props: { newEmail: string; url: string }): RenderableEmail {
  const t = getServerTranslator();
  return {
    subject: t("emails.changeEmailSubject"),
    element: (
      <EmailLayout
        preview={t("emails.changeEmailHeading")}
        heading={t("emails.changeEmailHeading")}
        action={{ label: t("emails.changeEmailButton"), href: props.url }}
        footnote={t("emails.changeEmailIgnore")}
      >
        <Text style={emailStyles.paragraph}>
          {t("emails.changeEmailBody", { email: props.newEmail })}
        </Text>
      </EmailLayout>
    ),
  };
}

export function resetPassword(props: { url: string }): RenderableEmail {
  const t = getServerTranslator();
  return {
    subject: t("emails.resetSubject"),
    element: (
      <EmailLayout
        preview={t("emails.resetHeading")}
        heading={t("emails.resetHeading")}
        action={{ label: t("emails.resetButton"), href: props.url }}
        footnote={t("emails.resetIgnore")}
      >
        <Text style={emailStyles.paragraph}>{t("emails.resetBody")}</Text>
      </EmailLayout>
    ),
  };
}

export function rsvpConfirmation(props: {
  guestName: string;
  eventTitle: string;
  status: string;
  when: string;
  where: string | null;
  editUrl: string;
}): RenderableEmail {
  const t = getServerTranslator();
  return {
    subject: t("emails.rsvpConfirmSubject", { status: props.status, event: props.eventTitle }),
    element: (
      <EmailLayout
        preview={t("emails.rsvpConfirmBody", { status: props.status, event: props.eventTitle })}
        heading={t("emails.rsvpConfirmHeading", { name: props.guestName })}
        action={{ label: t("emails.rsvpConfirmButton"), href: props.editUrl }}
        footnote={t("emails.rsvpConfirmKeep")}
      >
        <Text style={emailStyles.paragraph}>
          {t("emails.rsvpConfirmBody", { status: props.status, event: props.eventTitle })}
        </Text>
        <EventDetails when={props.when} where={props.where} />
      </EmailLayout>
    ),
  };
}

/** Sent after a guest deletes their response. Names nothing but the event. */
export function rsvpDeleted(props: { eventTitle: string }): RenderableEmail {
  const t = getServerTranslator();
  return {
    subject: t("emails.rsvpDeletedSubject", { event: props.eventTitle }),
    element: (
      <EmailLayout
        preview={t("emails.rsvpDeletedHeading")}
        heading={t("emails.rsvpDeletedHeading")}
        footnote={t("emails.rsvpDeletedFootnote")}
      >
        <Text style={emailStyles.paragraph}>
          {t("emails.rsvpDeletedBody", { event: props.eventTitle })}
        </Text>
      </EmailLayout>
    ),
  };
}

export function hostRsvpAlert(props: {
  guestName: string;
  eventTitle: string;
  status: string;
  from?: string;
  message: string | null;
  totals: { going: number; maybe: number; notGoing: number };
  dashboardUrl: string;
  unsubscribeUrl?: string;
}): RenderableEmail {
  const t = getServerTranslator();
  const changed = Boolean(props.from);
  const subject = changed
    ? t("emails.hostAlertChangedSubject", {
        name: props.guestName,
        status: props.status,
        event: props.eventTitle,
      })
    : t("emails.hostAlertSubject", {
        name: props.guestName,
        status: props.status,
        event: props.eventTitle,
      });
  return {
    subject,
    element: (
      <EmailLayout
        unsubscribeUrl={props.unsubscribeUrl}
        preview={subject}
        heading={t("emails.hostAlertHeading", { event: props.eventTitle })}
        action={{ label: t("emails.hostAlertButton"), href: props.dashboardUrl }}
        footnote={t("emails.hostAlertSettings")}
      >
        <Text style={emailStyles.paragraph}>
          {changed
            ? t("emails.hostAlertChangedBody", {
                name: props.guestName,
                from: props.from ?? "",
                to: props.status,
              })
            : t("emails.hostAlertBody", { name: props.guestName, status: props.status })}
        </Text>
        {props.message ? (
          <Text style={emailStyles.quote}>
            {t("emails.hostAlertMessage", { message: props.message })}
          </Text>
        ) : null}
        <Text style={emailStyles.paragraph}>{t("emails.hostAlertTotals", props.totals)}</Text>
      </EmailLayout>
    ),
  };
}

export function hostDigest(props: {
  total: number;
  events: { title: string; count: number }[];
  dashboardUrl: string;
  unsubscribeUrl?: string;
}): RenderableEmail {
  const t = getServerTranslator();
  const subject = t("emails.digestSubject", { count: props.total });
  return {
    subject,
    element: (
      <EmailLayout
        unsubscribeUrl={props.unsubscribeUrl}
        preview={subject}
        heading={t("emails.digestHeading")}
        action={{ label: t("emails.digestButton"), href: props.dashboardUrl }}
        footnote={t("emails.hostAlertSettings")}
      >
        {props.events.map((event) => (
          <Text key={event.title} style={emailStyles.paragraph}>
            {t("emails.digestEventLine", { event: event.title, count: event.count })}
          </Text>
        ))}
      </EmailLayout>
    ),
  };
}

export function eventUpdated(props: {
  guestName: string;
  eventTitle: string;
  changes: string;
  when: string;
  where: string | null;
  eventUrl: string;
  unsubscribeUrl?: string;
}): RenderableEmail {
  const t = getServerTranslator();
  return {
    subject: t("emails.updateSubject", { event: props.eventTitle }),
    element: (
      <EmailLayout
        unsubscribeUrl={props.unsubscribeUrl}
        preview={t("emails.updateHeading", { event: props.eventTitle })}
        heading={t("emails.updateHeading", { event: props.eventTitle })}
        action={{ label: t("emails.updateButton"), href: props.eventUrl }}
      >
        <Text style={emailStyles.paragraph}>
          {t("emails.updateBody", { name: props.guestName, changes: props.changes })}
        </Text>
        <EventDetails when={props.when} where={props.where} />
      </EmailLayout>
    ),
  };
}

/** The "it's almost here" email, sent once to going and maybe guests. */
export function guestReminder(props: {
  guestName: string;
  eventTitle: string;
  when: string;
  where: string | null;
  eventUrl: string;
  unsubscribeUrl?: string;
}): RenderableEmail {
  const t = getServerTranslator();
  return {
    subject: t("emails.reminderSubject", { event: props.eventTitle }),
    element: (
      <EmailLayout
        unsubscribeUrl={props.unsubscribeUrl}
        preview={t("emails.reminderHeading", { event: props.eventTitle })}
        heading={t("emails.reminderHeading", { event: props.eventTitle })}
        action={{ label: t("emails.reminderButton"), href: props.eventUrl }}
      >
        <Text style={emailStyles.paragraph}>
          {t("emails.reminderBody", { name: props.guestName })}
        </Text>
        <EventDetails when={props.when} where={props.where} />
      </EmailLayout>
    ),
  };
}

/** The host's one-time "still waiting on your answer" email. */
export function guestNudge(props: {
  eventTitle: string;
  hostName: string;
  when: string;
  where: string | null;
  eventUrl: string;
  unsubscribeUrl?: string;
}): RenderableEmail {
  const t = getServerTranslator();
  return {
    subject: t("emails.nudgeSubject", { event: props.eventTitle }),
    element: (
      <EmailLayout
        unsubscribeUrl={props.unsubscribeUrl}
        preview={t("emails.nudgeSubject", { event: props.eventTitle })}
        heading={t("emails.nudgeHeading", { event: props.eventTitle })}
        action={{ label: t("emails.nudgeButton"), href: props.eventUrl }}
      >
        <Text style={emailStyles.paragraph}>{t("emails.nudgeBody", { host: props.hostName })}</Text>
        <EventDetails when={props.when} where={props.where} />
      </EmailLayout>
    ),
  };
}

export function eventCancelled(props: {
  guestName: string;
  eventTitle: string;
  message: string | null;
  eventUrl: string;
  unsubscribeUrl?: string;
}): RenderableEmail {
  const t = getServerTranslator();
  return {
    subject: t("emails.cancelSubject", { event: props.eventTitle }),
    element: (
      <EmailLayout
        unsubscribeUrl={props.unsubscribeUrl}
        preview={t("emails.cancelHeading", { event: props.eventTitle })}
        heading={t("emails.cancelHeading", { event: props.eventTitle })}
        action={{ label: t("emails.updateButton"), href: props.eventUrl }}
      >
        <Text style={emailStyles.paragraph}>
          {t("emails.cancelBody", { name: props.guestName })}
        </Text>
        {props.message ? (
          <Text style={emailStyles.quote}>
            {t("emails.cancelMessage", { message: props.message })}
          </Text>
        ) : null}
      </EmailLayout>
    ),
  };
}

/** Sent to operators when an event is hidden automatically after reports. */
export function eventHiddenAlert(props: {
  eventTitle: string;
  reportCount: number;
  adminUrl: string;
}): RenderableEmail {
  const t = getServerTranslator();
  return {
    subject: t("emails.hiddenSubject", { event: props.eventTitle }),
    element: (
      <EmailLayout
        preview={t("emails.hiddenHeading")}
        heading={t("emails.hiddenHeading")}
        action={{ label: t("emails.hiddenButton"), href: props.adminUrl }}
      >
        <Text style={emailStyles.paragraph}>
          {t("emails.hiddenBody", { event: props.eventTitle, count: props.reportCount })}
        </Text>
      </EmailLayout>
    ),
  };
}
