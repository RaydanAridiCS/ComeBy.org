import { getTranslations } from "next-intl/server";
import { bricolage } from "@/app/brand-font";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

type Section = { title: string; body: string };

/** Shared layout for the privacy policy and terms (content lives in the message catalogue). */
export async function LegalPage({
  titleKey,
  sectionsKey,
  lastUpdated,
}: {
  titleKey: "privacyTitle" | "termsTitle";
  sectionsKey: "privacySections" | "termsSections";
  lastUpdated: string;
}) {
  const t = await getTranslations("legal");
  const sections = t.raw(sectionsKey) as Section[];
  const anchor = (index: number) => `section-${index + 1}`;
  return (
    <div className={`${bricolage.variable} contents`}>
      <SiteHeader />
      <main className="mx-auto grid w-full max-w-5xl flex-1 gap-10 px-4 pt-12 pb-20 sm:px-6 md:pt-16 lg:grid-cols-[220px_minmax(0,1fr)]">
        <header className="flex flex-col gap-3 lg:col-span-2">
          <h1 className="heading animate-rise text-title">{t(titleKey)}</h1>
          <p className="text-muted-foreground text-sm">{t("lastUpdated", { date: lastUpdated })}</p>
        </header>
        <nav aria-label={t(titleKey)} className="hidden lg:block">
          <ol className="sticky top-24 flex flex-col gap-1 border-s">
            {sections.map((section, index) => (
              <li key={section.title}>
                <a
                  href={`#${anchor(index)}`}
                  className="-ms-px block border-transparent border-s-2 py-1.5 ps-4 text-muted-foreground text-sm transition-colors hover:border-brand-500 hover:text-foreground"
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <div className="flex max-w-2xl flex-col gap-10">
          {sections.map((section, index) => (
            <section key={section.title} id={anchor(index)} className="scroll-mt-28">
              <h2 className="heading flex items-baseline gap-3 text-xl">
                <span className="font-sans font-semibold text-brand-600 text-sm tabular-nums">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {section.title}
              </h2>
              <p className="mt-3 text-[1.0625rem] text-muted-foreground leading-relaxed">
                {section.body}
              </p>
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
