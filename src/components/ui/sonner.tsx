"use client";

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

/**
 * Sonner's own gaps from the screen edge (24 px, 16 px on phones), plus the safe areas. Under
 * a sticky header the top gap clears it instead: the dashboard header is 68 px tall
 * (0.75rem above a 3.5rem bar), and a toast over it would hide the menu.
 */
function edgeOffset(gap: number, belowHeader: boolean) {
  return {
    top: belowHeader ? "calc(76px + var(--safe-top))" : `calc(${gap}px + var(--safe-top))`,
    right: `calc(${gap}px + var(--safe-right))`,
    bottom: `calc(${gap}px + var(--safe-bottom))`,
    left: `calc(${gap}px + var(--safe-left))`,
  };
}

/** Toasts are light-only, like the rest of the app (there is no dark mode yet). */
const Toaster = ({ belowHeader = false, ...props }: ToasterProps & { belowHeader?: boolean }) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      offset={edgeOffset(24, belowHeader)}
      mobileOffset={edgeOffset(16, belowHeader)}
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
