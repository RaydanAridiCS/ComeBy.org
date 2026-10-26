import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ModerationQueue, type QueueItem } from "@/features/admin/components/moderation-queue";
import { requireAdmin } from "@/server/auth/admin";
import { adminService } from "@/server/services";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("title") };
}

async function AdminContent() {
  await requireAdmin();
  const [queue, actions, t] = await Promise.all([
    adminService.queue(),
    adminService.recentActions(),
    getTranslations("admin"),
  ]);

  const items: QueueItem[] = queue.map((item) => ({
    id: item.id,
    slug: item.slug,
    title: item.title,
    status: item.status,
    hostName: item.hostName,
    hostEmail: item.hostEmail,
    reportCount: item.reportCount,
    hidden: Boolean(item.hiddenAt),
    reasons: Object.entries(item.reasons).map(([reason, count]) => ({
      reason: reason as QueueItem["reasons"][number]["reason"],
      count: count ?? 0,
    })),
    recentDetails: item.recentDetails,
  }));

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-2">
        <h1 className="heading text-headline">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <section className="flex flex-col gap-4" aria-labelledby="queue-heading">
        <h2 id="queue-heading" className="heading text-xl">
          {t("queueTitle")}
        </h2>
        <ModerationQueue items={items} />
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="audit-heading">
        <h2 id="audit-heading" className="heading text-xl">
          {t("auditTitle")}
        </h2>
        {actions.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("auditEmpty")}</p>
        ) : (
          <ul className="flex flex-col divide-y rounded-3xl border bg-card">
            {actions.map((entry) => (
              <li key={entry.id} className="flex flex-wrap justify-between gap-2 px-5 py-3 text-sm">
                <span>
                  {t(entry.action === "delete_event" ? "auditDelete" : "auditRestore", {
                    admin: entry.adminEmail,
                    event: entry.eventTitle,
                  })}
                </span>
                <time dateTime={entry.createdAt.toISOString()} className="text-muted-foreground">
                  {entry.createdAt.toISOString().slice(0, 16).replace("T", " ")} UTC
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-3xl" />}>
      <AdminContent />
    </Suspense>
  );
}
