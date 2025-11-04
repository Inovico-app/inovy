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
import { createProjectAction } from "@/features/projects/actions/create-project";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

/**
 * Smart project creation form using the new Result-based error handling
 * Demonstrates clean error handling without custom error classes
 */
export function CreateProjectForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const { execute, result, isExecuting, reset } = useAction(
    createProjectAction,
    {
      onSuccess: ({ data }) => {
        if (data?.id) {
          toast.success(`Project created successfully: ${data.name}`);
          router.push(`/projects/${data.id}`);
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

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Create New Project (Smart)</CardTitle>
        <CardDescription>
          Using the new Result-based error handling approach with neverthrow.
        </CardDescription>
      </CardHeader>
      <CardContent>
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
            <Input
              id="description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter project description (optional)"
              disabled={isExecuting}
            />
          </div>

          {result?.serverError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{result.serverError}</p>
              <p className="text-xs text-red-600 mt-1">
                Smart error handling with Result types
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

            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={isExecuting}
            >
              Reset
            </Button>
          </div>

          <div className="text-xs text-muted-foreground">
            <p>✨ Powered by neverthrow Result types</p>
            <p>🚫 No custom error classes needed</p>
            <p>🔧 Functional error handling</p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

