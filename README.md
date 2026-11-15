<div align="center">

# Comeby

**Free, beautiful invites for every hangout.**
Invite anyone in seconds and know exactly who's coming. Open source, no ads, no app needed.

[comeby.org](https://comeby.org) · [Docs](docs/README.md) · [Contributing](CONTRIBUTING.md)

</div>

---

Comeby is an open-source invitation and RSVP app for casual plans: birthdays, picnics, hikes, game nights and meetups. A host creates a themed invite in about a minute and shares one link, usually in WhatsApp. Guests open it, tap **Going** and type their name. No app, no account. The host gets a live dashboard with every response, message and change, timestamped.

## Features

- **Guests never sign up.** No account, no download, a 10-second RSVP.
- **Live host dashboard.** Headcount including +1s, every response with submit and change times, an activity timeline, search, filters and CSV export.
- **Ten themes,** from Confetti for birthdays to Matcha for coffee dates, plus an optional cover image.
- **Flexible guest form.** The host decides whether phone is required, optional or not asked. Also messages, +1s, up to 3 custom questions and an RSVP deadline.
- **Private by default.** Link-only events, a guest list visibility setting, phone numbers only visible to the host, and guest contact details deleted automatically 90 days after the event.
- **Guests control their own data.** Change, download or delete your response from the invite page, with no account.
- **Updates that reach people.** Email updates for guests who opt in, plus a ready-made WhatsApp message for the host to paste in their group.
- **Reminders and a nudge.** Guests who left an email get one reminder in the 24 hours before the event. Hosts can send one nudge to people who said "maybe" or haven't answered.
- **Host alerts.** Email (instant or a daily summary) and free web push notifications.
- **Full account control.** Change your name, email and password, sign out other devices, download everything or delete your account.
- **Great link previews.** Every invite gets a themed preview card in WhatsApp, iMessage, Telegram and more.
- **Sharing tools.** Copy link, share to WhatsApp, QR code, add to calendar (Google, Apple, Outlook).
- **Built to stay free.** Hard limits, bot protection and rate limits. No SMS, no paid APIs.
- **Abuse handling.** A report button on every invite, automatic hiding after repeated reports, and a moderation queue for operators.

## Tech stack

Next.js 16 (App Router, Cache Components) · TypeScript (strict) · PostgreSQL 18 + Drizzle ORM · Better Auth · Zod · Zustand · TanStack Query · shadcn/ui + Tailwind CSS 4 · Motion · next-intl · pg-boss · React Email · Biome · Vitest · Playwright · Docker.

The reasons behind each choice are in [docs/tech-stack.md](docs/tech-stack.md).

## Quick start (development)

Requirements: Node.js 24+, Docker, and pnpm (run `corepack enable` once to get the version pinned in `package.json`).

```bash
pnpm install
cp .env.example .env.local        # then set BETTER_AUTH_SECRET (see the file)
docker compose up -d              # PostgreSQL + Mailpit
pnpm run db:migrate
pnpm run dev
```

- App: http://localhost:3000
- Emails sent in development: http://localhost:8025 (Mailpit)

Before opening a pull request, run `pnpm run check` (lint, typecheck, theme contrast and unit tests). Every command is listed in [docs/development.md](docs/development.md).

## Documentation

The full index is in [docs/README.md](docs/README.md). Good places to start:

- [Business plan & product requirements](docs/business-plan.md)
- [Development](docs/development.md) · [Testing](docs/testing.md)
- [Architecture](docs/architecture.md) · [Tech stack](docs/tech-stack.md) · [Data model](docs/data-model.md)
- [Security](docs/security.md) · [Privacy and data](docs/privacy-and-data.md)
- [Themes](docs/themes.md) · [Translations](docs/i18n.md)
- [Architecture decision records](docs/adr/)

Only the hosted service at [comeby.org](https://comeby.org) is supported. [docs/deployment.md](docs/deployment.md) describes how it is run.

## License

[AGPL-3.0](LICENSE). You can use, study, change and share Comeby. If you run a modified version as a public service, you must share your changes under the same license.
