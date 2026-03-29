"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { FieldInput } from "@/components/ui/form-fields";
import { signUpEmailSchema } from "@/features/auth/validation/auth.schema";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Controller, useForm } from "react-hook-form";
import type { z } from "zod";

const emailSignUpSchema = signUpEmailSchema.pick({
  name: true,
  email: true,
  password: true,
});

type EmailSignUpValues = z.infer<typeof emailSignUpSchema>;

interface EmailSignUpFormProps {
  onSubmit: (data: EmailSignUpValues) => void;
  onCancel: () => void;
  isLoading: boolean;
  isSigningUp: boolean;
  signUpError: string | undefined;
}

export function EmailSignUpForm({
  onSubmit,
  onCancel,
  isLoading,
  isSigningUp: _isSigningUp,
  signUpError,
}: EmailSignUpFormProps) {
  const t = useTranslations("auth");
  const emailForm = useForm<EmailSignUpValues>({
    resolver: standardSchemaResolver(emailSignUpSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const handleCancel = () => {
    onCancel();
    emailForm.reset();
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      <Form {...emailForm}>
        <form onSubmit={emailForm.handleSubmit(onSubmit)}>
          <fieldset disabled={isLoading}>
            <FieldGroup>
              <legend className="sr-only">{t("emailSignUpLegend")}</legend>

              {signUpError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{t("errorTitle")}</AlertTitle>
                  <AlertDescription>{signUpError}</AlertDescription>
                </Alert>
              )}

              <Controller
                control={emailForm.control}
                name="name"
                render={({ field, fieldState }) => (
                  <FieldInput
                    label={t("nameLabel")}
                    field={field}
                    fieldState={fieldState}
                    type="text"
                    placeholder={t("namePlaceholder")}
                    autoComplete="name"
                    autoFocus
                  />
                )}
              />

              <Controller
                control={emailForm.control}
                name="email"
                render={({ field, fieldState }) => (
                  <FieldInput
                    label={t("emailLabel")}
                    field={field}
                    fieldState={fieldState}
                    type="email"
                    placeholder={t("emailPlaceholder")}
                    autoComplete="email"
                  />
                )}
              />

              <Controller
                control={emailForm.control}
                name="password"
                render={({ field, fieldState }) => (
                  <FieldInput
                    label={t("passwordLabel")}
                    description={t("passwordMinLength")}
                    field={field}
                    fieldState={fieldState}
                    type="password"
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                )}
              />

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleCancel}
                  disabled={isLoading}
                  className="flex-1"
                >
                  {t("cancel")}
                </Button>
                <Button type="submit" className="flex-1" disabled={isLoading}>
                  {t("register")}
                </Button>
              </div>
            </FieldGroup>
          </fieldset>
        </form>
      </Form>
    </div>
  );
}
