"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createProjectAction } from "@/features/projects/actions/create-project";
import { PROJECT_DESCRIPTION_MAX_LENGTH } from "@/lib/constants/project-constants";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

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
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      return;
    }

    execute({
      name: name.trim(),
      description: description.trim() || undefined,
    });
  };

  const handleReset = () => {
    setName("");
    setDescription("");
    reset();
  };

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Project Name *</Label>
        <Input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter project name"
          disabled={isExecuting}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter project description (optional)"
          disabled={isExecuting}
          rows={3}
          maxLength={PROJECT_DESCRIPTION_MAX_LENGTH}
        />
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
      </div>

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
          disabled={isExecuting || !name.trim()}
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

