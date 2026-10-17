import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AuthCard } from "@/features/auth/components/auth-card";
import { ResetPasswordForm } from "@/features/auth/components/password-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("resetTitle") };
}

export default async function ResetPasswordPage() {
  const t = await getTranslations("auth");
  return (
    <AuthCard title={t("resetTitle")}>
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </AuthCard>
  );
}
