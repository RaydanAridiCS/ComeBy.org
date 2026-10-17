# Themes

An invite's theme sets its colours, display font and background decorations. There are five launch themes: **Confetti**, **Wild**, **Sunset**, **Midnight** and **Clean**.

## How it works

- `src/themes/index.ts` holds each theme's tokens: background, card, text, accent, display font and so on. `themeStyle(id)` turns them into CSS variables (`--invite-*`) on the invite page wrapper.
- `src/app/globals.css` maps those variables to Tailwind colours (`bg-invite-accent`, `text-invite-muted`…) and the `invite-page`, `invite-card`, `invite-heading` and `invite-input` classes.
- `src/themes/decorations.tsx` draws each theme's background art with pure SVG/CSS, so there are no image downloads.
- The same tokens drive the link-preview image (`src/app/[slug]/opengraph-image.tsx`) and the theme picker, so all three always match.
- Display fonts are self-hosted by `next/font` (`src/app/fonts.ts`); a browser only downloads a font when an invite uses it.

## Adding a theme

1. Add the ID to `THEMES` in `src/features/events/schema.ts` and to `themeEnum` in `src/db/schema/app.ts`, then run `npm run db:generate`.
2. Add its tokens to `THEME_TOKENS` in `src/themes/index.ts`. If it needs a new font, add it in `src/app/fonts.ts`.
3. Optionally add decorations in `src/themes/decorations.tsx`.
4. Add `themes.<id>.name` and `themes.<id>.tagline` to every message catalogue.
5. Check it on a phone in both the invite page and the preview image. Text must stay readable (WCAG AA contrast) and pages must stay light.
