"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { magicLinkSchema } from "@/features/auth/validation/auth.schema";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
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
        <form
          onSubmit={magicLinkForm.handleSubmit(handleSubmit)}
          className="space-y-4"
        >
          <fieldset className="space-y-4" disabled={isLoading}>
            <legend className="sr-only">{t("magicLinkLegend")}</legend>

            {magicLinkError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t("errorTitle")}</AlertTitle>
                <AlertDescription>{magicLinkError}</AlertDescription>
              </Alert>
            )}

            <FormField
              control={magicLinkForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("emailLabel")}</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder={t("emailPlaceholder")}
                      disabled={isLoading}
                      autoFocus
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    {t("magicLinkHint")}
                  </p>
                  <FormMessage />
                </FormItem>
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
          </fieldset>
        </form>
      </Form>
    </div>
  );
}
