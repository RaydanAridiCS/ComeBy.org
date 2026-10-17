import type { ReactNode } from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "react-email";
import { getServerTranslator } from "@/i18n/config";

const colors = {
  background: "#faf7f2",
  card: "#ffffff",
  text: "#1c1917",
  muted: "#78716c",
  accent: "#e85d3a",
  border: "#ece7df",
};

export const emailStyles = {
  paragraph: { fontSize: "16px", lineHeight: "24px", color: colors.text, margin: "0 0 16px" },
  muted: { fontSize: "13px", lineHeight: "20px", color: colors.muted, margin: "0 0 12px" },
  detailLabel: {
    fontSize: "12px",
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    color: colors.muted,
    margin: "0 0 2px",
  },
  detailValue: { fontSize: "15px", lineHeight: "22px", color: colors.text, margin: "0 0 12px" },
  quote: {
    fontSize: "15px",
    lineHeight: "22px",
    color: colors.text,
    margin: "0 0 16px",
    padding: "12px 16px",
    background: colors.background,
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
          padding: "24px 0",
        }}
      >
        <Container style={{ maxWidth: "520px", margin: "0 auto", padding: "0 16px" }}>
          <Text
            style={{ fontSize: "20px", fontWeight: 800, color: colors.accent, margin: "0 0 16px" }}
          >
            {t("common.appName")}
          </Text>
          <Section
            style={{
              backgroundColor: colors.card,
              borderRadius: "20px",
              border: `1px solid ${colors.border}`,
              padding: "28px 24px",
            }}
          >
            <Heading
              as="h1"
              style={{
                fontSize: "22px",
                lineHeight: "30px",
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
                  borderRadius: "999px",
                  padding: "12px 22px",
                  fontSize: "15px",
                  fontWeight: 600,
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
          <Hr style={{ borderColor: colors.border, margin: "24px 0 12px" }} />
          <Text style={emailStyles.muted}>{t("emails.footer")}</Text>
        </Container>
      </Body>
    </Html>
  );
}

/** "When / Where" block used by RSVP, update and cancellation emails. */
export function EventDetails({ when, where }: { when: string; where: string | null }) {
  const t = getServerTranslator();
  return (
    <Section style={{ margin: "0 0 8px" }}>
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
