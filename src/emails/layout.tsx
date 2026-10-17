import type { ReactNode } from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "react-email";
import { getServerTranslator } from "@/i18n/config";
import { absoluteUrl } from "@/lib/share";

// Comeby Cobalt. Plain hex values: email clients don't support CSS variables.
const colors = {
  background: "#f4f6fb",
  card: "#ffffff",
  text: "#0e1324",
  muted: "#5b6275",
  accent: "#224bb2",
  accentSoft: "#eef3ff",
  border: "#e3e7f0",
};

export const emailStyles = {
  paragraph: { fontSize: "16px", lineHeight: "24px", color: colors.text, margin: "0 0 16px" },
  muted: { fontSize: "13px", lineHeight: "20px", color: colors.muted, margin: "0 0 12px" },
  detailLabel: {
    fontSize: "12px",
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    color: colors.muted,
    fontWeight: 600,
    margin: "0 0 2px",
  },
  detailValue: {
    fontSize: "15px",
    lineHeight: "22px",
    color: colors.text,
    fontWeight: 600,
    margin: "0 0 12px",
  },
  quote: {
    fontSize: "15px",
    lineHeight: "22px",
    color: colors.text,
    margin: "0 0 16px",
    padding: "12px 16px",
    background: colors.background,
    borderLeft: `3px solid ${colors.accent}`,
    borderRadius: "12px",
  },
};

type EmailLayoutProps = {
  preview: string;
  heading: string;
  children: ReactNode;
  action?: { label: string; href: string };
  footnote?: string;
};

/** Shared frame for every Comeby email: logo, heading, body, button, footer. */
export function EmailLayout({ preview, heading, children, action, footnote }: EmailLayoutProps) {
  const t = getServerTranslator();
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: colors.background,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          margin: 0,
          padding: "32px 0",
        }}
      >
        <Container style={{ maxWidth: "560px", margin: "0 auto", padding: "0 16px" }}>
          <Section style={{ margin: "0 0 20px" }}>
            <Img
              src={absoluteUrl("/icon-192.png")}
              width="36"
              height="36"
              alt=""
              style={{ display: "inline-block", verticalAlign: "middle", borderRadius: "9px" }}
            />
            <span
              style={{
                display: "inline-block",
                verticalAlign: "middle",
                marginLeft: "10px",
                fontSize: "22px",
                fontWeight: 800,
                letterSpacing: "-0.6px",
                color: colors.text,
              }}
            >
              {t("common.appName").toLowerCase()}
            </span>
          </Section>
          <Section
            style={{
              backgroundColor: colors.card,
              borderRadius: "24px",
              border: `1px solid ${colors.border}`,
              overflow: "hidden",
            }}
          >
            <Section style={{ backgroundColor: colors.accent, height: "6px", lineHeight: "6px" }}>
              &nbsp;
            </Section>
            <Section style={{ padding: "32px 28px" }}>
              <Heading
                as="h1"
                style={{
                  fontSize: "24px",
                  lineHeight: "32px",
                  fontWeight: 800,
                  letterSpacing: "-0.4px",
                  color: colors.text,
                  margin: "0 0 16px",
                }}
              >
                {heading}
              </Heading>
              {children}
              {action ? (
                <Button
                  href={action.href}
                  style={{
                    backgroundColor: colors.accent,
                    color: "#ffffff",
                    borderRadius: "14px",
                    padding: "14px 26px",
                    fontSize: "15px",
                    fontWeight: 700,
                    textDecoration: "none",
                    display: "inline-block",
                    marginTop: "8px",
                  }}
                >
                  {action.label}
                </Button>
              ) : null}
              {footnote ? (
                <Text style={{ ...emailStyles.muted, margin: "20px 0 0" }}>{footnote}</Text>
              ) : null}
            </Section>
          </Section>
          <Hr style={{ borderColor: colors.border, margin: "28px 0 14px" }} />
          <Text style={{ ...emailStyles.muted, textAlign: "center" }}>{t("emails.footer")}</Text>
        </Container>
      </Body>
    </Html>
  );
}

/** "When / Where" block used by RSVP, update and cancellation emails. */
export function EventDetails({ when, where }: { when: string; where: string | null }) {
  const t = getServerTranslator();
  return (
    <Section
      style={{
        margin: "0 0 20px",
        padding: "16px 18px 4px",
        backgroundColor: colors.accentSoft,
        borderRadius: "16px",
      }}
    >
      <Text style={emailStyles.detailLabel}>{t("emails.when")}</Text>
      <Text style={emailStyles.detailValue}>{when}</Text>
      {where ? (
        <>
          <Text style={emailStyles.detailLabel}>{t("emails.where")}</Text>
          <Text style={emailStyles.detailValue}>{where}</Text>
        </>
      ) : null}
    </Section>
  );
}
