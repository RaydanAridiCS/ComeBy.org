import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { StatusMessage } from "@/components/layout/status-message";
import { Button } from "@/components/ui/button";

/** The plain "page not found" message, for addresses that aren't an invite or an event. */
export async function PageNotFound() {
  const t = await getTranslations("notFound");
  return (
    <StatusMessage title={t("title")} body={t("body")}>
      <Button asChild size="lg">
        <Link href="/">{t("home")}</Link>
      </Button>
      <Button asChild size="lg" variant="outline">
        <Link href="/signup">{t("create")}</Link>
      </Button>
    </StatusMessage>
  );
}
