"use client";

import { useTranslations } from "next-intl";
import { Controller, useFormContext } from "react-hook-form";
import type { OnboardingFormValues } from "../../schemas/onboarding-form.schema";

interface StepOrganizationSizeProps {
  isLoading: boolean;
}

export function StepOrganizationSize({ isLoading }: StepOrganizationSizeProps) {
  const t = useTranslations("onboarding");
  const { control, watch } = useFormContext<OnboardingFormValues>();
  const organizationName = watch("organizationName");

  const options = [
    { label: t("stepOrgSizeOption1"), value: 5 },
    { label: t("stepOrgSizeOption2"), value: 30 },
    { label: t("stepOrgSizeOption3"), value: 125 },
    { label: t("stepOrgSizeOption4"), value: 350 },
    { label: t("stepOrgSizeOption5"), value: 500 },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">{t("stepOrgSizeTitle")}</h2>
        <p className="text-muted-foreground">
          {organizationName
            ? t("stepOrgSizeSubtitle", { organizationName })
            : t("stepOrgSizeSubtitleDefault")}
        </p>
      </div>
      <fieldset className="space-y-4">
        <legend className="text-sm font-medium">
          {t("stepOrgSizeLegend")}
        </legend>
        <Controller
          name="orgSize"
          control={control}
          render={({ field, fieldState }) => (
            <div className="space-y-4">
              <div className="space-y-3">
                {options.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => field.onChange(option.value)}
                    disabled={isLoading}
                    className={`w-full rounded-lg border-2 p-4 text-left transition-all ${
                      field.value === option.value
                        ? "border-primary bg-primary/10"
                        : "border-border bg-background hover:border-primary/50"
                    }`}
                  >
                    <span className="text-foreground">{option.label}</span>
                  </button>
                ))}
              </div>
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
