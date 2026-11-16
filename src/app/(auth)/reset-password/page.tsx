import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AuthCard } from "@/features/auth/components/auth-card";
import { AuthFormSkeleton } from "@/features/auth/components/auth-form-skeleton";
import { ResetPasswordForm } from "@/features/auth/components/password-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("resetTitle") };
}

export default async function ResetPasswordPage() {
  const t = await getTranslations("auth");
  return (
    <AuthCard title={t("resetTitle")}>
      <Suspense fallback={<AuthFormSkeleton fields={1} hint google={false} footer={false} />}>
        <ResetPasswordForm />
      </Suspense>
    </AuthCard>
  );
}
