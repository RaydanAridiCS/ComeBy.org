import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LegalPage } from "@/components/layout/legal-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal");
  return { title: t("privacyTitle") };
}

export default function PrivacyPage() {
  return (
    <LegalPage
      titleKey="privacyTitle"
      sectionsKey="privacySections"
      lastUpdated="October 26, 2026"
    />
  );
}
