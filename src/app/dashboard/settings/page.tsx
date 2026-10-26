import {
  BellRing,
  Download,
  KeyRound,
  type LucideIcon,
  MonitorSmartphone,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { type ReactNode, Suspense } from "react";
import { PageTransition } from "@/components/motion/page-transition";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DeleteAccount } from "@/features/settings/components/delete-account";
import { EmailAlertSettings } from "@/features/settings/components/notification-settings";
import { PasswordSettings } from "@/features/settings/components/password-settings";
import { ProfileSettings } from "@/features/settings/components/profile-settings";
import { PushSettings } from "@/features/settings/components/push-settings";
import {
  type SessionRow,
  SessionsSettings,
} from "@/features/settings/components/sessions-settings";
import { describeUserAgent } from "@/lib/user-agent";
import { cn } from "@/lib/utils";
import { auth } from "@/server/auth/auth";
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
  const requestHeaders = await headers();
  const [settings, t, accounts, activeSessions, current] = await Promise.all([
    repositories.userSettings.get(user.id),
    getTranslations("settings"),
    auth.api.listUserAccounts({ headers: requestHeaders }),
    auth.api.listSessions({ headers: requestHeaders }),
    auth.api.getSession({ headers: requestHeaders }),
  ]);
  const hasPassword = accounts.some((account) => account.providerId === "credential");
  const sessions: SessionRow[] = activeSessions
    .map((session) => {
      const { browser, os } = describeUserAgent(session.userAgent);
      return {
        id: session.id,
        browser,
        os,
        mobile: os === "iOS" || os === "Android",
        lastActive: session.updatedAt.toISOString(),
        current: session.token === current?.session.token,
      };
    })
    .sort(
      (a, b) => Number(b.current) - Number(a.current) || b.lastActive.localeCompare(a.lastActive),
    );
  return (
    <>
      <Card icon={UserRound} title={t("profileTitle")}>
        <ProfileSettings name={user.name} email={user.email} canChangeEmail={hasPassword} />
      </Card>
      <Card icon={KeyRound} title={t("securityTitle")} body={t("securityBody")}>
        {hasPassword ? (
          <PasswordSettings />
        ) : (
          <p className="text-muted-foreground text-sm">{t("googlePasswordHint")}</p>
        )}
      </Card>
      <Card icon={MonitorSmartphone} title={t("sessionsTitle")} body={t("sessionsBody")}>
        <SessionsSettings sessions={sessions} />
      </Card>
      <Card icon={BellRing} title={t("notificationsTitle")} body={t("notificationsBody")}>
        <EmailAlertSettings initial={settings.emailAlerts} />
        <div className="border-t pt-5">
          <PushSettings />
        </div>
      </Card>
      <Card icon={Download} title={t("dataTitle")} body={t("dataBody")}>
        <Button asChild variant="outline" size="sm" className="self-start">
          <a href="/api/account/export" download>
            {t("dataButton")}
          </a>
        </Button>
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
              <Skeleton className="h-64 rounded-3xl" />
              <Skeleton className="h-64 rounded-3xl" />
              <Skeleton className="h-48 rounded-3xl" />
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
