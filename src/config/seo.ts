/**
 * The only pages search engines may index. Invites are private (link-only, `noindex`),
 * and the app and auth pages are not content. Both `robots.ts` and `sitemap.ts` read this
 * list so they can never disagree.
 */
export const INDEXABLE_PATHS = ["/", "/privacy", "/terms"] as const;
