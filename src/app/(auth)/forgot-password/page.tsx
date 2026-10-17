import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthCard } from "@/features/auth/components/auth-card";
import { ForgotPasswordForm } from "@/features/auth/components/password-forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("forgotTitle") };
}

export default async function ForgotPasswordPage() {
  const t = await getTranslations("auth");
  return (
    <AuthCard title={t("forgotTitle")} subtitle={t("forgotSubtitle")}>
      <ForgotPasswordForm />
    </AuthCard>
  );
}
