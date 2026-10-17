import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { type ReactNode, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { DeleteAccount } from "@/features/settings/components/delete-account";
import { EmailAlertSettings } from "@/features/settings/components/notification-settings";
import { PushSettings } from "@/features/settings/components/push-settings";
import { requireUser } from "@/server/auth/session";
import { repositories } from "@/server/services";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings");
  return { title: t("title") };
}

function Card({ title, body, children }: { title: string; body?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border bg-card p-5 sm:p-6">
      <div>
        <h2 className="font-semibold text-lg">{title}</h2>
        {body ? <p className="text-muted-foreground text-sm">{body}</p> : null}
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
      <Card title={t("profileTitle")}>
        <dl className="grid gap-3 text-sm sm:grid-cols-[120px_1fr]">
          <dt className="text-muted-foreground">{t("name")}</dt>
          <dd>{user.name}</dd>
          <dt className="text-muted-foreground">{t("email")}</dt>
          <dd>{user.email}</dd>
        </dl>
      </Card>
      <Card title={t("notificationsTitle")} body={t("notificationsBody")}>
        <EmailAlertSettings initial={settings.emailAlerts} />
        <PushSettings />
      </Card>
      <Card title={t("dangerTitle")} body={t("dangerBody")}>
        <DeleteAccount />
      </Card>
    </>
  );
}

export default async function SettingsPage() {
  const t = await getTranslations("settings");
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="font-bold text-2xl tracking-tight">{t("title")}</h1>
      <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
        <SettingsContent />
      </Suspense>
    </div>
  );
}
