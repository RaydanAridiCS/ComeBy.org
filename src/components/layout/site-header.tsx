import Link from "next/link";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/server/auth/session";

/** Floating glass header for public pages (landing, legal). */
export function SiteHeader() {
  const t = useTranslations("nav");
  const links = [
    { href: "/#how-it-works", label: t("howItWorks") },
    { href: "/#themes", label: t("themes") },
    { href: "/#faq", label: t("faq") },
  ];
  return (
    // Under a notch, the strip above the floating bar is solid so the page doesn't scroll
    // under the status bar (it is 0 px tall everywhere else).
    <header className="sticky top-0 z-40 bg-[linear-gradient(var(--background)_var(--safe-top),transparent_var(--safe-top))] px-3 pt-[calc(0.75rem+var(--safe-top))] sm:px-4">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/75 ps-4 pe-2 shadow-sm backdrop-blur-xl">
        <Logo compact />
        <nav aria-label={t("mainNav")} className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 font-medium text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        {/* The pages stay static: the shell carries the signed-out buttons, and only this
            corner waits for the session. */}
        <Suspense fallback={<SignedOutActions />}>
          <HeaderActions />
        </Suspense>
      </div>
    </header>
  );
}

async function HeaderActions() {
  const user = await getCurrentUser();
  if (!user) return <SignedOutActions />;
  const t = await getTranslations("nav");
  return (
    <Button asChild size="sm">
      <Link href="/dashboard">{t("myEvents")}</Link>
    </Button>
  );
}

function SignedOutActions() {
  const t = useTranslations("nav");
  return (
    <div className="flex items-center gap-1.5">
      <Button asChild variant="ghost" size="sm">
        <Link href="/login">{t("signIn")}</Link>
      </Button>
      <Button asChild size="sm">
        <Link href="/signup">{t("createInvite")}</Link>
      </Button>
    </div>
  );
}
