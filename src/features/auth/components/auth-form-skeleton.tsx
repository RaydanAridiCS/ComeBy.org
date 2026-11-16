import { Skeleton } from "@/components/ui/skeleton";
import { env } from "@/env";
import { cn } from "@/lib/utils";

/**
 * Stands in for an auth form while it streams in (the forms read the URL, so they render
 * inside <Suspense>). Same shape and heights as the real form, so nothing jumps when it lands.
 */
export function AuthFormSkeleton({
  fields,
  button = "lg",
  google = true,
  footer = true,
}: {
  fields: number;
  /** The size of the form's main button. */
  button?: "lg" | "default";
  /** Whether the form shows "Continue with Google" (when it is configured). */
  google?: boolean;
  /** Whether the form ends with a line of text ("No account? Sign up"). */
  footer?: boolean;
}) {
  return (
    <div className="flex flex-col gap-5" aria-hidden="true">
      {google && env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED ? (
        <>
          <Skeleton className="h-12 w-full rounded-2xl" />
          <Skeleton className="mx-auto h-3 w-8 rounded-full" />
        </>
      ) : null}
      <div className="flex flex-col gap-5">
        {Array.from({ length: fields }, (_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: a fixed list of placeholders
          <div key={index} className="flex flex-col gap-2">
            <Skeleton className="h-4 w-24 rounded-full" />
            <Skeleton className="h-11 w-full sm:h-10" />
          </div>
        ))}
      </div>
      <Skeleton className={cn("w-full", button === "lg" ? "h-12 rounded-2xl" : "h-11 sm:h-10")} />
      {footer ? <Skeleton className="mx-auto h-4 w-48 rounded-full" /> : null}
    </div>
  );
}
