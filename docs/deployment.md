# Deployment

Target setup: one small VPS running **Coolify**, Cloudflare in front, Cloudflare R2 for images. Expected cost at launch is about $5–10/month plus the domain.

## 1. Services to set up

| Service | Why | Notes |
|---|---|---|
| VPS (e.g. Hetzner CX22) | Runs the app + Postgres | 2 vCPU / 4 GB RAM is plenty to start |
| Coolify | Deploys from GitHub, TLS, backups | Install on the VPS |
| Cloudflare | DNS, CDN, DDoS protection, Turnstile, R2 | Point `comeby.org` at the VPS (proxied) |
| Cloudflare R2 | Cover images | Create bucket `comeby-uploads`, connect a public custom domain such as `cdn.comeby.org` |
| Email (Resend or Amazon SES) | Sending emails | Verify `comeby.org` (SPF, DKIM, DMARC) |

## 2. Deploy with Coolify

**Option A: Dockerfile app + Coolify Postgres (recommended)**

1. In Coolify, create a **PostgreSQL 18** database and copy its internal URL.
2. Create an **Application** from the GitHub repo using the **Dockerfile** build pack. Port: `3000`. Health check path: `/api/health`.
3. Under **Build variables**, set the `NEXT_PUBLIC_*` values (they're baked in at build time).
4. Under **Environment variables**, set the rest (see [configuration.md](configuration.md)). At minimum: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `NEXT_PUBLIC_APP_URL=https://comeby.org`, `EMAIL_PROVIDER`, `EMAIL_FROM`, the email credentials, and `STORAGE_PROVIDER=s3` with the `S3_*` values.
5. Set the domain to `https://comeby.org` and deploy. Migrations run automatically on start.

**Option B: docker compose**

```bash
cp .env.example .env.production   # fill in production values (not DATABASE_URL)
POSTGRES_PASSWORD=... docker compose -f docker-compose.prod.yml up -d --build
```

## 3. Backups

- In Coolify, enable **scheduled backups** for the Postgres database (daily) with an S3 destination (an R2 bucket such as `comeby-backups`).
- Test a restore at least once before launch.
- Cover images live in R2 and don't need separate backups.

## 4. Cloudflare settings

- SSL/TLS mode **Full (strict)**.
- Cache rules: let Cloudflare cache `/_next/static/*` and the R2 domain; don't cache HTML.
- The app trusts `cf-connecting-ip` for rate limits, so keep the site **proxied** (orange cloud).
- Turnstile: create a widget for `comeby.org` and set both keys.

## 5. Monitoring

- **Beszel** agent on the VPS for CPU, RAM and disk.
- An uptime check on `https://comeby.org/api/health` (Uptime Kuma, Beszel or similar).
- App logs are JSON on stdout (view them in Coolify). Server errors are logged with their route.

## 6. Before launch checklist

- [ ] Real `BETTER_AUTH_SECRET` (never reuse the dev one)
- [ ] Email domain verified; send yourself a test sign-up
- [ ] VAPID keys set; test push from Settings on a phone
- [ ] Turnstile keys set
- [ ] R2 bucket public URL works for a cover image
- [ ] Backups scheduled and a restore tested
- [ ] Share an invite link in WhatsApp and check the preview card
- [ ] Update `SITE.repositoryUrl` / `supportUrl` in `src/config/site.ts`
