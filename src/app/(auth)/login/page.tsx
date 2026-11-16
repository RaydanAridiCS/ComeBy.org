import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AuthCard } from "@/features/auth/components/auth-card";
import { AuthFormSkeleton } from "@/features/auth/components/auth-form-skeleton";
import { LoginForm } from "@/features/auth/components/login-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("signIn") };
}

export default async function LoginPage() {
  const t = await getTranslations("auth");
  return (
    <AuthCard title={t("signInTitle")} subtitle={t("signInSubtitle")}>
      <Suspense fallback={<AuthFormSkeleton fields={2} />}>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
