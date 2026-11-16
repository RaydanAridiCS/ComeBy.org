"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

export function DeleteAccount() {
  const t = useTranslations();
  const router = useRouter();
  const [confirmation, setConfirmation] = useState("");
  const word = t("settings.deleteConfirmWord");

  return (
    <ConfirmDialog
      trigger={
        <Button variant="destructive" size="sm" className="self-start">
          {t("settings.deleteAccount")}
        </Button>
      }
      onOpenChange={(open) => !open && setConfirmation("")}
      variant="destructive"
      title={t("settings.deleteConfirmTitle")}
      description={t("settings.deleteConfirmBody")}
      confirmLabel={t("settings.deleteAccount")}
      confirmDisabled={confirmation.trim() !== word}
      onConfirm={async () => {
        const { error } = await authClient.deleteUser();
        if (error) return { ok: false, message: t("common.somethingWentWrong") };
        toast.success(t("settings.deleted"));
        router.replace("/");
        router.refresh();
        return { ok: true };
      }}
    >
      {/* No placeholder: the word in the box would look already typed. */}
      <Field>
        <FieldLabel htmlFor="delete-confirmation">
          {t("settings.deleteConfirmLabel", { word })}
        </FieldLabel>
        <Input
          id="delete-confirmation"
          value={confirmation}
          autoComplete="off"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          onChange={(event) => setConfirmation(event.target.value)}
        />
      </Field>
    </ConfirmDialog>
  );
}
