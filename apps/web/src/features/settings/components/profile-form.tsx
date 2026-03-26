"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { updateProfile } from "@/features/settings/actions/update-profile";
import {
  profileFormSchema,
  type ProfileFormValues,
} from "@/features/settings/validation/profile.schema";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { Loader2Icon } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useForm } from "react-hook-form";
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="givenName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("firstName")}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={t("firstNamePlaceholder")}
                      disabled={isExecuting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="familyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("lastName")}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={t("lastNamePlaceholder")}
                      disabled={isExecuting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormItem>
              <FormLabel>{t("email")}</FormLabel>
              <Input value={email} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">
                {t("emailCannotBeChanged")}
              </p>
            </FormItem>

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
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
