"use client";

import { useQueryClient } from "@tanstack/react-query";
import { parsePhoneNumberFromString } from "libphonenumber-js/min";
import { Download, MessageCircle, Phone, Search, Trash2, Users } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useTranslations } from "next-intl";
import { useMemo, useRef } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useRovingRadio } from "@/components/forms/use-roving-radio";
import { LocalTime } from "@/components/local-time";
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
import { removeRsvpAction } from "@/features/events/actions";
import { LIST_ITEM, SPRING_LAYOUT } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { DashboardData, DashboardResponse } from "../dto";
import { type ResponseSort, useResponseFilters } from "../stores/response-filters";

type StatusFilter = "all" | DashboardResponse["status"];

const STATUS_BADGE: Record<DashboardResponse["status"], "success" | "warning" | "secondary"> = {
  going: "success",
  maybe: "warning",
  not_going: "secondary",
};

const AVATAR_TONES = [
  "bg-brand-50 text-brand-800",
  "bg-[#fde7ef] text-[#9c1442]",
  "bg-[#e3f4e8] text-[#1f6b3a]",
  "bg-[#fff1d6] text-[#7a4a00]",
  "bg-[#efe7fd] text-[#5b2fc2]",
];

function avatarTone(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AVATAR_TONES[hash % AVATAR_TONES.length] ?? "bg-muted text-foreground";
}

function PhoneLinks({ phone, name }: { phone: string; name: string }) {
  const t = useTranslations("eventDashboard");
  const parsed = parsePhoneNumberFromString(phone);
  const display = parsed?.formatInternational() ?? phone;
  const digits = (parsed?.number ?? phone).replace(/[^\d]/g, "");
  return (
    // Compact chips in a dense row; hit-area makes each a 44 px target without looking heavier.
    <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-3">
      <a
        href={`tel:${parsed?.number ?? phone}`}
        className="relative hit-area inline-flex h-8 items-center gap-1.5 rounded-full bg-muted px-3 font-medium text-sm transition-colors hover:bg-brand-50 hover:text-brand-800"
      >
        <Phone className="size-3.5" aria-hidden="true" />
        {display}
      </a>
      <a
        href={`https://wa.me/${digits}`}
        target="_blank"
        rel="noopener noreferrer"
        className="relative hit-area inline-flex size-8 items-center justify-center rounded-full bg-[#e7f8ee] text-[#128c4a] transition-colors hover:bg-[#d2f2df]"
        aria-label={t("whatsappGuest", { name })}
      >
        <MessageCircle className="size-4" aria-hidden="true" />
      </a>
    </span>
  );
}

/** The dashboard data without one response: the row, its counts and its slot in the limit. */
function withoutResponse(data: DashboardData, id: string): DashboardData {
  const removed = data.responses.find((response) => response.id === id);
  if (!removed) return data;
  const { stats } = data;
  return {
    ...data,
    responses: data.responses.filter((response) => response.id !== id),
    stats: {
      going: stats.going - (removed.status === "going" ? 1 : 0),
      maybe: stats.maybe - (removed.status === "maybe" ? 1 : 0),
      notGoing: stats.notGoing - (removed.status === "not_going" ? 1 : 0),
      total: stats.total - 1,
      guests: stats.guests - (removed.status === "going" ? 1 + removed.plusOnes : 0),
    },
    capacity: { ...data.capacity, used: data.capacity.used - 1 },
  };
}

function RemoveButton({
  response,
  onRemove,
  returnFocusTo,
}: {
  response: DashboardResponse;
  onRemove: () => void;
  returnFocusTo: () => HTMLElement | null;
}) {
  const t = useTranslations();
  // Only a removed row hands focus on; cancelling goes back to this button, as usual.
  const removed = useRef(false);
  return (
    <ConfirmDialog
      trigger={
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-danger"
          aria-label={t("eventDashboard.removeResponseOf", { name: response.name })}
          data-remove-response={response.id}
        >
          <Trash2 />
        </Button>
      }
      variant="destructive"
      title={t("eventDashboard.removeConfirmTitle", { name: response.name })}
      description={t("eventDashboard.removeConfirmBody")}
      confirmLabel={t("eventDashboard.removeResponse")}
      returnFocusTo={() => (removed.current ? returnFocusTo() : null)}
      // The row goes at once; the server catches up behind it (and puts it back on failure).
      onConfirm={async () => {
        removed.current = true;
        onRemove();
        return { ok: true };
      }}
    />
  );
}

