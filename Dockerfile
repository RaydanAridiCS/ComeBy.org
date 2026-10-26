# syntax=docker/dockerfile:1.7
#
# Production image for Comeby. Multi-stage: install → build → small runtime image.
#   docker build -t comeby \
#     --build-arg NEXT_PUBLIC_APP_URL=https://comeby.org \
#     --build-arg NEXT_PUBLIC_VAPID_PUBLIC_KEY=... .
# NEXT_PUBLIC_* values are baked into the browser code at build time, so pass them as
# build args. Everything else is read at runtime from the container's environment.

ARG NODE_VERSION=24-alpine

FROM node:${NODE_VERSION} AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# --- Dependencies -------------------------------------------------------------
FROM base AS deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --ignore-scripts

# --- Build --------------------------------------------------------------------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_APP_URL=https://comeby.org
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY=
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY=
ARG NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=false
ARG NEXT_PUBLIC_UMAMI_SCRIPT_URL=
ARG NEXT_PUBLIC_UMAMI_WEBSITE_ID=
# Read by next.config.ts at build time (allowed image host and Content-Security-Policy).
ARG S3_PUBLIC_URL=
ENV S3_PUBLIC_URL=${S3_PUBLIC_URL} \
    NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL} \
    NEXT_PUBLIC_VAPID_PUBLIC_KEY=${NEXT_PUBLIC_VAPID_PUBLIC_KEY} \
    NEXT_PUBLIC_TURNSTILE_SITE_KEY=${NEXT_PUBLIC_TURNSTILE_SITE_KEY} \
    NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=${NEXT_PUBLIC_GOOGLE_AUTH_ENABLED} \
    NEXT_PUBLIC_UMAMI_SCRIPT_URL=${NEXT_PUBLIC_UMAMI_SCRIPT_URL} \
    NEXT_PUBLIC_UMAMI_WEBSITE_ID=${NEXT_PUBLIC_UMAMI_WEBSITE_ID} \
    NEXT_TELEMETRY_DISABLED=1 \
    SKIP_ENV_VALIDATION=1 \
    SKIP_STARTUP_TASKS=1

RUN npm run build

# --- Runtime ------------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
# SQL migrations are applied automatically on startup (src/instrumentation.ts).
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle
RUN mkdir -p .data/uploads && chown -R nextjs:nodejs .data

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1

CMD ["node", "server.js"]
