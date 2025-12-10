"use client";

import { Controller, useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import type { OnboardingFormValues } from "../../schemas/onboarding-form.schema";

interface StepNameProps {
  isLoading: boolean;
}

export function StepName({ isLoading }: StepNameProps) {
  const { control } = useFormContext<OnboardingFormValues>();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-foreground">
          Welkom bij Inovy!
        </h1>
        <p className="text-muted-foreground">
          Laten we beginnen met kennismaken. Hoe mogen we je noemen?
        </p>
      </div>
      <fieldset className="space-y-4">
        <Controller
          name="name"
          control={control}
          render={({ field, fieldState }) => (
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Je naam
              </label>
              <Input
                {...field}
                id="name"
                type="text"
                placeholder="Bijv. Jan Jansen"
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

