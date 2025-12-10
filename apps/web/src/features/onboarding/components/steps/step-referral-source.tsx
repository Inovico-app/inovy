"use client";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import type { OnboardingFormValues } from "../../schemas/onboarding-form.schema";

interface StepReferralSourceProps {
  isLoading: boolean;
}

const referralSourceOptions = [
  { label: "Google zoeken", value: "google" },
  { label: "LinkedIn", value: "linkedin" },
  { label: "Instagram", value: "instagram" },
  { label: "Doorverwijzing", value: "referral" },
  { label: "Advertentie", value: "advertisement" },
  { label: "Evenement", value: "event" },
  { label: "Anders", value: "other" },
];

export function StepReferralSource({ isLoading }: StepReferralSourceProps) {
  const referralSource = useWatch({ name: "referralSource" });
  const { control } = useFormContext<OnboardingFormValues>();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">Hoe heb je over ons gehoord?</h2>
        <p className="text-muted-foreground">
          Dit helpt ons om onze marketing te verbeteren.
        </p>
      </div>
      <div className="space-y-4">
        <Controller
          name="referralSource"
          control={control}
          render={({ field, fieldState }) => (
            <fieldset className="space-y-4">
              <legend className="text-sm font-medium">Bron (optioneel)</legend>
              <p className="text-sm text-muted-foreground">
                Kies een bron of vul een andere bron in.
              </p>
              <RadioGroup
                name={field.name}
                value={field.value}
                onValueChange={field.onChange}
                aria-invalid={fieldState.invalid}
              >
                <div className="space-y-3">
                  {referralSourceOptions.map((option) => (
                    <label
                      key={option.value}
                      htmlFor={`form-rhf-radiogroup-${option.value}`}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <RadioGroupItem
                        id={`form-rhf-radiogroup-${option.value}`}
                        value={option.value}
                        aria-invalid={fieldState.invalid}
                      />
                      <span className="text-sm font-medium">
                        {option.label}
                      </span>
                    </label>
                  ))}
                </div>
              </RadioGroup>
              {fieldState.invalid && fieldState.error && (
                <p className="text-sm text-destructive">
                  {fieldState.error.message}
                </p>
              )}
            </fieldset>
          )}
        />
        {referralSource === "other" && (
          <Controller
            name="referralSourceOther"
            control={control}
            render={({ field, fieldState }) => (
              <div className="space-y-2">
                <label
                  htmlFor="referralSourceOther"
                  className="text-sm font-medium"
                >
                  Vertel ons meer (optioneel)
                </label>
                <Textarea
                  {...field}
                  value={field.value ?? ""}
                  id="referralSourceOther"
                  placeholder="Bijv. Via een vriend, een blogpost, een podcast..."
                  disabled={isLoading}
                  rows={3}
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
        )}
      </div>
    </div>
  );
}