export function ResponsesTable({ data }: { data: DashboardData }) {
  const t = useTranslations();
  const { search, status, sort, setSearch, setStatus, setSort } = useResponseFilters();
  const queryClient = useQueryClient();
  const queryKey = ["event-dashboard", data.event.id];
  const headingRef = useRef<HTMLHeadingElement>(null);

  async function remove(id: string) {
    // A poll already on its way would bring the row back: stop it first.
    await queryClient.cancelQueries({ queryKey });
    const before = queryClient.getQueryData<DashboardData>(queryKey);
    queryClient.setQueryData<DashboardData>(queryKey, (current) =>
      current ? withoutResponse(current, id) : current,
    );
    let message: string | null = null;
    try {
      const result = await removeRsvpAction(data.event.id, id);
      if (!result.ok) message = result.error.message;
    } catch {
      message = t("common.networkError");
    }
    if (message === null) {
      toast.success(t("eventDashboard.removed"));
      return;
    }
    if (before) queryClient.setQueryData(queryKey, before);
    void queryClient.invalidateQueries({ queryKey });
    toast.error(message);
  }

  /** After a row is removed, focus goes to the next row's remove button, else the previous one, else the heading. */
  function focusAfter(id: string): () => HTMLElement | null {
    const index = visible.findIndex((response) => response.id === id);
    const neighbour = visible[index + 1] ?? visible[index - 1];
    return () =>
      (neighbour
        ? document.querySelector<HTMLElement>(`[data-remove-response="${neighbour.id}"]`)
        : null) ?? headingRef.current;
  }

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

  const filters: { value: StatusFilter; label: string; count: number }[] = [
    { value: "all", label: t("eventDashboard.filterAll"), count: data.responses.length },
    { value: "going", label: t("status.going"), count: data.stats.going },
    { value: "maybe", label: t("status.maybe"), count: data.stats.maybe },
    { value: "not_going", label: t("status.not_going"), count: data.stats.notGoing },
  ];
  const filterRadio = useRovingRadio<StatusFilter>(
    filters.map((filter) => filter.value),
    status,
    setStatus,
  );

  return (
    <section className="flex flex-col gap-5 rounded-3xl border bg-card p-5 shadow-xs sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 ref={headingRef} tabIndex={-1} className="heading text-xl outline-none">
          {t("eventDashboard.responsesTitle")}
          <span className="ms-2 font-sans font-medium text-base text-muted-foreground tabular-nums">
            {data.responses.length}
          </span>
        </h2>
        <Button asChild variant="outline" size="sm">
          <a href={`/api/events/${data.event.id}/export`} download>
            <Download />
            {t("eventDashboard.exportCsv")}
          </a>
        </Button>
      </div>

      {data.responses.length === 0 ? (
        <Empty className="rounded-2xl border border-dashed">
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
              <div
                role="radiogroup"
                aria-label={t("eventDashboard.responsesTitle")}
                className="flex flex-wrap gap-x-1 gap-y-2 rounded-xl bg-muted p-1 ring-1 ring-border/60 ring-inset"
              >
                {filters.map((filter, index) => {
                  const selected = status === filter.value;
                  return (
                    // biome-ignore lint/a11y/useSemanticElements: segmented control styled as buttons
                    <button
                      key={filter.value}
                      ref={(element) => {
                        filterRadio.refs.current[index] = element;
                      }}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      tabIndex={filterRadio.tabIndex(filter.value, index)}
                      onClick={() => setStatus(filter.value)}
                      onKeyDown={(event) => filterRadio.onKeyDown(event, index)}
                      className={cn(
                        "relative isolate hit-area flex h-9 items-center gap-1.5 rounded-lg px-3 font-semibold text-sm outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/40",
                        selected
                          ? "text-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {selected ? (
                        <m.span
                          layoutId={`response-filter-${data.event.id}`}
                          transition={SPRING_LAYOUT}
                          className="absolute inset-0 -z-10 rounded-lg bg-card shadow-sm"
                        />
                      ) : null}
                      {filter.label}
                      <span className="text-muted-foreground text-xs tabular-nums">
                        {filter.count}
                      </span>
                    </button>
                  );
                })}
              </div>
              <Select value={sort} onValueChange={(value) => setSort(value as ResponseSort)}>
                <SelectTrigger className="ms-auto w-40" aria-label={t("eventDashboard.sortLabel")}>
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
            <p className="rounded-2xl border border-dashed py-8 text-center text-muted-foreground">
              {t("eventDashboard.noMatches")}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              <AnimatePresence initial={false}>
                {visible.map((response) => (
                  <m.li
                    key={response.id}
                    layout="position"
                    {...LIST_ITEM}
                    className="flex gap-3.5 rounded-2xl border border-transparent p-3 transition-colors hover:border-border hover:bg-background sm:p-4"
                  >
                    <span
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-full font-bold",
                        avatarTone(response.name),
                      )}
                      aria-hidden="true"
                    >
                      {response.name.trim().charAt(0).toUpperCase()}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <span className="break-words font-semibold">{response.name}</span>
                          <Badge variant={STATUS_BADGE[response.status]}>
                            {t(`status.${response.status}`)}
                          </Badge>
                          {response.plusOnes > 0 ? (
                            <Badge variant="brand">
                              {t("eventDashboard.plusOnes", { count: response.plusOnes })}
                            </Badge>
                          ) : null}
                        </div>
                        <RemoveButton
                          response={response}
                          onRemove={() => void remove(response.id)}
                          returnFocusTo={focusAfter(response.id)}
                        />
                      </div>
                      {response.phone ? (
                        <PhoneLinks phone={response.phone} name={response.name} />
                      ) : null}
                      {response.message ? (
                        <p className="relative self-start rounded-2xl rounded-ss-sm bg-muted px-3.5 py-2 text-sm">
                          “{response.message}”
                        </p>
                      ) : null}
                      {response.answers.length > 0 ? (
                        <dl className="grid gap-1 rounded-xl border border-dashed p-3 text-sm">
                          {response.answers.map((answer) => (
                            <div key={answer.label} className="flex flex-wrap gap-x-2">
                              <dt className="text-muted-foreground">{answer.label}:</dt>
                              <dd className="font-medium">{answer.value}</dd>
                            </div>
                          ))}
                        </dl>
                      ) : null}
                      <p className="text-muted-foreground text-xs">
                        {t("eventDashboard.columnSubmitted")} <LocalTime iso={response.createdAt} />
                        {response.changed ? (
                          <>
                            {" · "}
                            {t("eventDashboard.changedAt")} <LocalTime iso={response.updatedAt} />
                          </>
                        ) : null}
                      </p>
                    </div>
                  </m.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </>
      )}
    </section>
  );
}
