"use client";

import { Input } from "@/components/ui/input";
import { useTranslations } from "next-intl";
import { Controller, useFormContext } from "react-hook-form";
import type { OnboardingFormValues } from "../../schemas/onboarding-form.schema";

interface StepOrganizationNameProps {
  isLoading: boolean;
}

export function StepOrganizationName({ isLoading }: StepOrganizationNameProps) {
  const t = useTranslations("onboarding");
  const { control } = useFormContext<OnboardingFormValues>();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">{t("stepOrgNameTitle")}</h2>
        <p className="text-muted-foreground">{t("stepOrgNameSubtitle")}</p>
      </div>
      <fieldset className="space-y-4">
        <Controller
          name="organizationName"
          control={control}
          render={({ field, fieldState }) => (
            <div className="space-y-2">
              <label htmlFor="organizationName" className="text-sm font-medium">
                {t("stepOrgNameLabel")}
              </label>
              <Input
                {...field}
                id="organizationName"
                type="text"
                placeholder={t("stepOrgNamePlaceholder")}
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
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-start gap-3">
          <p className="text-sm text-foreground">{t("stepOrgNameWelcome")}</p>
        </div>
      </div>
    </div>
  );
}
