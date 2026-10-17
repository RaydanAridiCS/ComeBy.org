# 0005: next-intl with a fixed locale for now

**Status:** accepted · 2026-10-17

## Context
The launch is English-only, but the product must be ready for more languages. Reading the locale from the request would make every page dynamic under Cache Components.

## Decision
All strings go through next-intl from day one, but `src/i18n/request.ts` returns a fixed locale (`en`) and never reads the request. Validation messages are translation keys.

## Consequences
- Pages stay prerenderable.
- Adding a language means picking a strategy (URL prefix, or a per-event language chosen by the host). See docs/i18n.md.
