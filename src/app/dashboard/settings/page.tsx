import { BellRing, type LucideIcon, TriangleAlert, UserRound } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { type ReactNode, Suspense } from "react";
import { PageTransition } from "@/components/motion/page-transition";
import { Skeleton } from "@/components/ui/skeleton";
import { DeleteAccount } from "@/features/settings/components/delete-account";
import { EmailAlertSettings } from "@/features/settings/components/notification-settings";
import { PushSettings } from "@/features/settings/components/push-settings";
import { cn } from "@/lib/utils";
import { requireUser } from "@/server/auth/session";
import { repositories } from "@/server/services";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings");
  return { title: t("title") };
}

function Card({
  icon: Icon,
  title,
  body,
  tone = "default",
  children,
}: {
  icon: LucideIcon;
  title: string;
  body?: string;
  tone?: "default" | "danger";
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "flex flex-col gap-5 rounded-3xl border bg-card p-5 shadow-xs sm:p-6",
        tone === "danger" && "border-danger/25",
      )}
    >
      <div className="flex items-start gap-3.5">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-2xl",
            tone === "danger" ? "bg-danger-soft text-danger-ink" : "bg-brand-50 text-brand-700",
          )}
        >
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-0.5">
          <h2 className="heading text-lg">{title}</h2>
          {body ? <p className="text-muted-foreground text-sm">{body}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

async function SettingsContent() {
  const user = await requireUser("/dashboard/settings");
  const [settings, t] = await Promise.all([
    repositories.userSettings.get(user.id),
    getTranslations("settings"),
  ]);
  return (
    <>
      <Card icon={UserRound} title={t("profileTitle")}>
        <div className="flex items-center gap-4 rounded-2xl bg-muted/50 p-4">
          <span
            className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-800 text-lg"
            aria-hidden="true"
          >
            {user.name.trim().charAt(0).toUpperCase()}
          </span>
          <dl className="grid min-w-0 gap-0.5 text-sm">
            <dt className="sr-only">{t("name")}</dt>
            <dd className="truncate font-semibold">{user.name}</dd>
            <dt className="sr-only">{t("email")}</dt>
            <dd className="truncate text-muted-foreground">{user.email}</dd>
          </dl>
        </div>
      </Card>
      <Card icon={BellRing} title={t("notificationsTitle")} body={t("notificationsBody")}>
        <EmailAlertSettings initial={settings.emailAlerts} />
        <div className="border-t pt-5">
          <PushSettings />
        </div>
      </Card>
      <Card icon={TriangleAlert} title={t("dangerTitle")} body={t("dangerBody")} tone="danger">
        <DeleteAccount />
      </Card>
    </>
  );
}

export default async function SettingsPage() {
  const t = await getTranslations("settings");
  return (
    <PageTransition>
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <h1 className="heading animate-rise text-title">{t("title")}</h1>
        <Suspense
          fallback={
            <div className="flex flex-col gap-6" aria-hidden="true">
              <Skeleton className="h-36 rounded-3xl" />
              <Skeleton className="h-80 rounded-3xl" />
              <Skeleton className="h-36 rounded-3xl" />
            </div>
          }
        >
          <SettingsContent />
        </Suspense>
      </div>
    </PageTransition>
  );
}
