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
- **Five themes:** Confetti, Wild, Sunset, Midnight and Clean, plus an optional cover image.
- **Flexible guest form.** The host decides whether phone is required, optional or not asked. Also messages, +1s, up to 3 custom questions and an RSVP deadline.
- **Private by default.** Link-only events, a guest list visibility setting, phone numbers only visible to the host, and guest contact details deleted automatically 90 days after the event.
- **Updates that reach people.** Email updates for guests who opt in, plus a ready-made WhatsApp message for the host to paste in their group.
- **Host alerts.** Email (instant or a daily summary) and free web push notifications.
- **Great link previews.** Every invite gets a themed preview card in WhatsApp, iMessage, Telegram and more.
- **Sharing tools.** Copy link, share to WhatsApp, QR code, add to calendar (Google, Apple, Outlook).
- **Built to stay free.** Hard limits, bot protection, rate limits and abuse reports. No SMS, no paid APIs.

## Tech stack

Next.js 16 (App Router, Cache Components) · TypeScript (strict) · PostgreSQL 18 + Drizzle ORM · Better Auth · Zod · Zustand · TanStack Query · shadcn/ui + Tailwind CSS 4 · Motion · next-intl · pg-boss · React Email · Biome · Vitest · Playwright · Docker.

The reasons behind each choice are in [docs/tech-stack.md](docs/tech-stack.md).

## Quick start (development)

Requirements: Node.js 24+, Docker.

```bash
npm install
cp .env.example .env.local        # then set BETTER_AUTH_SECRET (see the file)
docker compose up -d              # PostgreSQL + Mailpit
npm run db:migrate
npm run dev
```

- App: http://localhost:3000
- Emails sent in development: http://localhost:8025 (Mailpit)

See [docs/development.md](docs/development.md) for the full guide.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build / server |
| `npm run lint` / `lint:fix` | Biome lint + format check / auto-fix |
| `npm run typecheck` | TypeScript (app + service worker) |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | End-to-end tests (Playwright; needs the app running) |
| `npm run db:generate` / `db:migrate` / `db:studio` | Drizzle migrations and studio |
| `npm run check` | Lint + typecheck + unit tests |

## Documentation

- [Business plan & product requirements](docs/business-plan.md)
- [Architecture](docs/architecture.md)
- [Tech stack](docs/tech-stack.md)
- [Configuration](docs/configuration.md)
- [Deployment](docs/deployment.md)
- [Themes](docs/themes.md) · [Translations](docs/i18n.md)
- [Architecture decision records](docs/adr/)

## License

[AGPL-3.0](LICENSE). You can use, study, change and share Comeby. If you run a modified version as a public service, you must share your changes under the same license.
