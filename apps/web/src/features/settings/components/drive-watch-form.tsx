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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  startDriveWatchAction,
  updateDriveWatchAction,
} from "@/features/integrations/google/actions/drive-watch";
import type {
  DriveWatchDto,
  DriveWatchListItemDto,
} from "@/server/dto/drive-watch.dto";
import { Loader2, X } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";

interface Project {
  id: string;
  name: string;
}

interface DriveWatchFormProps {
  projects: Project[];
  editingWatch?: DriveWatchListItemDto | null;
  onSuccess: (watch: DriveWatchListItemDto) => void;
  onCancel: () => void;
}

/**
 * Drive Watch Form Component
 * Form for adding or editing a Drive watch
 */
export function DriveWatchForm({
  projects,
  editingWatch,
  onSuccess,
  onCancel,
}: DriveWatchFormProps) {
  const [folderId, setFolderId] = useState(editingWatch?.folderId || "");
  const [projectId, setProjectId] = useState(editingWatch?.projectId || "");

  const { execute: executeStart, isExecuting: isStarting } = useAction(
    startDriveWatchAction,
    {
      onSuccess: ({ data }) => {
        if (
          data &&
          typeof data === "object" &&
          "id" in data &&
          "folderId" in data &&
          "projectId" in data &&
          "organizationId" in data &&
          "expiresAt" in data &&
          "isActive" in data &&
          "folderName" in data
        ) {
          const watchData = data as DriveWatchDto;
          toast.success("Watch started successfully");
          // Convert DriveWatchDto to DriveWatchListItemDto format
          const watch: DriveWatchListItemDto = {
            id: watchData.id,
            folderId: watchData.folderId,
            projectId: watchData.projectId,
            organizationId: watchData.organizationId,
            expiresAt:
              watchData.expiresAt instanceof Date
                ? watchData.expiresAt
                : new Date(watchData.expiresAt),
            isActive: watchData.isActive,
            folderName: watchData.folderName,
            isExpired:
              (watchData.expiresAt instanceof Date
                ? watchData.expiresAt
                : new Date(watchData.expiresAt)) < new Date(),
            expiresIn:
              (watchData.expiresAt instanceof Date
                ? watchData.expiresAt
                : new Date(watchData.expiresAt)) < new Date()
                ? null
                : (watchData.expiresAt instanceof Date
                    ? watchData.expiresAt
                    : new Date(watchData.expiresAt)
                  ).getTime() - Date.now(),
            projectName:
              projects.find((p) => p.id === watchData.projectId)?.name ||
              "Unknown Project",
          };
          onSuccess(watch);
        }
      },
      onError: ({ error }) => {
        toast.error(error.serverError || "Failed to start watch");
      },
    }
  );

  const { execute: executeUpdate, isExecuting: isUpdating } = useAction(
    updateDriveWatchAction,
    {
      onSuccess: ({ data }) => {
        if (
          data &&
          typeof data === "object" &&
          "id" in data &&
          "folderId" in data &&
          "projectId" in data &&
          "organizationId" in data &&
          "expiresAt" in data &&
          "isActive" in data &&
          "folderName" in data
        ) {
          const watchData = data as DriveWatchDto;
          toast.success("Watch updated successfully");
          // Convert DriveWatchDto to DriveWatchListItemDto format
          const watch: DriveWatchListItemDto = {
            id: watchData.id,
            folderId: watchData.folderId,
            projectId: watchData.projectId,
            organizationId: watchData.organizationId,
            expiresAt:
              watchData.expiresAt instanceof Date
                ? watchData.expiresAt
                : new Date(watchData.expiresAt),
            isActive: watchData.isActive,
            folderName: watchData.folderName,
            isExpired:
              (watchData.expiresAt instanceof Date
                ? watchData.expiresAt
                : new Date(watchData.expiresAt)) < new Date(),
            expiresIn:
              (watchData.expiresAt instanceof Date
                ? watchData.expiresAt
                : new Date(watchData.expiresAt)) < new Date()
                ? null
                : (watchData.expiresAt instanceof Date
                    ? watchData.expiresAt
                    : new Date(watchData.expiresAt)
                  ).getTime() - Date.now(),
            projectName:
              projects.find((p) => p.id === watchData.projectId)?.name ||
              "Unknown Project",
          };
          onSuccess(watch);
        } else {
          // If update returns true, refresh the list by reloading
          toast.success("Watch updated successfully");
          // Reload the page to refresh data
          window.location.reload();
        }
      },
      onError: ({ error }) => {
        toast.error(error.serverError || "Failed to update watch");
      },
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!folderId.trim() || !projectId) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (editingWatch) {
      executeUpdate({
        watchId: editingWatch.id,
        projectId,
      });
    } else {
      executeStart({
        folderId: folderId.trim(),
        projectId,
      });
    }
  };

  const isLoading = isStarting || isUpdating;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>
              {editingWatch ? "Edit Watch" : "Add Folder to Watch"}
            </CardTitle>
            <CardDescription>
              {editingWatch
                ? "Update the project for this watched folder"
                : "Enter a Google Drive folder ID to monitor for file uploads"}
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="folderId">
              Google Drive Folder ID{" "}
              {!editingWatch && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id="folderId"
              type="text"
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              placeholder="Enter folder ID (e.g., 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms)"
              disabled={!!editingWatch || isLoading}
              required={!editingWatch}
              aria-describedby="folderId-help"
            />
            <p id="folderId-help" className="text-sm text-muted-foreground">
              You can find the folder ID in the Google Drive URL. The folder ID
              is the long string of characters after{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                /folders/
              </code>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="projectId">
              Project <span className="text-destructive">*</span>
            </Label>
            <Select
              value={projectId}
              onValueChange={setProjectId}
              disabled={isLoading}
              required
            >
              <SelectTrigger id="projectId">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.length === 0 ? (
                  <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                    No projects available
                  </div>
                ) : (
                  projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Files uploaded to this folder will be linked to the selected
              project
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingWatch ? "Update Watch" : "Start Watching"}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

