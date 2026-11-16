import type { Metadata } from "next";
import Link from "next/link";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { StatusMessage } from "@/components/layout/status-message";
import { StatusPage } from "@/components/layout/status-page";
import { Button } from "@/components/ui/button";
import { UnsubscribeForm } from "@/features/unsubscribe/components/unsubscribe-form";
import { clientMessages } from "@/i18n/client-messages";
import { verifyUnsubscribeToken } from "@/server/security/unsubscribe-token";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("unsubscribe");
  return { title: t("title"), robots: { index: false, follow: false } };
}

async function UnsubscribeContent({
  searchParams,
}: Pick<PageProps<"/unsubscribe">, "searchParams">) {
  const t = await getTranslations("unsubscribe");
  const raw = (await searchParams).t;
  const token = Array.isArray(raw) ? raw[0] : raw;
  const verified = verifyUnsubscribeToken(token);

  if (!verified || !token) {
    return (
      <div className="flex flex-col items-center gap-6">
        <StatusMessage mark="!" title={t("invalidTitle")} body={t("invalidBody")}>
          <Button asChild size="lg">
            <Link href="/">{t("home")}</Link>
          </Button>
        </StatusMessage>
      </div>
    );
  }

  return (
    <NextIntlClientProvider messages={await clientMessages(["common", "errors", "unsubscribe"])}>
      <UnsubscribeForm token={token} scope={verified.scope} email={verified.email} />
    </NextIntlClientProvider>
  );
}

/** The page an email's "Unsubscribe" link opens. It asks before doing anything. */
export default function UnsubscribePage({ searchParams }: PageProps<"/unsubscribe">) {
  return (
    <StatusPage>
      <div className="w-full max-w-md">
        <Suspense>
          <UnsubscribeContent searchParams={searchParams} />
        </Suspense>
      </div>
    </StatusPage>
  );
}
