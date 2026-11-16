import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { StatusMessage } from "@/components/layout/status-message";
import { StatusPage } from "@/components/layout/status-page";
import { Button } from "@/components/ui/button";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("notFound");
  return { title: t("linkTitle"), robots: { index: false, follow: false } };
}

/**
 * Where a private "change my response" link lands when it doesn't check out
 * (`src/app/r/[credential]/route.ts`). One message for every reason, on purpose.
 */
export default async function InvalidLinkPage() {
  const t = await getTranslations("notFound");
  return (
    <StatusPage>
      <StatusMessage mark="!" title={t("linkTitle")} body={t("linkBody")}>
        <Button asChild size="lg" variant="outline">
          <Link href="/">{t("home")}</Link>
        </Button>
      </StatusMessage>
    </StatusPage>
  );
}
