import {
  ArrowRight,
  BellRing,
  Cake,
  Check,
  Dices,
  Lock,
  MessageCircle,
  Mountain,
  Plus,
  QrCode,
  ShieldCheck,
  Sparkles,
  Users,
  UserX,
} from "lucide-react";
import Link from "next/link";
import { NextIntlClientProvider, useTranslations } from "next-intl";
import type { CSSProperties, ReactNode } from "react";
import { LogoTile } from "@/components/brand/logo";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LIMITS } from "@/config/limits";
import { SITE } from "@/config/site";
import { HeroPhone } from "@/features/marketing/components/hero-phone";
import { ThemeShowcase } from "@/features/marketing/components/theme-showcase";
import { clientMessages, LANDING_NAMESPACES } from "@/i18n/client-messages";
import { cn } from "@/lib/utils";
import { THEME_LIST, THEME_TOKENS } from "@/themes";
import { bricolage } from "./brand-font";

const stagger = (index: number) => ({ "--i": index }) as CSSProperties;

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.7 5.4-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  );
}

function SectionHeader({
  eyebrow,
  title,
  body,
  align = "center",
  tone = "default",
}: {
  eyebrow: string;
  title: string;
  body?: string;
  align?: "center" | "start";
  tone?: "default" | "inverse";
}) {
  return (
    <div
      className={cn(
        "flex max-w-2xl flex-col gap-3",
        align === "center" ? "mx-auto items-center text-center" : "items-start",
      )}
    >
      <p className={cn("eyebrow", tone === "inverse" ? "text-brand-300" : "text-brand-600")}>
        {eyebrow}
      </p>
      <h2 className="heading text-headline sm:text-title">{title}</h2>
      {body ? (
        <p
          className={cn("text-lg", tone === "inverse" ? "text-white/75" : "text-muted-foreground")}
        >
          {body}
        </p>
      ) : null}
    </div>
  );
}

function Vignette({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative flex h-44 flex-col justify-center gap-2.5 overflow-hidden rounded-2xl bg-[linear-gradient(160deg,var(--brand-50),var(--muted))] p-5 ring-1 ring-border/60 ring-inset"
      aria-hidden="true"
    >
      {children}
    </div>
  );
}

