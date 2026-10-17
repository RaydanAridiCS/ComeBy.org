import { getTranslations } from "next-intl/server";
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
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
        <h1 className="font-bold text-3xl tracking-tight">{t(titleKey)}</h1>
        <p className="mt-2 text-muted-foreground text-sm">
          {t("lastUpdated", { date: lastUpdated })}
        </p>
        <div className="mt-8 flex flex-col gap-8">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="font-semibold text-xl">{section.title}</h2>
              <p className="mt-2 text-muted-foreground leading-relaxed">{section.body}</p>
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
