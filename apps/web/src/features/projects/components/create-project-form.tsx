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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
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
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
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
  const {
    teams,
    activeTeamId,
    isLoading: isLoadingTeams,
  } = useProjectTeamPicker();

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
          toast.success(`Project created successfully: ${data.name}`);
          if (onSuccess) {
            onSuccess(data.id);
          } else {
            router.push(`/projects/${data.id}`);
          }
        }
      },
      onError: (error) => {
        toast.error("Failed to create project. Please try again.");
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
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Project Name *</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  placeholder="Enter project name"
                  disabled={isExecuting}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter project description (optional)"
                  disabled={isExecuting}
                  rows={3}
                  maxLength={PROJECT_DESCRIPTION_MAX_LENGTH}
                  {...field}
                />
              </FormControl>
              <p
                className={`text-right text-xs ${
                  description.length >= PROJECT_DESCRIPTION_MAX_LENGTH
                    ? "text-red-500"
                    : description.length >= PROJECT_DESCRIPTION_MAX_LENGTH - 100
                      ? "text-yellow-500"
                      : "text-muted-foreground"
                }`}
                aria-live="polite"
              >
                {description.length} / {PROJECT_DESCRIPTION_MAX_LENGTH}
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        {!isLoadingTeams && teams.length > 0 && (
          <FormField
            control={form.control}
            name="teamId"
            render={() => (
              <FormItem>
                <TeamPicker
                  teams={teams}
                  value={teamIdValue}
                  onChange={(id) => form.setValue("teamId", id)}
                  activeTeamId={activeTeamId}
                />
                <FormMessage />
              </FormItem>
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
            {isExecuting ? "Creating..." : "Create Project"}
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
      </form>
    </Form>
  );

  if (showCard) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Create New Project</CardTitle>
          <CardDescription>
            Create a new project to organize your meeting recordings.
          </CardDescription>
        </CardHeader>
        <CardContent>{formContent}</CardContent>
      </Card>
    );
  }

  return formContent;
}
