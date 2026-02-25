"use client";

import { PROJECT_DESCRIPTION_MAX_LENGTH } from "@/lib/constants/project-constants";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { updateProjectAction } from "../actions/update-project";

const formSchema = z.object({
  name: z
    .string()
    .min(1, "Project name is required")
    .max(100, "Project name must be less than 100 characters"),
  description: z
    .string()
    .max(
      PROJECT_DESCRIPTION_MAX_LENGTH,
      `Description must be less than ${PROJECT_DESCRIPTION_MAX_LENGTH} characters`
    )
    .optional(),
});

type FormData = z.infer<typeof formSchema>;

interface EditProjectFormProps {
  projectId: string;
  initialData: {
    name: string;
    description: string | null;
  };
  onSuccess?: () => void;
}

export function EditProjectForm({
  projectId,
  initialData,
  onSuccess,
}: EditProjectFormProps) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: standardSchemaResolver(formSchema),
    defaultValues: {
      name: initialData.name,
      description: initialData.description ?? "",
    },
  });

  const descriptionValue = watch("description") ?? "";
  const descriptionLength = descriptionValue.length;
  const descriptionCounterColor =
    descriptionLength >= PROJECT_DESCRIPTION_MAX_LENGTH
      ? "text-red-500"
      : descriptionLength >= PROJECT_DESCRIPTION_MAX_LENGTH - 100
        ? "text-yellow-500"
        : "text-muted-foreground";

  const onSubmit = async (data: FormData) => {
    try {
      const result = await updateProjectAction({
        projectId,
        name: data.name,
        description: data.description ?? undefined,
      });

      if (result?.serverError) {
        toast.error(result.serverError);
        return;
      }

      if (result?.validationErrors) {
        const firstFieldErrors = Object.values(result.validationErrors)[0];
        const firstError = Array.isArray(firstFieldErrors)
          ? firstFieldErrors[0]
          : firstFieldErrors?._errors?.[0];
        toast.error(firstError ?? "Validation failed");
        return;
      }

      toast.success("Project updated successfully");
      router.refresh();
      onSuccess?.();
    } catch (error) {
      console.error("Error updating project:", error);
      toast.error("Failed to update project");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">
          Project Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="name"
          placeholder="Enter project name"
          {...register("name")}
          aria-invalid={errors.name ? "true" : "false"}
        />
        {errors.name && (
          <p className="text-sm text-red-500">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          placeholder="Enter project description (optional)"
          maxLength={PROJECT_DESCRIPTION_MAX_LENGTH}
          className="w-full min-h-[100px] px-3 py-2 text-sm rounded-md border border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          {...register("description")}
          aria-invalid={errors.description ? "true" : "false"}
        />
        <p
          className={`text-right text-xs ${descriptionCounterColor}`}
          aria-live="polite"
        >
          {descriptionLength} / {PROJECT_DESCRIPTION_MAX_LENGTH}
        </p>
        {errors.description && (
          <p className="text-sm text-red-500">{errors.description.message}</p>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onSuccess}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && (
            <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
          )}
          Save Changes
        </Button>
      </div>
    </form>
  );
}

