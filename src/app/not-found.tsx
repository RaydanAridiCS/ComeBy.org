import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageNotFound } from "@/components/layout/page-not-found";
import { StatusPage } from "@/components/layout/status-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("notFound");
  return { title: t("title") };
}

/**
 * Any address the app doesn't know, and every `notFound()` without a closer not-found
 * file. `/admin` relies on this for everyone who isn't an operator, so it must stay an
 * ordinary missing page.
 */
export default function NotFound() {
  return (
    <StatusPage>
      <PageNotFound />
    </StatusPage>
  );
}
