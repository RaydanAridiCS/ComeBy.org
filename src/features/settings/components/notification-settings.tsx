"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { LIMITS } from "@/config/limits";
import { updateSettingsAction } from "../actions";

type Mode = "instant" | "daily" | "off";

export function EmailAlertSettings({ initial }: { initial: Mode }) {
  const t = useTranslations("settings");
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-3">
      <p className="font-medium text-sm">{t("emailAlerts")}</p>
      <RadioGroup
        className="grid gap-2 sm:grid-cols-3"
        defaultValue={initial}
        disabled={pending}
        onValueChange={(value) =>
          startTransition(async () => {
            const result = await updateSettingsAction({ emailAlerts: value as Mode });
            if (result.ok) toast.success(t("saved"));
            else toast.error(result.error.message);
          })
        }
      >
        {(
          [
            ["instant", t("emailInstant")],
            ["daily", t("emailDaily")],
            ["off", t("emailOff")],
          ] as const
        ).map(([value, label]) => (
          <label
            key={value}
            className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border bg-card px-3.5 py-2.5 text-sm transition-colors hover:border-input has-data-checked:border-brand-500 has-data-checked:bg-brand-50/60"
          >
            <RadioGroupItem value={value} />
            {label}
          </label>
        ))}
      </RadioGroup>
      <p className="text-muted-foreground text-xs">
        {t("emailInstantHint", { max: LIMITS.instantAlertEmailsPerHostPerDay })}
      </p>
    </div>
  );
}
