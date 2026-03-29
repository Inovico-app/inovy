"use client";

import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { FieldInput } from "@/components/ui/form-fields";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useProjectTeamPicker } from "@/features/projects/hooks/use-project-team-picker";
import { TeamPicker } from "@/features/teams/components/team-picker";
import { PROJECT_DESCRIPTION_MAX_LENGTH } from "@/lib/constants/project-constants";
import {
  updateProjectSchema,
  type UpdateProjectInput,
} from "@/server/validation/projects/update-project";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { updateProjectAction } from "../actions/update-project";

interface EditProjectFormProps {
  projectId: string;
  initialData: {
    name: string;
    description: string | null;
    teamId?: string | null;
  };
  onSuccess?: () => void;
}

export function EditProjectForm({
  projectId,
  initialData,
  onSuccess,
}: EditProjectFormProps) {
  const router = useRouter();
  const t = useTranslations("projects");
  const tc = useTranslations("common");
  const { teams, isLoading: isLoadingTeams } = useProjectTeamPicker();

  const form = useForm<UpdateProjectInput>({
    resolver: standardSchemaResolver(updateProjectSchema),
    defaultValues: {
      projectId,
      name: initialData.name,
      description: initialData.description ?? "",
      teamId: initialData.teamId ?? null,
    },
    mode: "onChange",
  });

  const { execute, isExecuting } = useAction(updateProjectAction, {
    onSuccess: () => {
      toast.success(t("projectUpdatedSuccess"));
      router.refresh();
      onSuccess?.();
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? t("updateProjectError"));
    },
  });

  const handleSubmit = (data: UpdateProjectInput) => {
    execute({
      projectId,
      name: data.name.trim(),
      description: data.description?.trim() || undefined,
      teamId: data.teamId ?? null,
    });
  };

  const description = form.watch("description") ?? "";
  const teamIdValue = form.watch("teamId") ?? null;
  const descriptionLength = description.length;
  const descriptionCounterColor =
    descriptionLength >= PROJECT_DESCRIPTION_MAX_LENGTH
      ? "text-red-500"
      : descriptionLength >= PROJECT_DESCRIPTION_MAX_LENGTH - 100
        ? "text-yellow-500"
        : "text-muted-foreground";

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <FieldGroup>
          <Controller
            control={form.control}
            name="name"
            render={({ field, fieldState }) => (
              <FieldInput
                label={
                  <>
                    {t("projectName")} <span className="text-red-500">*</span>
                  </>
                }
                field={field}
                fieldState={fieldState}
                placeholder={t("projectNamePlaceholder")}
                disabled={isExecuting}
              />
            )}
          />

          <Controller
            control={form.control}
            name="description"
            render={({ field, fieldState }) => (
              <Field data-invalid={!!fieldState.error || undefined}>
                <FieldLabel htmlFor={field.name}>{t("description")}</FieldLabel>
                <Textarea
                  id={field.name}
                  aria-invalid={!!fieldState.error || undefined}
                  placeholder={t("descriptionPlaceholder")}
                  disabled={isExecuting}
                  rows={3}
                  maxLength={PROJECT_DESCRIPTION_MAX_LENGTH}
                  {...field}
                  value={field.value ?? ""}
                />
                <p
                  className={`text-right text-xs ${descriptionCounterColor}`}
                  aria-live="polite"
                >
                  {descriptionLength} / {PROJECT_DESCRIPTION_MAX_LENGTH}
                </p>
                {fieldState.error && (
                  <FieldError>{fieldState.error.message}</FieldError>
                )}
              </Field>
            )}
          />

          {!isLoadingTeams && teams.length > 0 && (
            <Controller
              control={form.control}
              name="teamId"
              render={({ field: _field, fieldState }) => (
                <Field data-invalid={!!fieldState.error || undefined}>
                  <TeamPicker
                    teams={teams}
                    value={teamIdValue}
                    onChange={(id) => form.setValue("teamId", id)}
                  />
                  {fieldState.error && (
                    <FieldError>{fieldState.error.message}</FieldError>
                  )}
                </Field>
              )}
            />
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onSuccess}
              disabled={isExecuting}
            >
              {tc("cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isExecuting || !form.formState.isValid}
            >
              {isExecuting && (
                <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
              )}
              {t("saveChanges")}
            </Button>
          </div>
        </FieldGroup>
      </form>
    </Form>
  );
}
