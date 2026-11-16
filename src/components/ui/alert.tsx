import { cva, type VariantProps } from "class-variance-authority";
import { CircleAlert, Info } from "lucide-react";
import type * as React from "react";
import { cn } from "@/lib/utils";

/**
 * A notice inside a form or card. Two kinds you can tell apart without reading them:
 * `default` is neutral news (soft brand tint, an "i"), `destructive` is a problem (soft red
 * tint, an "!"). Problems are announced at once (role="alert"); news politely (role="status").
 */
const alertVariants = cva(
  "group/alert relative grid w-full gap-0.5 rounded-xl border px-3.5 py-3 text-start text-sm has-data-[slot=alert-action]:relative has-data-[slot=alert-action]:pe-18 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2.5 *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "border-brand-100 bg-brand-50/70 text-brand-900 *:[svg]:text-brand-700 *:data-[slot=alert-description]:text-brand-900/85",
        destructive:
          "border-danger/20 bg-danger-soft text-danger-ink *:[svg]:text-danger-ink *:data-[slot=alert-description]:text-danger-ink",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Alert({
  className,
  variant,
  icon = true,
  children,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof alertVariants> & {
    /** Show the kind's icon (an "i" or an "!"). */
    icon?: boolean;
  }) {
  const Icon = variant === "destructive" ? CircleAlert : Info;
  return (
    <div
      data-slot="alert"
      role={variant === "destructive" ? "alert" : "status"}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      {icon ? <Icon aria-hidden="true" /> : null}
      {children}
    </div>
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "font-semibold group-has-[>svg]/alert:col-start-2 [&_a]:underline [&_a]:underline-offset-3",
        className,
      )}
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-sm text-pretty group-has-[>svg]/alert:col-start-2 [&_a]:font-medium [&_a]:underline [&_a]:underline-offset-3 [&_p:not(:last-child)]:mb-4",
        className,
      )}
      {...props}
    />
  );
}

function AlertAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="alert-action" className={cn("absolute top-2 end-2", className)} {...props} />
  );
}

export { Alert, AlertTitle, AlertDescription, AlertAction };
