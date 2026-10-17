import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AuthCard } from "@/features/auth/components/auth-card";
import { SignupForm } from "@/features/auth/components/signup-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("signUp") };
}

export default async function SignupPage() {
  const t = await getTranslations("auth");
  return (
    <AuthCard title={t("signUpTitle")} subtitle={t("signUpSubtitle")}>
      <Suspense>
        <SignupForm />
      </Suspense>
    </AuthCard>
  );
}
