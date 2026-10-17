import { getRequestConfig } from "next-intl/server";
import { DEFAULT_LOCALE, loadMessages } from "./config";

/*
 * Comeby is English-only for now, so the locale is fixed and never read from the
 * request. That keeps pages prerenderable under Cache Components. When more
 * languages arrive, read the locale here (see docs/i18n.md).
 */
export default getRequestConfig(async () => ({
  locale: DEFAULT_LOCALE,
  messages: loadMessages(DEFAULT_LOCALE),
  timeZone: "UTC",
}));
