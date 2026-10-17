/// <reference lib="webworker" />

/*
 * Comeby service worker: shows push notifications for new responses and opens the
 * right dashboard page when one is tapped. Built to /public/sw.js by `npm run build:sw`.
 */

declare const self: ServiceWorkerGlobalScope;

type PushPayload = { title: string; body: string; url: string; tag?: string };

function isPushPayload(value: unknown): value is PushPayload {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.title === "string" &&
    typeof candidate.body === "string" &&
    typeof candidate.url === "string"
  );
}

self.addEventListener("install", () => {
  void self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload: unknown;
  try {
    payload = event.data?.json();
  } catch {
    return;
  }
  if (!isPushPayload(payload)) return;
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icon-192.png",
      badge: "/badge-72.png",
      tag: payload.tag,
      data: { url: payload.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data as { url?: unknown } | undefined;
  const path = typeof data?.url === "string" && data.url.startsWith("/") ? data.url : "/dashboard";
  const target = new URL(path, self.location.origin).href;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windows) {
        if ("focus" in client) {
          await client.navigate(target);
          await client.focus();
          return;
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});

export {};
