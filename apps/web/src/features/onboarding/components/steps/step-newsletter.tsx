"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { Controller, useFormContext } from "react-hook-form";
import type { OnboardingFormValues } from "../../schemas/onboarding-form.schema";

interface StepNewsletterProps {
  isLoading: boolean;
}

export function StepNewsletter({ isLoading }: StepNewsletterProps) {
  const t = useTranslations("onboarding");
  const { control } = useFormContext<OnboardingFormValues>();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex justify-center mb-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h2 className="text-2xl font-semibold text-center">
          {t("stepNewsletterTitle")}
        </h2>
        <p className="text-muted-foreground text-center">
          {t("stepNewsletterSubtitle")}
        </p>
      </div>
      <fieldset className="space-y-4">
        <Controller
          name="newsletterOptIn"
          control={control}
          render={({ field, fieldState }) => (
            <div className="flex items-start gap-3 space-y-0">
              <Checkbox
                id="newsletterOptIn"
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
                disabled={isLoading}
              />
              <label
                htmlFor="newsletterOptIn"
                className="text-sm font-normal cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {t("stepNewsletterLabel")}
              </label>
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
