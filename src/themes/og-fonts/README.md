# Link-preview fonts

Static TTF files read by `src/app/[slug]/opengraph-image.tsx` (`next/og` can't use
`next/font` or WOFF2). They are only used on the server to draw preview images; browsers
never download them.

All fonts come from Google Fonts and are licensed under the
[SIL Open Font License 1.1](https://openfontlicense.org): Fredoka, Fraunces, Instrument Serif,
Unbounded, Geist and Bricolage Grotesque.

To add a theme font: download a static instance (`https://fonts.googleapis.com/css2?family=<Name>:wght@<weight>`
returns a `.ttf` URL), save it here and register it in `opengraph-image.tsx`.
