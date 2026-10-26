"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

type TurnstileApi = {
  render: (
    element: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback"?: () => void;
      appearance?: "always" | "execute" | "interaction-only";
      size?: "normal" | "flexible" | "compact";
    },
  ) => string;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

/**
 * Cloudflare Turnstile bot check. Usually invisible ("interaction-only"): real people
 * never see a puzzle. Renders nothing when no site key is configured.
 */
export function Turnstile({
  siteKey,
  onToken,
}: {
  siteKey: string | undefined;
  onToken: (token: string | null) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!siteKey || !loaded || !container.current || !window.turnstile) return;
    const id = window.turnstile.render(container.current, {
      sitekey: siteKey,
      appearance: "interaction-only",
      size: "flexible",
      callback: (token) => onToken(token),
      "expired-callback": () => onToken(null),
    });
    return () => window.turnstile?.remove(id);
  }, [siteKey, loaded, onToken]);

  if (!siteKey) return null;
  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => setLoaded(true)}
      />
      <div ref={container} />
    </>
  );
}
