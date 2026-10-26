# Contributing to Comeby

Thanks for helping! Comeby is free and open source, and contributions of every size are welcome: code, themes, translations, bug reports and ideas.

## Ways to help

- 🐛 **Report a bug.** Open an issue with steps to reproduce, what you expected and what happened. Screenshots from a phone help a lot.
- 💡 **Suggest a feature.** Check the [roadmap](docs/business-plan.md#15-roadmap--milestones) first, then open an issue.
- 🎨 **Design a theme.** See [docs/themes.md](docs/themes.md).
- 🌍 **Translate.** See [docs/i18n.md](docs/i18n.md).
- 🧑‍💻 **Write code.** Issues labelled `good first issue` are a great start.

## Development

See [docs/development.md](docs/development.md). In short:

```bash
npm install && cp .env.example .env.local && docker compose up -d && npm run dev
```

## Pull requests

1. Fork and create a branch: `feat/short-description` or `fix/short-description`.
2. Keep changes focused. Follow the conventions in [docs/development.md](docs/development.md#conventions): TypeScript only, strings through next-intl, rules in services, queries in repositories.
3. Add or update tests for behaviour changes. Database changes need a new migration from `npm run db:generate`; never edit a migration that has already been committed (databases that applied it will not re-run it). CI fails if the schema and `drizzle/` disagree.
4. Run `npm run check`. CI runs the same checks plus e2e tests and a Docker build.
5. Use [Conventional Commits](https://www.conventionalcommits.org) for commit messages.
6. Describe *what* and *why* in the PR, with screenshots for UI changes (mobile first!).

## Product principles

Before adding a feature, check it against the [product principles](docs/business-plan.md#5-product-principles). The most important ones: guests never sign up, it must work great on a cheap phone, and it must stay cheap enough to offer for free.

## License

By contributing you agree that your contributions are licensed under the [AGPL-3.0](LICENSE).
