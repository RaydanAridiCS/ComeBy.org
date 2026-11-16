import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { StatusMessage } from "@/components/layout/status-message";
import { Button } from "@/components/ui/button";

/** An event id that doesn't exist or isn't this host's. Shown inside the dashboard layout. */
export default async function EventNotFound() {
  const t = await getTranslations("notFound");
  return (
    <div className="flex flex-col items-center gap-6 py-12 text-center sm:py-20">
      <StatusMessage title={t("eventTitle")} body={t("eventBody")}>
        <Button asChild size="lg">
          <Link href="/dashboard">
            <ArrowLeft className="rtl:rotate-180" aria-hidden="true" />
            {t("backToEvents")}
          </Link>
        </Button>
      </StatusMessage>
    </div>
  );
}
