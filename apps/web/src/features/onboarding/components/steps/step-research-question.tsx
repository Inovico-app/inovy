"use client";

import { Textarea } from "@/components/ui/textarea";
import { useTranslations } from "next-intl";
import { Controller, useFormContext } from "react-hook-form";
import type { OnboardingFormValues } from "../../schemas/onboarding-form.schema";

interface StepResearchQuestionProps {
  isLoading: boolean;
}

export function StepResearchQuestion({ isLoading }: StepResearchQuestionProps) {
  const t = useTranslations("onboarding");
  const { control } = useFormContext<OnboardingFormValues>();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">
          {t("stepResearchQuestionTitle")}
        </h2>
        <p className="text-muted-foreground">
          {t("stepResearchQuestionSubtitle")}
        </p>
      </div>
      <fieldset className="space-y-4">
        <Controller
          name="researchQuestion"
          control={control}
          render={({ field, fieldState }) => (
            <div className="space-y-2">
              <label htmlFor="researchQuestion" className="text-sm font-medium">
                {t("stepResearchQuestionLabel")}
              </label>
              <Textarea
                {...field}
                id="researchQuestion"
                placeholder={t("stepResearchQuestionPlaceholder")}
                disabled={isLoading}
                className="min-h-32"
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
