# Deployment

This page describes how **comeby.org** itself is deployed: one small VPS running **Coolify**, Cloudflare in front, Cloudflare R2 for images. Expected cost at launch is about $5–10/month plus the domain.

> **Self-hosting is not supported.** The code is open (AGPL-3.0) and nothing stops you from running it, but only the hosted service at comeby.org is supported. This page is written for that one setup and makes assumptions that only hold there, such as Cloudflare always being in front.

Day-to-day running (backups, monitoring, upgrades, troubleshooting) is in [operations.md](operations.md).

## 1. Services to set up

| Service | Why | Notes |
|---|---|---|
| VPS (e.g. Hetzner CX22) | Runs the app + Postgres | 2 vCPU / 4 GB RAM is plenty to start |
| Coolify | Deploys from GitHub, TLS, backups | Install on the VPS |
| Cloudflare | DNS, CDN, DDoS protection, Turnstile, R2 | Point `comeby.org` at the VPS (proxied) |
| Cloudflare R2 | Cover images | Create bucket `comeby-uploads`, connect a public custom domain such as `cdn.comeby.org` |
| Email (Resend or Amazon SES) | Sending emails | Verify `comeby.org` (SPF, DKIM, DMARC) |
| Error reporting (optional) | Server, job and browser errors | Any Sentry-compatible server, for example self-hosted GlitchTip |

## 2. Deploy with Coolify

1. In Coolify, create a **PostgreSQL 18** database and copy its **Internal Database URL** (e.g. `postgres://comeby:<password>@<container_or_uuid>:5432/comeby`). **Do not use localhost or 127.0.0.1**, as Docker containers cannot reach other containers or the host via localhost.
2. Create an **Application** from the GitHub repo using the **Dockerfile** build pack. Port: `3000`. Health check path: `/api/health`. Ensure both the application and the database are in the same Coolify project network.
3. Under **Build variables**, set everything that is baked in at build time:
   - `NEXT_PUBLIC_APP_URL=https://comeby.org`
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
   - `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` (if Google sign-in is used)
   - `NEXT_PUBLIC_UMAMI_SCRIPT_URL`, `NEXT_PUBLIC_UMAMI_WEBSITE_ID` (if analytics is used)
   - `S3_PUBLIC_URL` (it sets the allowed image host and the Content-Security-Policy)
4. Under **Environment variables**, set the rest (see [configuration.md](configuration.md)):
   - `DATABASE_URL` (the internal URL from step 1) and `BETTER_AUTH_SECRET`
   - `NEXT_PUBLIC_APP_URL` and `S3_PUBLIC_URL` again, with the same values as the build variables, so the build and the running server can never disagree (the storage adapter reads `S3_PUBLIC_URL` at run time)
   - `EMAIL_PROVIDER`, `EMAIL_FROM` and the provider's credentials
   - `RESEND_WEBHOOK_SECRET` or `EMAIL_WEBHOOK_SECRET`, so bounces and complaints reach the suppression list
   - `STORAGE_PROVIDER=s3` with the `S3_*` values
   - `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT`
   - `TURNSTILE_SECRET_KEY`
   - `ADMIN_EMAILS`, or nobody can open the moderation queue
   - `ERROR_REPORTING_DSN`
5. Set the domain to `https://comeby.org` and deploy. Migrations run automatically on start.

### Run one instance

The background workers run inside the web process, and Better Auth's rate limiter keeps its counters in memory. Both assume a single app instance. Do not scale the application to several replicas without first reading [ADR 0003](adr/0003-postgres-for-everything.md).

### About `docker-compose.prod.yml`

The repository also contains `docker-compose.prod.yml`, which runs the app and Postgres together. It is a reference, not a supported path. If you use it, note that build arguments come from the shell or a `.env` file next to the compose file, **not** from `.env.production` (`env_file` only applies at runtime), and that it publishes port 3000 with no TLS or reverse proxy.

## 3. Cloudflare settings

- SSL/TLS mode **Full (strict)**.
- Cache rules: let Cloudflare cache `/_next/static/*` and the R2 domain; don't cache HTML.
- Keep the site **proxied** (orange cloud), and make sure the server only accepts web traffic that comes through Cloudflare (a firewall rule that allows only Cloudflare's IP ranges, or a Cloudflare Tunnel). The app reads the visitor's address from the `cf-connecting-ip` header and trusts it. If the server can be reached directly, anyone can send that header themselves and get around every per-network limit. See [security.md](security.md#client-ip-and-rate-limits).
- Turnstile: create a widget for `comeby.org` and set both keys.

## 4. Before launch checklist

- [ ] Real `BETTER_AUTH_SECRET` (never reuse the dev one)
- [ ] Email domain verified; send yourself a test sign-up
- [ ] Bounce webhook configured and its secret set
- [ ] VAPID keys set; test push from Settings on a phone
- [ ] Turnstile keys set
- [ ] R2 bucket public URL works for a cover image
- [ ] `ADMIN_EMAILS` set; `/admin` opens for that account
- [ ] The server is not reachable except through Cloudflare
- [ ] Backups scheduled with retention of 30 days or less, and a restore tested ([operations.md](operations.md#backups))
- [ ] Uptime check on `/api/health`
- [ ] Share an invite link in WhatsApp and check the preview card
- [ ] Confirm `SITE.repositoryUrl` / `supportUrl` in `src/config/site.ts`
