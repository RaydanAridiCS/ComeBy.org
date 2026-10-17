# Themes

An invite's theme sets its colours, display font, card surface and art. There are five launch themes: **Confetti**, **Wild**, **Sunset**, **Midnight** and **Clean**.

## How it works

- `src/themes/index.ts` holds each theme's tokens:
  - colours: `accent` fills buttons, and `accentInk` is the accent that is safe for text and icons;
  - the card `surface`: `solid`, frosted `glass` or warm `paper`;
  - the display font with its weight, tracking and scale;
  - confetti colours, avatar colours and the link-preview background.

  `themeStyle(id)` turns these into CSS variables (`--invite-*`) on the invite wrapper.
- `src/app/globals.css` turns those variables into classes:
  - Tailwind colours: `bg-invite-accent`, `text-invite-muted`…;
  - the `invite-page`, `invite-card` (with `data-surface`), `invite-heading`, `invite-title`, `invite-chip`, `invite-link`, `invite-input` and `invite-focus` classes;
  - the ambient animations (`invite-anim-*`), which only run without reduced motion.
- `src/themes/decorations.tsx` draws the art with pure SVG/CSS, so there are no image downloads:
  - `ThemeHeroArt` is the band at the top of the card when there's no cover photo;
  - `ThemeBackdrop` is the scenery behind the card, `fixed` on the invite page.
- `src/features/rsvp/components/invite-card.tsx` (`InviteCard`) is the invitation itself. The invite page and the event-form preview both use it.
- `src/themes/invite-mini.tsx` (`InviteMini`) is a miniature invite for the theme picker and the landing page. It's sized in container units, so it scales with its box.
- `src/themes/og-art.tsx` plus `src/app/[slug]/opengraph-image.tsx` draw the 1200×630 link-preview image:
  - it shows the same scene, rendered by `next/og`, which only understands inline styles and plain SVG;
  - its fonts are static TTFs in `src/themes/og-fonts/`.
- Display fonts are self-hosted by `next/font` (`src/app/fonts.ts`) with `preload: false`, so a browser only downloads a theme font when a page uses it.

## Adding a theme

1. Add the ID to `THEMES` in `src/features/events/schema.ts` and to `themeEnum` in `src/db/schema/app.ts`, then run `npm run db:generate`.
2. Add its tokens to `THEME_TOKENS` in `src/themes/index.ts`. If it needs a new font, add it in `src/app/fonts.ts` (with `preload: false`) and add a static TTF to `src/themes/og-fonts/`.
3. Add its scenes:
   - `ThemeHeroArt` and `ThemeBackdrop` in `decorations.tsx`;
   - `OgArt` in `og-art.tsx`;
   - a fixed sample date in `invite-mini.tsx`.
4. Add `themes.<id>.name`, `tagline`, `sampleTitle` and `sampleHost` to every message catalogue.
5. Run `npx tsx scripts/check-theme-contrast.ts`. Every check must pass (WCAG AA).
6. Check it on a phone in the invite page, the theme picker and the preview image (`/<slug>/opengraph-image`). Pages must stay light.
