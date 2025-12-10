"use client";

import { Controller, useFormContext } from "react-hook-form";
import { Textarea } from "@/components/ui/textarea";
import type { OnboardingFormValues } from "../../schemas/onboarding-form.schema";

interface StepResearchQuestionProps {
  isLoading: boolean;
}

export function StepResearchQuestion({
  isLoading,
}: StepResearchQuestionProps) {
  const { control } = useFormContext<OnboardingFormValues>();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">Je onderzoeksvraag</h2>
        <p className="text-muted-foreground">
          Waar doe je onderzoek naar? Dit helpt ons je beter te ondersteunen
          (optioneel)
        </p>
      </div>
      <fieldset className="space-y-4">
        <Controller
          name="researchQuestion"
          control={control}
          render={({ field, fieldState }) => (
            <div className="space-y-2">
              <label htmlFor="researchQuestion" className="text-sm font-medium">
                Onderzoeksvraag
              </label>
              <Textarea
                {...field}
                id="researchQuestion"
                placeholder="Bijv. Ik onderzoek de ervaringen van zorgverleners met digitale hulpmiddelen..."
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

