import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LegalPage } from "@/components/layout/legal-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal");
  return { title: t("termsTitle") };
}

export default function TermsPage() {
  return (
    <LegalPage titleKey="termsTitle" sectionsKey="termsSections" lastUpdated="October 17, 2026" />
  );
}
