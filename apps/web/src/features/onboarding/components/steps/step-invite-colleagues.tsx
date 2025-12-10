"use client";

import { Textarea } from "@/components/ui/textarea";
import { Controller, useFormContext } from "react-hook-form";
import type { OnboardingFormValues } from "../../schemas/onboarding-form.schema";

interface StepInviteColleaguesProps {
  isLoading: boolean;
}

export function StepInviteColleagues({ isLoading }: StepInviteColleaguesProps) {
  const { control } = useFormContext<OnboardingFormValues>();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">Nodig collega's uit</h2>
        <p className="text-muted-foreground">
          Wil je direct collega's uitnodigen? Voer hun email adressen in
          (gescheiden door komma's)
        </p>
      </div>
      <fieldset className="space-y-4">
        <Controller
          name="inviteEmails"
          control={control}
          render={({ field, fieldState }) => (
            <div className="space-y-2">
              <label htmlFor="inviteEmails" className="text-sm font-medium">
                Email adressen (optioneel)
              </label>
              <Textarea
                {...field}
                id="inviteEmails"
                placeholder="jan@voorbeeld.nl, lisa@voorbeeld.nl"
                disabled={isLoading}
                rows={6}
                className="resize-none"
                aria-invalid={fieldState.invalid}
              />
              <p className="text-sm text-muted-foreground">
                Je kunt email adressen scheiden met komma's of op een nieuwe
                regel plaatsen. Bijvoorbeeld: jan@voorbeeld.nl,
                lisa@voorbeeld.nl
              </p>
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

