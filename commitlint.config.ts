import type { UserConfig } from "@commitlint/types";

/** Enforces Conventional Commits (feat:, fix:, docs:, chore: …). */
const config: UserConfig = {
  extends: ["@commitlint/config-conventional"],
};

export default config;
