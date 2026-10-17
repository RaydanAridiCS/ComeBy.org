import { ArrowLeft, Check } from "lucide-react";
import Link from "next/link";
import { NextIntlClientProvider, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import type { ThemeId } from "@/features/events/schema";
import { AUTH_NAMESPACES, clientMessages } from "@/i18n/client-messages";
import { InviteMini } from "@/themes/invite-mini";
import { bricolage } from "../brand-font";

const FANNED: { theme: ThemeId; className: string }[] = [
  {
    theme: "sunset",
    className: "-rotate-[12deg] -translate-x-[72%] translate-y-6 animate-float-delayed",
  },
  {
    theme: "midnight",
    className: "rotate-[12deg] translate-x-[72%] translate-y-6 animate-float-delayed",
  },
  { theme: "confetti", className: "z-10 animate-float" },
];

/** Split layout: brand panel on large screens, a clean single column on phones. */
export default async function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <NextIntlClientProvider messages={await clientMessages(AUTH_NAMESPACES)}>
      <AuthShell>{children}</AuthShell>
    </NextIntlClientProvider>
  );
}

function AuthShell({ children }: { children: ReactNode }) {
  const t = useTranslations();
  const trust = [
    t("landing.heroTrustFree"),
    t("landing.heroTrustGuests"),
    t("landing.heroTrustOpen"),
  ];
  return (
    <div className={`${bricolage.variable} grid min-h-dvh flex-1 lg:grid-cols-[1.05fr_1fr]`}>
      <aside className="relative isolate hidden flex-col justify-between overflow-hidden bg-brand-gradient p-10 text-white lg:flex">
        <div className="surface-noise absolute inset-0 -z-10 opacity-25 mix-blend-overlay" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_1px_1px,rgb(255_255_255/0.12)_1px,transparent_1.3px)] bg-size-[22px_22px] [mask-image:radial-gradient(60%_50%_at_50%_45%,black,transparent)]" />
        <Logo tone="inverse" />
        <div
          className="relative mx-auto flex h-80 w-full max-w-md items-center justify-center"
          aria-hidden="true"
        >
          {FANNED.map((item) => (
            <div
              key={item.theme}
              className={`absolute w-44 overflow-hidden rounded-3xl shadow-xl ring-1 ring-white/20 ${item.className}`}
            >
              <InviteMini theme={item.theme} className="aspect-[3/4] w-full" />
            </div>
          ))}
        </div>
        <div className="flex max-w-md flex-col gap-4">
          <h2 className="heading text-headline">{t("auth.panelTitle")}</h2>
          <p className="text-white/80">{t("auth.panelBody")}</p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/85">
            {trust.map((item) => (
              <li key={item} className="flex items-center gap-1.5">
                <Check className="size-4" strokeWidth={2.5} aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col bg-[radial-gradient(70%_40%_at_50%_0%,var(--brand-50),transparent_70%)] lg:bg-background">
        <header className="flex items-center justify-between gap-3 px-5 pt-5 sm:px-8 sm:pt-7">
          <Logo className="lg:invisible" />
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg py-1 font-medium text-muted-foreground text-sm transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
            {t("auth.backHome")}
          </Link>
        </header>
        <main className="flex flex-1 items-start justify-center px-5 pt-10 pb-16 sm:items-center sm:pt-6">
          <div className="w-full max-w-sm animate-rise">{children}</div>
        </main>
        <footer className="flex justify-center gap-5 px-5 pb-6 text-muted-foreground text-xs">
          <Link href="/privacy" className="hover:text-foreground">
            {t("nav.privacy")}
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            {t("nav.terms")}
          </Link>
        </footer>
      </div>
    </div>
  );
}
