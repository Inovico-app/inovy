"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { FieldInput } from "@/components/ui/form-fields";
import { Input } from "@/components/ui/input";
import { updateProfile } from "@/features/settings/actions/update-profile";
import {
  profileFormSchema,
  type ProfileFormValues,
} from "@/features/settings/validation/profile.schema";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { Loader2Icon } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { Controller, useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

interface ProfileFormProps {
  initialGivenName: string;
  initialFamilyName: string;
  email: string;
}

export function ProfileForm({
  initialGivenName,
  initialFamilyName,
  email,
}: ProfileFormProps) {
  const t = useTranslations("settings.profile");
  const form = useForm<ProfileFormValues>({
    resolver: standardSchemaResolver(profileFormSchema),
    defaultValues: {
      givenName: initialGivenName,
      familyName: initialFamilyName,
    },
  });

  const { execute, isExecuting } = useAction(updateProfile, {
    onSuccess: () => {
      toast.success(t("profileUpdated"));
      form.reset(form.getValues());
    },
    onError: ({ error }) => {
      const message = error.serverError || t("profileUpdateFailed");
      toast.error(message);
    },
  });

  function onSubmit(values: ProfileFormValues) {
    execute({
      given_name: values.givenName ?? "",
      family_name: values.familyName ?? "",
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">
          {t("personalInformation")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              <Controller
                control={form.control}
                name="givenName"
                render={({ field, fieldState }) => (
                  <FieldInput
                    label={t("firstName")}
                    field={field}
                    fieldState={fieldState}
                    placeholder={t("firstNamePlaceholder")}
                    disabled={isExecuting}
                  />
                )}
              />

              <Controller
                control={form.control}
                name="familyName"
                render={({ field, fieldState }) => (
                  <FieldInput
                    label={t("lastName")}
                    field={field}
                    fieldState={fieldState}
                    placeholder={t("lastNamePlaceholder")}
                    disabled={isExecuting}
                  />
                )}
              />

              <Field>
                <FieldLabel>{t("email")}</FieldLabel>
                <Input value={email} disabled className="bg-muted" />
                <FieldDescription className="text-xs">
                  {t("emailCannotBeChanged")}
                </FieldDescription>
              </Field>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  disabled={isExecuting || !form.formState.isDirty}
                >
                  {isExecuting && (
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save Changes
                </Button>
              </div>
            </FieldGroup>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
