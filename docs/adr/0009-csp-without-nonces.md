# 0009: Content-Security-Policy without nonces

**Status:** accepted · 2026-10-26

## Context
Next.js documents a nonce-based CSP, but nonces are generated per request, so every page must render dynamically and Partial Prerendering stops working (see `node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`). Comeby relies on Cache Components ([0001](0001-nextjs-cache-components.md)) so invite pages load fast on slow phones.

## Decision
`src/config/csp.ts` builds one static policy that `next.config.ts` sends on every response. Scripts and styles allow `'unsafe-inline'` (Next.js inline bootstrap scripts and React style attributes), but everything else is locked down: `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`, and only Cloudflare Turnstile, the Umami host and the public file bucket are allowed as third parties. `CSP_REPORT_ONLY=1` switches it to report-only when trying a new service. The policy is built at build time, so `S3_PUBLIC_URL` and the Umami URL are Docker build args.

## Consequences
- Pages stay static and cacheable.
- An injected inline script would still run; the policy limits what it can load or send to, but is weaker than a strict nonce policy.
- Revisit when Next.js supports nonces together with prerendering, or use the experimental SRI option.
- E2E tests fail on any CSP violation in the browser console, so a new third-party script can't ship unnoticed.
