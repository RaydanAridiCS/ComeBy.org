"use client";

import { BellOff, BellRing } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { env } from "@/env";
import { removePushSubscriptionAction, savePushSubscriptionAction } from "../actions";

type PushState = "loading" | "unsupported" | "not-configured" | "denied" | "off" | "on";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  return (
    (await navigator.serviceWorker.getRegistration("/")) ??
    navigator.serviceWorker.register("/sw.js", { scope: "/" })
  );
}

/** Turns push notifications on or off for this browser/device. */
export function PushSettings() {
  const t = useTranslations("settings");
  const [state, setState] = useState<PushState>("loading");
  const [pending, startTransition] = useTransition();
  const publicKey = env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    if (!publicKey) return setState("not-configured");
    if (!("serviceWorker" in navigator) || !("PushManager" in window))
      return setState("unsupported");
    if (Notification.permission === "denied") return setState("denied");
    void (async () => {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      setState(subscription ? "on" : "off");
    })();
  }, []);

  const enable = () =>
    startTransition(async () => {
      if (!publicKey) return;
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return setState("denied");
      const registration = await getRegistration();
      await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const result = await savePushSubscriptionAction(subscription.toJSON());
      if (!result.ok) return void toast.error(result.error.message);
      setState("on");
      toast.success(t("pushEnabled"));
    });

  const disable = () =>
    startTransition(async () => {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await removePushSubscriptionAction(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setState("off");
    });

  const message: Partial<Record<PushState, string>> = {
    unsupported: t("pushUnsupported"),
    "not-configured": t("pushNotConfigured"),
    denied: t("pushDenied"),
    on: t("pushEnabled"),
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="font-medium text-sm">{t("pushAlerts")}</p>
        <p className="text-muted-foreground text-sm">{t("pushBody")}</p>
      </div>
      {state === "off" ? (
        <Button
          variant="outline"
          size="sm"
          className="self-start"
          disabled={pending}
          onClick={enable}
        >
          <BellRing />
          {t("pushEnable")}
        </Button>
      ) : null}
      {state === "on" ? (
        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          disabled={pending}
          onClick={disable}
        >
          <BellOff />
          {t("pushDisable")}
        </Button>
      ) : null}
      {message[state] ? <p className="text-muted-foreground text-sm">{message[state]}</p> : null}
    </div>
  );
}
