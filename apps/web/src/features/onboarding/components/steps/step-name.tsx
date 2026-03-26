"use client";

import { Input } from "@/components/ui/input";
import { useTranslations } from "next-intl";
import { Controller, useFormContext } from "react-hook-form";
import type { OnboardingFormValues } from "../../schemas/onboarding-form.schema";

interface StepNameProps {
  isLoading: boolean;
}

export function StepName({ isLoading }: StepNameProps) {
  const t = useTranslations("onboarding");
  const { control } = useFormContext<OnboardingFormValues>();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-foreground">
          {t("stepNameTitle")}
        </h1>
        <p className="text-muted-foreground">{t("stepNameSubtitle")}</p>
      </div>
      <fieldset className="space-y-4">
        <Controller
          name="name"
          control={control}
          render={({ field, fieldState }) => (
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                {t("stepNameLabel")}
              </label>
              <Input
                {...field}
                id="name"
                type="text"
                placeholder={t("stepNamePlaceholder")}
                disabled={isLoading}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && fieldState.error && (
                <p className="text-sm text-destructive">
                  {fieldState.error.message}
                </p>
              )}
            </div>
          )}
        />
      </fieldset>
    </div>
  );
}
