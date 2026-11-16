import type { ReactNode } from "react";
import { bricolageLazy } from "@/app/brand-font-lazy";
import { Logo } from "@/components/brand/logo";

/**
 * A whole-page frame for a `StatusMessage` shown outside the dashboard: the logo, the
 * brand heading font and the soft brand glow. It uses the font without a preload
 * (`brand-font-lazy.ts`), so the invite page a guest opens never downloads it.
 */
export function StatusPage({ children }: { children: ReactNode }) {
  return (
    <main
      className={`${bricolageLazy.variable} flex flex-1 flex-col items-center justify-center gap-6 bg-[radial-gradient(60%_50%_at_50%_30%,var(--brand-50),transparent_70%)] px-5 py-20 text-center`}
    >
      <Logo className="mb-6" />
      {children}
    </main>
  );
}
