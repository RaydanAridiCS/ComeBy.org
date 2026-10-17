import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/brand/logo";
import { LostEnvelope } from "@/components/brand/lost-envelope";
import { Button } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations();
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-[radial-gradient(60%_50%_at_50%_30%,var(--brand-50),transparent_70%)] px-5 py-20 text-center">
      <Logo className="mb-6" />
      <LostEnvelope className="animate-pop" />
      <div className="flex max-w-md animate-rise flex-col gap-2 [--i:1]">
        <h1 className="heading text-headline">{t("eventPage.notFoundTitle")}</h1>
        <p className="text-muted-foreground">{t("eventPage.notFoundBody")}</p>
      </div>
      <div className="flex animate-rise flex-wrap justify-center gap-3 [--i:2]">
        <Button asChild size="lg">
          <Link href="/">{t("notFound.home")}</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/signup">{t("nav.createInvite")}</Link>
        </Button>
      </div>
    </main>
  );
}
