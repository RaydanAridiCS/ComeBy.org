# 0014: File storage behind an adapter; exports are generated live

**Status:** accepted · recorded 2026-11-15 (the decision was made earlier, during the build)

## Context
Hosts can upload one cover image per event. In production these should come straight from a CDN-backed bucket with no bandwidth cost; in development nobody should need a cloud account. Separately, hosts and guests can download their own data, and that data is personal.

## Decision
- **One interface**, `FileStorage`, with `put`, `delete` and `publicUrl`. `STORAGE_PROVIDER` picks `local` (files on disk, served by `/uploads/[...key]`) or `s3` (any S3-compatible bucket; Cloudflare R2 in production).
- **Everything in storage is public.** Files are written with a long, immutable cache lifetime and read by URL with no signing.
- **Keys are generated, never taken from the user**: `covers/<uuid>.webp`. Both providers reject any key that doesn't match a strict pattern.
- **Uploads are re-encoded.** sharp converts every cover to WebP within 1600 × 1600 px, which strips metadata and rejects files that aren't real images.
- **Personal data never goes into storage.** The account export, the guest export and the CSV are built on request and streamed as a download with `Cache-Control: private, no-store`.

## Consequences
- The bucket needs no access rules beyond "public read", and images are served without touching the app.
- Because the bucket is public, an export file saved there would be readable by anyone who had or guessed its URL. Generating exports live removes that risk and means there is nothing to expire or clean up.
- A large account export is built in memory on each request. The limit of 5 a day per host keeps that cheap; a host with many large events would be the first place this hurts.
- `S3_PUBLIC_URL` is needed at build time as well as run time, because it sets the image host in the Content-Security-Policy.
- With `local` storage the files are on the server's disk and must be backed up with it. comeby.org uses `s3`.
