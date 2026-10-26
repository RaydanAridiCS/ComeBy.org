import { LIMITS } from "@/config/limits";
import { AppError } from "../errors";
import { DAY_MS, type ServiceDeps } from "./deps";

/** Everything a host can download about their own account. */
export function createAccountService(deps: ServiceDeps) {
  const { repos, now } = deps;

  return {
    /**
     * The host's profile, settings, events and the responses to those events. Only data
     * the host already sees in the app: never other hosts' events, and never the secrets
     * that let guests edit their responses.
     */
    async exportData(userId: string) {
      const hits = await repos.rateLimits.hit(`account-export:${userId}`, DAY_MS, now());
      if (hits > LIMITS.accountExportsPerDay) throw new AppError("rate_limited");

      const [user, settings, events] = await Promise.all([
        repos.users.findById(userId),
        repos.userSettings.get(userId),
        repos.events.listByHostWithStats(userId),
      ]);
      if (!user) throw new AppError("not_found");

      const withResponses = await Promise.all(
        events.map(async (event) => {
          const responses = await repos.rsvps.listByEvent(event.id);
          return {
            title: event.title,
            link: event.slug,
            description: event.description,
            hostName: event.hostName,
            startsAt: event.startsAt.toISOString(),
            endsAt: event.endsAt?.toISOString() ?? null,
            timezone: event.timezone,
            status: event.status,
            location: {
              type: event.locationType,
              name: event.locationName,
              address: event.locationAddress,
              onlineUrl: event.onlineUrl,
            },
            theme: event.theme,
            customQuestions: event.customQuestions,
            createdAt: event.createdAt.toISOString(),
            responses: responses.map((response) => ({
              name: response.name,
              status: response.status,
              plusOnes: response.plusOnes,
              phone: response.phone,
              email: response.email,
              message: response.message,
              answers: response.answers,
              submittedAt: response.createdAt.toISOString(),
              updatedAt: response.updatedAt.toISOString(),
            })),
          };
        }),
      );

      return {
        exportedAt: now().toISOString(),
        profile: { name: user.name, email: user.email },
        settings: { emailAlerts: settings.emailAlerts, pushAlerts: settings.pushAlerts },
        events: withResponses,
      };
    },
  };
}

export type AccountService = ReturnType<typeof createAccountService>;
