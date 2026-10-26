import type { Metadata } from "next";
import Link from "next/link";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Logo } from "@/components/brand/logo";
import { LostEnvelope } from "@/components/brand/lost-envelope";
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
      <div className="flex flex-col items-center gap-6 text-center">
        <LostEnvelope mark="!" />
        <h1 className="heading text-headline">{t("invalidTitle")}</h1>
        <p className="text-muted-foreground">{t("invalidBody")}</p>
        <Button asChild size="lg">
          <Link href="/">{t("home")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <NextIntlClientProvider messages={await clientMessages(["common", "errors", "unsubscribe"])}>
      <UnsubscribeForm token={token} scope={verified.scope} email={verified.email} />
    </NextIntlClientProvider>
  );
}

export default function UnsubscribePage({ searchParams }: PageProps<"/unsubscribe">) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 bg-[radial-gradient(60%_50%_at_50%_30%,var(--brand-50),transparent_70%)] px-5 py-20">
      <Logo />
      <div className="w-full max-w-md">
        <Suspense>
          <UnsubscribeContent searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}
