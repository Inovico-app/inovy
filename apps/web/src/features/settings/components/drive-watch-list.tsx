"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { deleteDriveWatchAction } from "@/features/integrations/google/actions/drive-watch";
import type { DriveWatchListItemDto } from "@/server/dto/drive-watch.dto";
import { Edit, ExternalLink, Trash2 } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";

interface DriveWatchListProps {
  watches: DriveWatchListItemDto[];
  onEdit: (watch: DriveWatchListItemDto) => void;
  onDelete: (watchId: string) => void;
}

/**
 * Drive Watch List Component
 * Displays active watches with expiration status
 */
export function DriveWatchList({
  watches,
  onEdit,
  onDelete,
}: DriveWatchListProps) {
  const { execute: executeDelete, isExecuting: isDeleting } = useAction(
    deleteDriveWatchAction,
    {
      onSuccess: () => {
        toast.success("Watch deleted successfully");
      },
      onError: ({ error }) => {
        toast.error(error.serverError || "Failed to delete watch");
      },
    }
  );

  const handleDelete = (watchId: string) => {
    executeDelete({ watchId });
    // Optimistically remove from list
    onDelete(watchId);
  };

  const formatExpiration = (expiresIn: number | null, isExpired: boolean) => {
    if (isExpired) {
      return <Badge variant="destructive">Expired</Badge>;
    }

    if (expiresIn === null) {
      return <Badge variant="secondary">Unknown</Badge>;
    }

    const hours = Math.floor(expiresIn / (60 * 60 * 1000));
    const minutes = Math.floor((expiresIn % (60 * 60 * 1000)) / (60 * 1000));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return (
        <Badge variant="default">
          Expires in {days} {days === 1 ? "day" : "days"}
        </Badge>
      );
    }

    if (hours > 0) {
      return (
        <Badge variant={hours < 2 ? "destructive" : "default"}>
          Expires in {hours}h {minutes}m
        </Badge>
      );
    }

    return <Badge variant="destructive">Expires in {minutes}m</Badge>;
  };

  if (watches.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No watched folders yet.</p>
        <p className="text-sm mt-2">
          Add a folder to start monitoring for file uploads.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Active Watches</h3>
      <div className="space-y-3">
        {watches.map((watch) => (
          <Card key={watch.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">
                      {watch.folderName || watch.folderId}
                    </h4>
                    {formatExpiration(watch.expiresIn, watch.isExpired)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Project: {watch.projectName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Folder ID: {watch.folderId}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      window.open(
                        `https://drive.google.com/drive/folders/${watch.folderId}`,
                        "_blank"
                      )
                    }
                    aria-label="View in Drive"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(watch)}
                    aria-label="Edit watch"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isDeleting}
                        aria-label="Delete watch"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Watch</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to stop watching this folder?
                          This will stop monitoring for new file uploads.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(watch.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

