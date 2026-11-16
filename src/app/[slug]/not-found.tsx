import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { ByAddress } from "@/components/layout/by-address";
import { PageNotFound } from "@/components/layout/page-not-found";
import { StatusMessage } from "@/components/layout/status-message";
import { StatusPage } from "@/components/layout/status-page";
import { Button } from "@/components/ui/button";

/**
 * No invite at this address. Guests land here from a mistyped or deleted link, so the
 * message tells them to check it with whoever sent it, and there is no sign-up push.
 */
export default async function InviteNotFound() {
  const t = await getTranslations();
  const invite = (
    <StatusMessage title={t("eventPage.notFoundTitle")} body={t("eventPage.notFoundBody")}>
      <Button asChild size="lg" variant="outline">
        <Link href="/">{t("notFound.home")}</Link>
      </Button>
    </StatusMessage>
  );
  return (
    <StatusPage>
      {/* The address is only known in the browser, hence the boundary. */}
      <Suspense fallback={invite}>
        <ByAddress invite={invite} page={<PageNotFound />} />
      </Suspense>
    </StatusPage>
  );
}