function Hero() {
  const t = useTranslations("landing");
  const trust = [t("heroTrustFree"), t("heroTrustGuests"), t("heroTrustOpen")];
  return (
    <section className="relative isolate overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(70%_60%_at_80%_10%,oklch(0.88_0.065_264/0.7),transparent_70%),radial-gradient(50%_50%_at_0%_30%,oklch(0.94_0.04_300/0.6),transparent_70%)]" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_1px_1px,var(--border)_1px,transparent_1.3px)] bg-size-[22px_22px] [mask-image:radial-gradient(70%_60%_at_50%_30%,black,transparent)]" />
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 pt-12 pb-20 sm:px-6 md:pt-20 lg:grid-cols-[1.08fr_1fr] lg:pb-28">
        <div className="flex flex-col items-start gap-7">
          <a
            href={SITE.repositoryUrl}
            rel="noopener"
            className="group inline-flex animate-rise items-center gap-2 rounded-full border bg-card/80 py-1.5 ps-1.5 pe-3.5 font-medium text-sm shadow-xs backdrop-blur transition-colors hover:border-brand-200"
          >
            <span className="flex size-6 items-center justify-center rounded-full bg-brand-50 text-brand-700">
              <GitHubIcon className="size-3.5" />
            </span>
            {t("heroBadge")}
            <ArrowRight
              className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 rtl:rotate-180"
              aria-hidden="true"
            />
          </a>
          <h1 className="heading animate-rise text-display" style={stagger(1)}>
            {t.rich("heroTitle", {
              em: (chunks) => (
                <em className="font-normal font-serif text-[1.08em] text-brand-600 tracking-[-0.02em]">
                  {chunks}
                </em>
              ),
            })}
          </h1>
          <p
            className="max-w-[34rem] animate-rise text-lg text-muted-foreground leading-relaxed sm:text-xl"
            style={stagger(2)}
          >
            {t("heroSubtitle")}
          </p>
          <div className="flex w-full animate-rise flex-wrap gap-3 sm:w-auto" style={stagger(3)}>
            <Button asChild size="lg" className="flex-1 sm:flex-none">
              <Link href="/signup">
                {t("heroCta")}
                <ArrowRight className="rtl:rotate-180" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="flex-1 sm:flex-none">
              <a href="#how-it-works">{t("heroSecondary")}</a>
            </Button>
          </div>
          <ul
            className="flex animate-rise flex-wrap gap-x-5 gap-y-2 text-muted-foreground text-sm"
            style={stagger(4)}
          >
            {trust.map((item) => (
              <li key={item} className="flex items-center gap-1.5">
                <Check className="size-4 text-brand-600" strokeWidth={2.5} aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="animate-pop" style={stagger(2)}>
          <HeroPhone />
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const t = useTranslations();
  const swatches = THEME_LIST.map((theme) => theme.accent);
  const confetti = THEME_TOKENS.confetti;
  const rows = [
    { name: "Omar", status: t("rsvp.going"), variant: "success" as const },
    { name: "Maya", status: t("rsvp.going"), variant: "success" as const },
    { name: "Jad", status: t("rsvp.maybe"), variant: "warning" as const },
  ];
  const steps = [
    {
      title: t("landing.step1Title"),
      body: t("landing.step1Body"),
      vignette: (
        <>
          <span className="font-medium text-muted-foreground text-xs">{t("eventForm.title")}</span>
          <span className="flex h-11 items-center rounded-xl border bg-card px-3.5 font-medium text-sm shadow-xs">
            {t("landing.step1Sample")}
            <span className="ms-0.5 h-4 w-px animate-pulse bg-brand-600" />
          </span>
          <span className="mt-1 flex gap-2">
            {swatches.map((color, index) => (
              <span
                key={color}
                className={cn(
                  "size-7 rounded-full ring-2 ring-card",
                  index === 0 && "outline-2 outline-brand-600 outline-offset-1",
                )}
                style={{ background: color }}
              />
            ))}
          </span>
        </>
      ),
    },
    {
      title: t("landing.step2Title"),
      body: t("landing.step2Body"),
      vignette: (
        <div className="ms-auto flex w-[88%] flex-col gap-1.5 rounded-2xl rounded-se-sm bg-[#e7f8d9] p-2 shadow-sm">
          <div className="flex overflow-hidden rounded-xl bg-white">
            <span className="w-16 shrink-0" style={{ background: confetti.background }} />
            <span className="flex min-w-0 flex-col gap-0.5 px-3 py-2">
              <span className="truncate font-semibold text-[#1f2a1d] text-xs">
                {t("landing.step1Sample")}
              </span>
              <span className="text-[#5b6b57] text-[0.6875rem]">{SITE.domain}</span>
            </span>
          </div>
          <span className="px-1 text-[#1f2a1d] text-xs">{t("landing.step2Message")}</span>
        </div>
      ),
    },
    {
      title: t("landing.step3Title"),
      body: t("landing.step3Body"),
      vignette: rows.map((row) => (
        <span
          key={row.name}
          className="flex items-center gap-2.5 rounded-xl bg-card px-3 py-2 shadow-xs"
        >
          <span className="flex size-7 items-center justify-center rounded-full bg-brand-50 font-bold text-brand-700 text-xs">
            {row.name.charAt(0)}
          </span>
          <span className="flex-1 font-medium text-sm">{row.name}</span>
          <Badge variant={row.variant}>{row.status}</Badge>
        </span>
      )),
    },
  ];
  return (
    <section id="how-it-works" className="scroll-mt-24 border-y bg-card">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-20 sm:px-6 md:py-28">
        <SectionHeader eyebrow={t("landing.stepsEyebrow")} title={t("landing.stepsTitle")} />
        <ol className="grid gap-5 md:grid-cols-3">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="flex flex-col gap-5 rounded-3xl border bg-background p-4 pb-6 shadow-xs"
            >
              <Vignette>{step.vignette}</Vignette>
              <div className="flex flex-col gap-1.5 px-2">
                <span className="flex items-center gap-2.5">
                  <span className="flex size-7 items-center justify-center rounded-full bg-brand-600 font-bold text-sm text-white">
                    {index + 1}
                  </span>
                  <h3 className="heading text-xl">{step.title}</h3>
                </span>
                <p className="text-muted-foreground">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Themes() {
  const t = useTranslations("landing");
  return (
    <section id="themes" className="scroll-mt-24">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-20 sm:px-6 md:py-28">
        <SectionHeader
          eyebrow={t("themesEyebrow")}
          title={t("themesTitle")}
          body={t("themesBody")}
        />
        <ThemeShowcase />
      </div>
    </section>
  );
}

function Features() {
  const t = useTranslations();
  const small = [
    {
      icon: BellRing,
      title: t("landing.featureUpdatesTitle"),
      body: t("landing.featureUpdatesBody"),
    },
    { icon: Lock, title: t("landing.featurePrivacyTitle"), body: t("landing.featurePrivacyBody") },
    {
      icon: MessageCircle,
      title: t("landing.featureShareTitle"),
      body: t("landing.featureShareBody"),
    },
    { icon: QrCode, title: t("landing.featureQrTitle"), body: t("landing.featureQrBody") },
  ];
  const counts = [
    { label: t("rsvp.going"), value: 12, className: "bg-success-soft text-success-ink" },
    { label: t("rsvp.maybe"), value: 3, className: "bg-warning-soft text-warning-ink" },
    { label: t("rsvp.notGoing"), value: 2, className: "bg-muted text-muted-foreground" },
  ];
  return (
    <section className="border-t bg-card">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-20 sm:px-6 md:py-28">
        <SectionHeader eyebrow={t("landing.featuresEyebrow")} title={t("landing.featuresTitle")} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col justify-between gap-8 overflow-hidden rounded-3xl border bg-background p-6 shadow-xs sm:col-span-2 lg:flex-row lg:items-center">
            <div className="flex max-w-sm flex-col gap-2">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                <UserX className="size-5" aria-hidden="true" />
              </span>
              <h3 className="heading mt-2 text-2xl">{t("landing.featureGuestsTitle")}</h3>
              <p className="text-muted-foreground">{t("landing.featureGuestsBody")}</p>
            </div>
            <div className="grid w-full max-w-xs grid-cols-3 gap-2 self-center" aria-hidden="true">
              {[t("rsvp.going"), t("rsvp.maybe"), t("rsvp.notGoing")].map((label, index) => (
                <span
                  key={label}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-2xl py-4 font-semibold text-sm",
                    index === 0
                      ? "bg-brand-600 text-white shadow-brand"
                      : "bg-brand-50 text-brand-900",
                  )}
                >
                  <Check className={cn("size-5", index !== 0 && "opacity-0")} />
                  {label}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-5 rounded-3xl border bg-background p-6 shadow-xs sm:col-span-2">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
              <Users className="size-5" aria-hidden="true" />
            </span>
            <div className="flex flex-col gap-2">
              <h3 className="heading text-xl">{t("landing.featureTrackingTitle")}</h3>
              <p className="text-muted-foreground">{t("landing.featureTrackingBody")}</p>
            </div>
            <div className="mt-auto flex flex-wrap gap-2" aria-hidden="true">
              {counts.map((count) => (
                <span
                  key={count.label}
                  className={cn("rounded-full px-3 py-1 font-semibold text-sm", count.className)}
                >
                  {count.value} {count.label}
                </span>
              ))}
            </div>
          </div>
          {small.map((feature) => (
            <div
              key={feature.title}
              className="flex flex-col gap-4 rounded-3xl border bg-background p-6 shadow-xs"
            >
              <span className="flex size-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                <feature.icon className="size-5" aria-hidden="true" />
              </span>
              <div className="flex flex-col gap-2">
                <h3 className="heading text-xl">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function NoCatch() {
  const t = useTranslations("landing");
  const promises = [
    { icon: Sparkles, title: t("promiseAdsTitle"), body: t("promiseAdsBody") },
    {
      icon: ShieldCheck,
      title: t("promiseDataTitle"),
      body: t("promiseDataBody", { days: LIMITS.guestDataRetentionDays }),
    },
    { icon: Check, title: t("promisePaywallTitle"), body: t("promisePaywallBody") },
  ];
  return (
    <section className="relative isolate overflow-hidden bg-brand-950 text-white">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_80%_at_85%_0%,oklch(0.45_0.17_264/0.7),transparent_70%),radial-gradient(50%_60%_at_0%_100%,oklch(0.39_0.156_264/0.6),transparent_70%)]" />
      <div className="surface-noise absolute inset-0 -z-10 opacity-20 mix-blend-overlay" />
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-20 sm:px-6 md:py-28">
        <SectionHeader
          eyebrow={t("openSourceEyebrow")}
          title={t("openSourceTitle")}
          body={t("openSourceBody")}
          tone="inverse"
        />
        <ul className="grid gap-4 md:grid-cols-3">
          {promises.map((promise) => (
            <li
              key={promise.title}
              className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur"
            >
              <span className="flex size-11 items-center justify-center rounded-2xl bg-white/10 text-brand-200">
                <promise.icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="heading text-xl">{promise.title}</h3>
              <p className="text-white/75">{promise.body}</p>
            </li>
          ))}
        </ul>
        <div className="flex justify-center">
          <Button asChild size="lg" className="bg-white text-brand-950 shadow-lg hover:bg-brand-50">
            <a href={SITE.repositoryUrl} rel="noopener">
              <GitHubIcon className="size-5" />
              {t("openSourceCta")}
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}

function UseCases() {
  const t = useTranslations("landing");
  const cases = [
    {
      icon: Cake,
      theme: THEME_TOKENS.confetti,
      title: t("useBirthdayTitle"),
      body: t("useBirthdayBody"),
    },
    { icon: Mountain, theme: THEME_TOKENS.wild, title: t("useHikeTitle"), body: t("useHikeBody") },
    { icon: Dices, theme: THEME_TOKENS.midnight, title: t("useGameTitle"), body: t("useGameBody") },
    { icon: Users, theme: THEME_TOKENS.clean, title: t("useClubTitle"), body: t("useClubBody") },
  ];
  return (
    <section>
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-20 sm:px-6 md:py-28">
        <SectionHeader eyebrow={t("useCasesEyebrow")} title={t("useCasesTitle")} />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cases.map((item) => (
            <li
              key={item.title}
              className="flex flex-col gap-4 overflow-hidden rounded-3xl border bg-card p-6 shadow-xs transition-shadow hover:shadow-md"
            >
              <span
                className="flex size-12 items-center justify-center rounded-2xl"
                style={{
                  background: item.theme.dark ? item.theme.backgroundSolid : item.theme.accentSoft,
                  color: item.theme.accentInk,
                }}
              >
                <item.icon className="size-5" aria-hidden="true" />
              </span>
              <div className="flex flex-col gap-1.5">
                <h3 className="heading text-lg">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Faq() {
  const t = useTranslations("landing");
  const items = [
    { q: t("faq1Q"), a: t("faq1A") },
    { q: t("faq2Q"), a: t("faq2A") },
    { q: t("faq3Q"), a: t("faq3A") },
    { q: t("faq4Q"), a: t("faq4A") },
    { q: t("faq5Q"), a: t("faq5A") },
    { q: t("faq6Q"), a: t("faq6A") },
  ];
  return (
    <section id="faq" className="scroll-mt-24 border-t bg-card">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 md:grid-cols-[1fr_1.6fr] md:py-28">
        <SectionHeader eyebrow={t("faqEyebrow")} title={t("faqTitle")} align="start" />
        <div className="flex flex-col divide-y rounded-3xl border bg-background px-2 shadow-xs">
          {items.map((item) => (
            <details key={item.q} className="group px-4 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-4 font-semibold outline-none focus-visible:text-brand-700">
                {item.q}
                <Plus
                  className="size-5 shrink-0 text-muted-foreground transition-transform duration-300 group-open:rotate-45"
                  aria-hidden="true"
                />
              </summary>
              <p className="pb-5 text-muted-foreground leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  const t = useTranslations("landing");
  return (
    <section className="px-4 py-20 sm:px-6 md:py-28">
      <div className="relative isolate mx-auto flex max-w-5xl flex-col items-center gap-6 overflow-hidden rounded-[2rem] bg-brand-gradient px-6 py-16 text-center text-white shadow-xl sm:py-20">
        <div className="surface-noise absolute inset-0 -z-10 opacity-25 mix-blend-overlay" />
        <LogoTile className="size-14 bg-none bg-white/15 shadow-none ring-1 ring-white/25" />
        <h2 className="heading max-w-2xl text-title">{t("finalCtaTitle")}</h2>
        <p className="max-w-md text-lg text-white/80">{t("finalCtaBody")}</p>
        <Button asChild size="lg" className="bg-white text-brand-800 shadow-lg hover:bg-brand-50">
          <Link href="/signup">
            {t("finalCta")}
            <ArrowRight className="rtl:rotate-180" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </section>
  );
}

export default async function LandingPage() {
  return (
    <NextIntlClientProvider messages={await clientMessages(LANDING_NAMESPACES)}>
      <div className={cn(bricolage.variable, "contents")}>
        <SiteHeader />
        <main className="-mt-[4.25rem] flex-1 overflow-x-clip pt-[4.25rem]">
          <Hero />
          <HowItWorks />
          <Themes />
          <Features />
          <NoCatch />
          <UseCases />
          <Faq />
          <FinalCta />
        </main>
        <SiteFooter />
      </div>
    </NextIntlClientProvider>
  );
}
