import { ImageResponse } from "next/og";
import { SITE } from "@/config/site";
import { getPublicEvent } from "@/features/events/queries";
import { getServerTranslator } from "@/i18n/config";
import { formatEventDay, formatEventTime } from "@/lib/dates";
import { THEME_TOKENS } from "@/themes";

export const alt = "Invitation";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * The preview card shown when an invite link is pasted into WhatsApp, iMessage,
 * Instagram and others. Uses the event's theme colours.
 */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = getServerTranslator();
  const event = await getPublicEvent(slug.toLowerCase());
  const theme = THEME_TOKENS[event?.theme ?? "confetti"];
  const visible = event && !event.hiddenAt;

  const title = visible ? event.title : SITE.name;
  const subtitle = visible
    ? `${formatEventDay(event.startsAt, event.timezone)} · ${formatEventTime(event.startsAt, event.timezone)}`
    : SITE.tagline;
  const host = visible ? t("eventPage.hostedBy", { name: event.hostName }) : SITE.domain;
  const cancelled = visible && event.status === "cancelled";

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: theme.background,
        backgroundColor: theme.backgroundSolid,
        padding: 56,
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          background: theme.card,
          border: `2px solid ${theme.cardBorder}`,
          borderRadius: 40,
          padding: 56,
          color: theme.foreground,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 30,
            color: theme.muted,
          }}
        >
          <span style={{ fontSize: 44 }}>{theme.emoji}</span>
          <span>{host}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {cancelled ? (
            <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: "#dc2626" }}>
              {t("og.cancelled").toUpperCase()}
            </div>
          ) : null}
          <div
            style={{
              display: "flex",
              fontSize: title.length > 40 ? 64 : 80,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -1,
            }}
          >
            {title}
          </div>
          <div style={{ display: "flex", fontSize: 36, color: theme.muted }}>{subtitle}</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              background: theme.accent,
              color: theme.accentForeground,
              borderRadius: 999,
              padding: "16px 36px",
              fontSize: 32,
              fontWeight: 700,
            }}
          >
            {t("og.tapToRsvp")}
          </div>
          <div style={{ display: "flex", fontSize: 28, color: theme.muted }}>{SITE.domain}</div>
        </div>
      </div>
    </div>,
    { ...size },
  );
}
