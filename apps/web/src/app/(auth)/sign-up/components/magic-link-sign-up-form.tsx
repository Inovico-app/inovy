"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { FieldInput } from "@/components/ui/form-fields";
import { magicLinkSchema } from "@/features/auth/validation/auth.schema";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Controller, useForm } from "react-hook-form";
import type { z } from "zod";

type MagicLinkValues = z.infer<typeof magicLinkSchema>;

interface MagicLinkSignUpFormProps {
  onSubmit: (data: MagicLinkValues) => void;
  onCancel: () => void;
  isLoading: boolean;
  isSendingMagicLink: boolean;
  magicLinkError: string | undefined;
}

export function MagicLinkSignUpForm({
  onSubmit,
  onCancel,
  isLoading,
  isSendingMagicLink: _isSendingMagicLink,
  magicLinkError,
}: MagicLinkSignUpFormProps) {
  const t = useTranslations("auth");
  const magicLinkForm = useForm<MagicLinkValues>({
    resolver: standardSchemaResolver(magicLinkSchema),
    defaultValues: {
      email: "",
    },
  });

  const handleSubmit = (data: MagicLinkValues) => {
    onSubmit(data);
    magicLinkForm.reset();
  };

  const handleCancel = () => {
    onCancel();
    magicLinkForm.reset();
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      <Form {...magicLinkForm}>
        <form onSubmit={magicLinkForm.handleSubmit(handleSubmit)}>
          <fieldset disabled={isLoading}>
            <FieldGroup>
              <legend className="sr-only">{t("magicLinkSignUpLegend")}</legend>

              {magicLinkError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{t("errorTitle")}</AlertTitle>
                  <AlertDescription>{magicLinkError}</AlertDescription>
                </Alert>
              )}

              <Controller
                control={magicLinkForm.control}
                name="email"
                render={({ field, fieldState }) => (
                  <FieldInput
                    label={t("emailLabel")}
                    description={t("magicLinkSignUpHint")}
                    field={field}
                    fieldState={fieldState}
                    type="email"
                    placeholder={t("emailPlaceholder")}
                    autoFocus
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
                  {t("send")}
                </Button>
              </div>
            </FieldGroup>
          </fieldset>
        </form>
      </Form>
    </div>
  );
}
