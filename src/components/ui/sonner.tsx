"use client";

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

/** Sonner's own gaps from the screen edge (24 px, 16 px on phones), plus the safe areas. */
function edgeOffset(gap: number) {
  return {
    top: `calc(${gap}px + var(--safe-top))`,
    right: `calc(${gap}px + var(--safe-right))`,
    bottom: `calc(${gap}px + var(--safe-bottom))`,
    left: `calc(${gap}px + var(--safe-left))`,
  };
}

/** Toasts are light-only, like the rest of the app (there is no dark mode yet). */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      offset={edgeOffset(24)}
      mobileOffset={edgeOffset(16)}
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
