import Link from "next/link";
import { useTranslations } from "next-intl";
import { Logo } from "@/components/brand/logo";
import { SITE } from "@/config/site";

const footerLinkClass =
  "inline-flex min-h-11 min-w-11 items-center rounded text-muted-foreground text-sm transition-colors hover:text-foreground sm:min-h-0";

export function SiteFooter() {
  const t = useTranslations();
  const columns = [
    {
      title: t("landing.footerProduct"),
      links: [
        { href: "/#how-it-works", label: t("nav.howItWorks") },
        { href: "/#themes", label: t("nav.themes") },
        { href: "/#faq", label: t("nav.faq") },
        { href: "/signup", label: t("nav.createInvite") },
      ],
    },
    {
      title: t("landing.footerProject"),
      links: [{ href: SITE.repositoryUrl, label: t("nav.github"), external: true }],
    },
    {
      title: t("landing.footerLegal"),
      links: [
        { href: "/privacy", label: t("nav.privacy") },
        { href: "/terms", label: t("nav.terms") },
      ],
    },
  ];

  return (
    <footer className="border-t bg-card">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="flex flex-col gap-3">
          <Logo className="self-start text-foreground" />
          <p className="max-w-xs text-muted-foreground text-sm">{t("common.tagline")}</p>
          <p className="text-muted-foreground text-xs">{t("landing.footerLicense")}</p>
        </div>
        {columns.map((column) => (
          <nav key={column.title} aria-label={column.title} className="flex flex-col gap-3">
            <p className="font-semibold text-sm">{column.title}</p>
            {/* On phones each link is a 44 px row; from sm up they sit closer, as text. */}
            <ul className="flex flex-col sm:gap-2">
              {column.links.map((link) => (
                <li key={link.href}>
                  {"external" in link ? (
                    <a href={link.href} rel="noopener" className={footerLinkClass}>
                      {link.label}
                    </a>
                  ) : (
                    <Link href={link.href} className={footerLinkClass}>
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t">
        <p className="mx-auto max-w-6xl px-4 pt-5 pb-[calc(1.25rem+var(--safe-bottom))] text-muted-foreground text-xs sm:px-6">
          {t("landing.footerMade")}
        </p>
      </div>
    </footer>
  );
}
