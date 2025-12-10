"use client";

import { Building, User } from "lucide-react";
import { Controller, useFormContext } from "react-hook-form";
import type { OnboardingFormValues } from "../../schemas/onboarding-form.schema";

export function StepAccountType() {
  const { control, watch } = useFormContext<OnboardingFormValues>();
  const name = watch("name");

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">Hallo {name || "there"}!</h2>
        <p className="text-muted-foreground">
          Gebruik je Inovy als individu of namens een organisatie?
        </p>
      </div>
      <fieldset className="space-y-4">
        <legend className="text-sm font-medium">Account type</legend>
        <Controller
          name="signupType"
          control={control}
          render={({ field, fieldState }) => (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => {
                    field.onChange("individual");
                  }}
                  className={`p-6 rounded-lg border-2 transition-all text-left ${
                    field.value === "individual"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="space-y-2">
                    <User className="size-8 text-primary" />
                    <h3 className="font-semibold">Individueel</h3>
                    <p className="text-sm text-muted-foreground">
                      Voor persoonlijk gebruik
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    field.onChange("organization");
                  }}
                  className={`p-6 rounded-lg border-2 transition-all text-left ${
                    field.value === "organization"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="space-y-2">
                    <Building className="size-8 text-primary" />
                    <h3 className="font-semibold">Organisatie</h3>
                    <p className="text-sm text-muted-foreground">
                      Voor teams en organisaties
                    </p>
                  </div>
                </button>
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

