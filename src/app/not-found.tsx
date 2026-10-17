import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations();
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <LogoMark className="size-12 text-brand" />
      <h1 className="font-bold text-2xl">{t("eventPage.notFoundTitle")}</h1>
      <p className="max-w-sm text-muted-foreground">{t("eventPage.notFoundBody")}</p>
      <Button asChild className="rounded-full">
        <Link href="/">{t("notFound.home")}</Link>
      </Button>
    </main>
  );
}
