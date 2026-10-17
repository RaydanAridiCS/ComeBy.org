import Link from "next/link";
import { useTranslations } from "next-intl";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

/** Floating glass header for public pages (landing, legal, auth). */
export function SiteHeader() {
  const t = useTranslations("nav");
  const links = [
    { href: "/#how-it-works", label: t("howItWorks") },
    { href: "/#themes", label: t("themes") },
    { href: "/#faq", label: t("faq") },
  ];
  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-4">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/75 ps-4 pe-2 shadow-sm backdrop-blur-xl">
        <Logo />
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
        <div className="flex items-center gap-1.5">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">{t("signIn")}</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">{t("createInvite")}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
