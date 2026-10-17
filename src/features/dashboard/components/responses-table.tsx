"use client";

import { parsePhoneNumberFromString } from "libphonenumber-js/min";
import { Download, MessageCircle, Phone, Search, Trash2, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useTransition } from "react";
import { toast } from "sonner";
import { LocalTime } from "@/components/local-time";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { removeRsvpAction } from "@/features/events/actions";
import { cn } from "@/lib/utils";
import type { DashboardData, DashboardResponse } from "../dto";
import { type ResponseSort, useResponseFilters } from "../stores/response-filters";

const STATUS_STYLES: Record<DashboardResponse["status"], string> = {
  going: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100",
  maybe: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
  not_going: "bg-muted text-muted-foreground",
};

function PhoneLinks({ phone }: { phone: string }) {
  const parsed = parsePhoneNumberFromString(phone);
  const display = parsed?.formatInternational() ?? phone;
  const digits = (parsed?.number ?? phone).replace(/[^\d]/g, "");
  return (
    <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
      <a
        href={`tel:${parsed?.number ?? phone}`}
        className="inline-flex items-center gap-1 hover:underline"
      >
        <Phone className="size-3.5" aria-hidden="true" />
        {display}
      </a>
      <a
        href={`https://wa.me/${digits}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
        aria-label="WhatsApp"
      >
        <MessageCircle className="size-3.5" aria-hidden="true" />
      </a>
    </span>
  );
}

function RemoveButton({ eventId, response }: { eventId: string; response: DashboardResponse }) {
  const t = useTranslations();
  const [pending, startTransition] = useTransition();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground"
          aria-label={t("eventDashboard.removeResponse")}
        >
          <Trash2 />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("eventDashboard.removeConfirmTitle", { name: response.name })}
          </AlertDialogTitle>
          <AlertDialogDescription>{t("eventDashboard.removeConfirmBody")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await removeRsvpAction(eventId, response.id);
                if (result.ok) toast.success(t("eventDashboard.removed"));
                else toast.error(result.error.message);
              })
            }
          >
            {t("common.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function ResponsesTable({ data }: { data: DashboardData }) {
  const t = useTranslations();
  const { search, status, sort, setSearch, setStatus, setSort } = useResponseFilters();

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = data.responses.filter((response) => {
      if (status !== "all" && response.status !== status) return false;
      if (!query) return true;
      return [response.name, response.phone, response.message, response.email]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(query));
    });
    return filtered.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      const diff = Date.parse(a.createdAt) - Date.parse(b.createdAt);
      return sort === "oldest" ? diff : -diff;
    });
  }, [data.responses, search, status, sort]);

  const counts = {
    all: data.responses.length,
    going: data.stats.going,
    maybe: data.stats.maybe,
    not_going: data.stats.notGoing,
  };

  return (
    <section className="flex flex-col gap-4 rounded-2xl border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold text-lg">{t("eventDashboard.responsesTitle")}</h2>
        <Button asChild variant="outline" size="sm">
          <a href={`/api/events/${data.event.id}/export`} download>
            <Download />
            {t("eventDashboard.exportCsv")}
          </a>
        </Button>
      </div>

      {data.responses.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users />
            </EmptyMedia>
            <EmptyTitle>{t("eventDashboard.noResponsesTitle")}</EmptyTitle>
            <EmptyDescription>{t("eventDashboard.noResponsesBody")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            <InputGroup>
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
              <InputGroupInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("eventDashboard.searchPlaceholder")}
                aria-label={t("eventDashboard.searchPlaceholder")}
              />
            </InputGroup>
            <div className="flex flex-wrap items-center gap-2">
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                value={status}
                onValueChange={(value) => value && setStatus(value as typeof status)}
                className="flex-wrap"
              >
                <ToggleGroupItem value="all">
                  {t("eventDashboard.filterAll")} {counts.all}
                </ToggleGroupItem>
                <ToggleGroupItem value="going">
                  {t("status.going")} {counts.going}
                </ToggleGroupItem>
                <ToggleGroupItem value="maybe">
                  {t("status.maybe")} {counts.maybe}
                </ToggleGroupItem>
                <ToggleGroupItem value="not_going">
                  {t("status.not_going")} {counts.not_going}
                </ToggleGroupItem>
              </ToggleGroup>
              <Select value={sort} onValueChange={(value) => setSort(value as ResponseSort)}>
                <SelectTrigger className="ms-auto w-40" size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">{t("eventDashboard.sortNewest")}</SelectItem>
                  <SelectItem value="oldest">{t("eventDashboard.sortOldest")}</SelectItem>
                  <SelectItem value="name">{t("eventDashboard.sortName")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {visible.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">
              {t("eventDashboard.noMatches")}
            </p>
          ) : (
            <ul className="divide-y">
              {visible.map((response) => (
                <li key={response.id} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{response.name}</span>
                      <Badge className={cn("border-0", STATUS_STYLES[response.status])}>
                        {t(`status.${response.status}`)}
                      </Badge>
                      {response.plusOnes > 0 ? (
                        <Badge variant="outline">
                          {t("eventDashboard.plusOnes", { count: response.plusOnes })}
                        </Badge>
                      ) : null}
                    </div>
                    <RemoveButton eventId={data.event.id} response={response} />
                  </div>
                  {response.phone ? (
                    <div className="text-sm">
                      <PhoneLinks phone={response.phone} />
                    </div>
                  ) : null}
                  {response.message ? (
                    <p className="rounded-xl bg-muted/60 px-3 py-2 text-sm">“{response.message}”</p>
                  ) : null}
                  {response.answers.length > 0 ? (
                    <dl className="grid gap-1 text-sm">
                      {response.answers.map((answer) => (
                        <div key={answer.label} className="flex flex-wrap gap-x-2">
                          <dt className="text-muted-foreground">{answer.label}:</dt>
                          <dd>{answer.value}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                  <p className="text-muted-foreground text-xs">
                    {t("eventDashboard.columnSubmitted")} <LocalTime iso={response.createdAt} />
                    {response.changed ? (
                      <>
                        {" · "}
                        {t("eventDashboard.changedAt")}
                        <LocalTime iso={response.updatedAt} />
                      </>
                    ) : null}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
