import { BellRing, Check, Lock, MessageCircle, Send, Sparkles, Users, UserX } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SITE } from "@/config/site";
import { THEME_LIST, themeStyle } from "@/themes";
import { ThemeDecorations } from "@/themes/decorations";

function InvitePreview() {
  const t = useTranslations();
  return (
    <div
      className="invite-page relative mx-auto w-full max-w-xs overflow-hidden rounded-[2rem] border-8 border-foreground/90 p-4 shadow-2xl"
      style={themeStyle("confetti")}
      aria-hidden="true"
    >
      <ThemeDecorations theme="confetti" />
      <div className="invite-card relative rounded-2xl p-5">
        <p className="text-invite-muted text-xs">{t("eventPage.hostedBy", { name: "Lina" })}</p>
        <p className="invite-heading mt-1 font-bold text-2xl leading-tight">Lina's 20th 🎉</p>
        <p className="mt-2 text-invite-muted text-sm">Sat, Nov 7 · 8:00 PM</p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center font-semibold text-xs">
          <span className="rounded-full bg-invite-accent py-2 text-invite-accent-fg">
            {t("rsvp.going")}
          </span>
          <span className="rounded-full bg-invite-accent-soft py-2">{t("rsvp.maybe")}</span>
          <span className="rounded-full bg-invite-accent-soft py-2">{t("rsvp.notGoing")}</span>
        </div>
        <p className="mt-4 flex items-center gap-1 text-invite-muted text-xs">
          <Users className="size-3.5" /> {t("eventPage.goingCount", { count: 18 })}
        </p>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const t = useTranslations("landing");
  const tThemes = useTranslations("themes");

  const steps = [
    { icon: Sparkles, title: t("step1Title"), body: t("step1Body") },
    { icon: Send, title: t("step2Title"), body: t("step2Body") },
    { icon: MessageCircle, title: t("step3Title"), body: t("step3Body") },
  ];
  const features = [
    { icon: UserX, title: t("featureGuestsTitle"), body: t("featureGuestsBody") },
    { icon: Check, title: t("featureTrackingTitle"), body: t("featureTrackingBody") },
    { icon: BellRing, title: t("featureUpdatesTitle"), body: t("featureUpdatesBody") },
    { icon: Lock, title: t("featurePrivacyTitle"), body: t("featurePrivacyBody") },
  ];

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto grid max-w-5xl items-center gap-12 px-4 py-16 md:grid-cols-[1.2fr_1fr] md:py-24">
          <div className="flex flex-col items-start gap-6">
            <Badge variant="secondary" className="rounded-full">
              {t("heroBadge")}
            </Badge>
            <h1 className="text-balance font-extrabold text-4xl tracking-tight sm:text-5xl">
              {t("heroTitle")}
            </h1>
            <p className="max-w-prose text-lg text-muted-foreground">{t("heroSubtitle")}</p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full">
                <Link href="/signup">{t("heroCta")}</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full">
                <a href="#how-it-works">{t("heroSecondary")}</a>
              </Button>
            </div>
          </div>
          <InvitePreview />
        </section>

        <section id="how-it-works" className="border-y bg-muted/30">
          <div className="mx-auto max-w-5xl px-4 py-16">
            <h2 className="text-balance text-center font-bold text-3xl">{t("stepsTitle")}</h2>
            <ol className="mt-10 grid gap-6 md:grid-cols-3">
              {steps.map((step, index) => (
                <li key={step.title} className="rounded-2xl border bg-card p-6">
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">
                      {index + 1}
                    </span>
                    <step.icon className="size-5 text-brand" aria-hidden="true" />
                  </div>
                  <h3 className="mt-4 font-semibold text-lg">{step.title}</h3>
                  <p className="mt-1 text-muted-foreground">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-16">
          <h2 className="text-balance text-center font-bold text-3xl">{t("featuresTitle")}</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {features.map((feature) => (
              <div key={feature.title} className="flex gap-4 rounded-2xl border p-6">
                <feature.icon className="mt-1 size-6 shrink-0 text-brand" aria-hidden="true" />
                <div>
                  <h3 className="font-semibold text-lg">{feature.title}</h3>
                  <p className="mt-1 text-muted-foreground">{feature.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y bg-muted/30">
          <div className="mx-auto max-w-5xl px-4 py-16">
            <h2 className="text-balance text-center font-bold text-3xl">{t("themesTitle")}</h2>
            <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
              {THEME_LIST.map((theme) => (
                <div
                  key={theme.id}
                  className="invite-page relative flex aspect-[3/4] flex-col justify-end overflow-hidden rounded-2xl p-3"
                  style={themeStyle(theme.id)}
                >
                  <ThemeDecorations theme={theme.id} />
                  <div className="invite-card relative rounded-xl p-3">
                    <p className="invite-heading font-bold">
                      {theme.emoji} {tThemes(`${theme.id}.name`)}
                    </p>
                    <p className="text-invite-muted text-xs">{tThemes(`${theme.id}.tagline`)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h2 className="text-balance font-bold text-3xl">{t("openSourceTitle")}</h2>
          <p className="mt-4 text-lg text-muted-foreground">{t("openSourceBody")}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="rounded-full">
              <Link href="/signup">{t("finalCta")}</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full">
              <a href={SITE.repositoryUrl} rel="noopener">
                {t("openSourceCta")}
              </a>
            </Button>
          </div>
          <p className="mt-4 text-muted-foreground text-sm">{t("finalCtaBody")}</p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
