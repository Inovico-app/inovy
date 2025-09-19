"use client";

import { createProjectAction } from "@/features/projects/actions/create-project";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

/**
 * Smart project creation form using the new Result-based error handling
 * Demonstrates clean error handling without custom error classes
 */
export function CreateProjectForm() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const { execute, result, isExecuting, reset } = useAction(
    createProjectAction,
    {
      onSuccess: ({ data }) => {
        if (data?.id) {
          console.log("Project created successfully:", data.id);
        }
      },
      onError: ({ error }) => {
        console.error("Action failed:", error);
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
            {result?.validationErrors?.name && (
              <p className="text-sm text-red-600">
                {result.validationErrors.name[0]}
              </p>
            )}
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
            {result?.validationErrors?.description && (
              <p className="text-sm text-red-600">
                {result.validationErrors.description[0]}
              </p>
            )}
          </div>

          {result?.serverError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{result.serverError}</p>
              <p className="text-xs text-red-600 mt-1">
                Smart error handling with Result types
              </p>
            </div>
          )}

          {result?.data?.success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800">
                Project created successfully! Redirecting...
              </p>
              <p className="text-xs text-green-600 mt-1">
                ID: {result.data.projectId}
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

