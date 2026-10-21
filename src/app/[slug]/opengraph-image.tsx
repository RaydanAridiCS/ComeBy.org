import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { LOGO_PATH } from "@/components/brand/logo";
import { SITE } from "@/config/site";
import { getPublicEvent } from "@/features/events/queries";
import { getServerTranslator } from "@/i18n/config";
import { formatDateParts, formatEventDay, formatEventTime } from "@/lib/dates";
import { THEME_TOKENS, type ThemeTokens } from "@/themes";
import { OgArt } from "@/themes/og-art";

export const alt = "Invitation";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Static TTFs (see src/themes/og-fonts/README.md). Literal paths so the build traces them.
const fonts = Promise.all([
  readFile(join(process.cwd(), "src/themes/og-fonts/fredoka-700.ttf")),
  readFile(join(process.cwd(), "src/themes/og-fonts/fraunces-600.ttf")),
  readFile(join(process.cwd(), "src/themes/og-fonts/instrument-serif-400.ttf")),
  readFile(join(process.cwd(), "src/themes/og-fonts/unbounded-700.ttf")),
  readFile(join(process.cwd(), "src/themes/og-fonts/geist-500.ttf")),
  readFile(join(process.cwd(), "src/themes/og-fonts/geist-650.ttf")),
  readFile(join(process.cwd(), "src/themes/og-fonts/bricolage-700.ttf")),
]);

const DISPLAY_FONT: Record<ThemeTokens["id"], { name: string; weight: 400 | 600 | 700 }> = {
  confetti: { name: "Fredoka", weight: 700 },
  wild: { name: "Fraunces", weight: 600 },
  sunset: { name: "Instrument Serif", weight: 400 },
  midnight: { name: "Unbounded", weight: 700 },
  clean: { name: "Geist", weight: 600 },
  velvet: { name: "Instrument Serif", weight: 400 },
  cyber: { name: "Unbounded", weight: 700 },
  aura: { name: "Fraunces", weight: 600 },
  oasis: { name: "Fredoka", weight: 700 },
  matcha: { name: "Fraunces", weight: 600 },
};

/** Satori can't blur, so translucent "glass" cards get more opaque to keep text readable. */
function ogCard(theme: ThemeTokens): string {
  return theme.surface === "glass" ? theme.card.replace(/[\d.]+\)$/, "0.93)") : theme.card;
}

function titleSize(title: string, scale: number): number {
  const base = title.length <= 16 ? 92 : title.length <= 28 ? 72 : title.length <= 44 ? 58 : 48;
  return Math.round(base * scale);
}

