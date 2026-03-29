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

type MagicLinkFormValues = z.infer<typeof magicLinkSchema>;

interface MagicLinkSignInFormProps {
  onSubmit: (data: MagicLinkFormValues) => void;
  onCancel: () => void;
  isLoading: boolean;
  isSendingMagicLink: boolean;
  magicLinkError: string | undefined;
}

export function MagicLinkSignInForm({
  onSubmit,
  onCancel,
  isLoading,
  isSendingMagicLink: _isSendingMagicLink,
  magicLinkError,
}: MagicLinkSignInFormProps) {
  const t = useTranslations("auth");
  const magicLinkForm = useForm<MagicLinkFormValues>({
    resolver: standardSchemaResolver(magicLinkSchema),
    defaultValues: {
      email: "",
    },
  });

  const handleSubmit = (data: MagicLinkFormValues) => {
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
              <legend className="sr-only">{t("magicLinkLegend")}</legend>

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
                    description={t("magicLinkHint")}
                    field={field}
                    fieldState={fieldState}
                    type="email"
                    placeholder={t("emailPlaceholder")}
                    disabled={isLoading}
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
