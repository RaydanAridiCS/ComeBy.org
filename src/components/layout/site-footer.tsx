import Link from "next/link";
import { useTranslations } from "next-intl";
import { Logo } from "@/components/brand/logo";
import { SITE } from "@/config/site";

export function SiteFooter() {
  const t = useTranslations();
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <Logo className="text-foreground" />
          <p>{t("common.tagline")}</p>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/privacy" className="hover:text-foreground">
            {t("nav.privacy")}
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            {t("nav.terms")}
          </Link>
          <a href={SITE.repositoryUrl} className="hover:text-foreground" rel="noopener">
            {t("nav.github")}
          </a>
          <a href={SITE.supportUrl} className="hover:text-foreground" rel="noopener">
            {t("nav.support")}
          </a>
        </nav>
      </div>
    </footer>
  );
}
