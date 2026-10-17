import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerTranslator } from "@/i18n/config";
import { slugify } from "@/lib/slug";
import { auth } from "@/server/auth/auth";
import { isAppError } from "@/server/errors";
import { rsvpService } from "@/server/services";

/** Quote a CSV cell, and neutralise spreadsheet formulas (CSV injection). */
function csvCell(value: string | number | null | undefined): string {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

/** Downloads every response of an event as a spreadsheet-friendly CSV file. */
export async function GET(_request: Request, context: RouteContext<"/api/events/[id]/export">) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    const { event, responses } = await rsvpService.dashboardData(session.user.id, id);
    const t = getServerTranslator();
    const questions = event.customQuestions;
    const header = [
      t("eventDashboard.columnGuest"),
      t("eventDashboard.columnResponse"),
      "+1",
      t("eventDashboard.columnPhone"),
      t("rsvp.email"),
      t("eventDashboard.columnMessage"),
      ...questions.map((question) => question.label),
      t("eventDashboard.columnSubmitted"),
      "Updated",
    ];
    const rows = responses.map((rsvp) => [
      rsvp.name,
      t(`status.${rsvp.status}`),
      rsvp.plusOnes,
      rsvp.phone,
      rsvp.email,
      rsvp.message,
      ...questions.map((question) => rsvp.answers[question.id] ?? ""),
      rsvp.createdAt.toISOString(),
      rsvp.updatedAt.toISOString(),
    ]);
    // A byte-order mark makes Excel read the file as UTF-8 (names with accents, emoji…).
    const csv = `﻿${[header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
    const filename = `${slugify(event.title) || "event"}-responses.csv`;
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json(
        { error: error.code },
        { status: error.code === "forbidden" ? 403 : 404 },
      );
    }
    throw error;
  }
}
