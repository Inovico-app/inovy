"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { FieldInput } from "@/components/ui/form-fields";
import { Textarea } from "@/components/ui/textarea";
import { createProjectAction } from "@/features/projects/actions/create-project";
import { useProjectTeamPicker } from "@/features/projects/hooks/use-project-team-picker";
import { TeamPicker } from "@/features/teams/components/team-picker";
import { PROJECT_DESCRIPTION_MAX_LENGTH } from "@/lib/constants/project-constants";
import {
  createProjectSchema,
  type CreateProjectInput,
} from "@/server/validation/projects/create-project";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useAction } from "next-safe-action/hooks";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

interface CreateProjectFormProps {
  /**
   * Optional callback invoked when project is successfully created.
   * Receives the created project ID. If provided, navigation will be handled by the caller.
   */
  onSuccess?: (projectId: string) => void;
  /**
   * Whether to show the card wrapper. Defaults to true for backward compatibility.
   */
  showCard?: boolean;
}

/**
 * Smart project creation form using the new Result-based error handling
 * Demonstrates clean error handling without custom error classes
 */
export function CreateProjectForm({
  onSuccess,
  showCard = true,
}: CreateProjectFormProps = {}) {
  const router = useRouter();
  const t = useTranslations("projects");
  const { teams, isLoading: isLoadingTeams } = useProjectTeamPicker();

  const form = useForm<CreateProjectInput>({
    resolver: standardSchemaResolver(createProjectSchema),
    defaultValues: {
      name: "",
      description: "",
      teamId: null,
    },
    mode: "onChange",
  });

  const { execute, result, isExecuting, reset } = useAction(
    createProjectAction,
    {
      onSuccess: ({ data }) => {
        if (data?.id) {
          toast.success(t("projectCreatedSuccess", { name: data.name }));
          if (onSuccess) {
            onSuccess(data.id);
          } else {
            router.push(`/projects/${data.id}` as Route);
          }
        }
      },
      onError: (error) => {
        toast.error(t("createProjectError"));
        throw new Error(JSON.stringify(error.error));
      },
    },
  );

  const handleSubmit = (data: CreateProjectInput) => {
    execute({
      name: data.name.trim(),
      description: data.description?.trim() || undefined,
      teamId: data.teamId ?? null,
    });
  };

  const handleReset = () => {
    form.reset();
    reset();
  };

  const description = form.watch("description") ?? "";
  const teamIdValue = form.watch("teamId") ?? null;

  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <FieldGroup>
          <Controller
            control={form.control}
            name="name"
            render={({ field, fieldState }) => (
              <FieldInput
                label={t("projectNameRequired")}
                field={field}
                fieldState={fieldState}
                type="text"
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
                  className={`text-right text-xs ${
                    description.length >= PROJECT_DESCRIPTION_MAX_LENGTH
                      ? "text-red-500"
                      : description.length >=
                          PROJECT_DESCRIPTION_MAX_LENGTH - 100
                        ? "text-yellow-500"
                        : "text-muted-foreground"
                  }`}
                  aria-live="polite"
                >
                  {description.length} / {PROJECT_DESCRIPTION_MAX_LENGTH}
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

          {result?.serverError && (
            <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-sm text-red-800 dark:text-red-200">
                {result.serverError}
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={isExecuting || !form.formState.isValid}
              className="flex-1"
            >
              {isExecuting ? t("creating") : t("createProject")}
            </Button>

            {showCard && (
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={isExecuting}
              >
                Reset
              </Button>
            )}
          </div>
        </FieldGroup>
      </form>
    </Form>
  );

  if (showCard) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>{t("createNewProject")}</CardTitle>
          <CardDescription>{t("createNewProjectDescription")}</CardDescription>
        </CardHeader>
        <CardContent>{formContent}</CardContent>
      </Card>
    );
  }

  return formContent;
}
