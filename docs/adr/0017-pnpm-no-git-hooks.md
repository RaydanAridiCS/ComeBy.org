# 0017: pnpm, and no git hooks

**Status:** accepted · recorded 2026-11-15 (the changes were made earlier)

## Context
The project started on npm with Lefthook running Biome, the typecheck and commitlint on every commit. Two things changed: the package manager moved to pnpm, and the hooks were removed.

## Decision
- **pnpm is the package manager.** The exact version is pinned in `package.json` (`packageManager`) and provided by corepack, locally, in CI and in the Docker image. `pnpm-lock.yaml` is the only lockfile.
- **There are no git hooks.** Nothing runs on commit or push.
- **CI is the gate.** Every pull request and push to `main` runs lint, a dependency audit, the migration drift check, typecheck, theme contrast, unit, integration and end-to-end tests, and a Docker build.
- **`pnpm run check`** is the one command to run before pushing: lint, typecheck, contrast and unit tests.
- **Conventional Commits are a convention**, followed by hand.

## Consequences
- Installs are faster and stricter: a package can only import what it declares.
- Commits are instant, and work-in-progress commits are possible. The cost is that a broken commit is only caught by CI, or by remembering to run `pnpm run check`.
- Commit message format is not checked anywhere. `commitlint.config.ts` and the `@commitlint/*` dev dependencies are still in the repository but nothing calls them; they should either be removed or run in CI.
- Tools installed in the project are run with `pnpm exec` (or a script), not `pnpm dlx`, which would download a second copy.