/**
 * The preview card shown when an invite link is pasted into WhatsApp, iMessage,
 * Instagram and others. Uses the event's theme colours, art and display font.
 */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = getServerTranslator();
  const event = await getPublicEvent(slug.toLowerCase());
  const theme = THEME_TOKENS[event?.theme ?? "confetti"];
  const visible = event && !event.hiddenAt;

  const title = visible ? event.title : SITE.name;
  const when = visible
    ? `${formatEventDay(event.startsAt, event.timezone)} · ${formatEventTime(event.startsAt, event.timezone)}`
    : SITE.tagline;
  const where = visible
    ? event.locationType === "online"
      ? t("eventPage.online")
      : event.locationType === "physical"
        ? event.locationName || event.locationAddress
        : null
    : null;
  const host = visible ? t("eventPage.hostedBy", { name: event.hostName }) : SITE.domain;
  const initial = visible ? event.hostName.trim().charAt(0).toUpperCase() : "C";
  const cancelled = visible && event.status === "cancelled";
  const display = DISPLAY_FONT[theme.id];
  const [fredoka, fraunces, instrument, unbounded, geist500, geist650, bricolage] = await fonts;

  const chip = {
    display: "flex",
    alignItems: "center",
    gap: 14,
    alignSelf: "flex-start",
    background: theme.accentSoft,
    color: theme.foreground,
    borderRadius: 999,
    padding: "10px 22px",
    fontSize: 26,
    maxWidth: 640,
  } as const;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        background: theme.ogBackground,
        fontFamily: "Geist",
      }}
    >
      <OgArt theme={theme.id} />
      {theme.id === "clean" && visible ? (
        <div
          style={{
            position: "absolute",
            top: 40,
            right: 48,
            width: 300,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            color: "#111522",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 250,
              fontWeight: 600,
              letterSpacing: -16,
              lineHeight: 1,
            }}
          >
            {formatDateParts(event.startsAt, event.timezone).day}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 44,
              fontWeight: 600,
              color: "#224bb2",
              letterSpacing: 3,
            }}
          >
            {formatDateParts(event.startsAt, event.timezone).month.toUpperCase()}
          </div>
          <div style={{ display: "flex", fontSize: 24, color: "#5a6173", letterSpacing: 5 }}>
            {formatDateParts(event.startsAt, event.timezone).weekday.toUpperCase()}
          </div>
        </div>
      ) : null}
      <div
        style={{
          position: "absolute",
          top: 48,
          left: 48,
          bottom: 48,
          width: 760,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: ogCard(theme),
          border: `2px solid ${theme.cardBorder}`,
          borderRadius: 44,
          padding: "40px 52px",
          color: theme.foreground,
          boxShadow: "0 30px 60px rgba(10, 10, 40, 0.18)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 52,
              height: 52,
              borderRadius: 999,
              background: theme.accent,
              color: theme.accentForeground,
              fontSize: 26,
              fontWeight: 600,
            }}
          >
            {initial}
          </div>
          <div style={{ display: "flex", fontSize: 28, color: theme.muted }}>{host}</div>
          {cancelled ? (
            <div
              style={{
                display: "flex",
                marginLeft: "auto",
                background: "#d92d4b",
                color: "#ffffff",
                borderRadius: 999,
                padding: "8px 20px",
                fontSize: 22,
                fontWeight: 600,
                letterSpacing: 2,
              }}
            >
              {t("og.cancelled").toUpperCase()}
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              display: "flex",
              fontFamily: display.name,
              fontWeight: display.weight,
              fontSize: titleSize(title, theme.displayScale),
              lineHeight: 1.02,
              letterSpacing: theme.displayTracking === "-0.045em" ? -3 : -1.5,
              textDecoration: cancelled ? "line-through" : "none",
            }}
          >
            {title}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={chip}>
              <svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none">
                <rect
                  x="3"
                  y="5"
                  width="18"
                  height="16"
                  rx="3"
                  stroke={theme.accentInk}
                  strokeWidth="2"
                />
                <path
                  d="M3 10h18M8 3v4M16 3v4"
                  stroke={theme.accentInk}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              {when}
            </div>
            {where ? (
              <div style={chip}>
                <svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z"
                    stroke={theme.accentInk}
                    strokeWidth="2"
                  />
                  <circle cx="12" cy="9.5" r="2.5" stroke={theme.accentInk} strokeWidth="2" />
                </svg>
                <span style={{ display: "flex", overflow: "hidden", whiteSpace: "nowrap" }}>
                  {where}
                </span>
              </div>
            ) : null}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: theme.accent,
              color: theme.accentForeground,
              borderRadius: 999,
              padding: "16px 34px",
              fontSize: 30,
              fontWeight: 600,
            }}
          >
            {t("og.tapToRsvp")}
            <svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 12h14M13 6l6 6-6 6"
                stroke={theme.accentForeground}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontFamily: "Bricolage Grotesque",
              fontSize: 34,
              letterSpacing: -1.5,
              color: theme.foreground,
            }}
          >
            <svg aria-hidden="true" width="38" height="38" viewBox="0 0 64 64">
              <path
                d={LOGO_PATH}
                fill="none"
                stroke={theme.accentInk}
                strokeWidth="10"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {SITE.name.toLowerCase()}
          </div>
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: "Fredoka", data: fredoka, weight: 700, style: "normal" },
        { name: "Fraunces", data: fraunces, weight: 600, style: "normal" },
        { name: "Instrument Serif", data: instrument, weight: 400, style: "normal" },
        { name: "Unbounded", data: unbounded, weight: 700, style: "normal" },
        { name: "Geist", data: geist500, weight: 500, style: "normal" },
        { name: "Geist", data: geist650, weight: 600, style: "normal" },
        { name: "Bricolage Grotesque", data: bricolage, weight: 700, style: "normal" },
      ],
    },
  );
}
