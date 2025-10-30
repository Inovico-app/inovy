"use client";

import { updateRecordingMetadataAction } from "@/features/recordings/actions/update-recording-metadata";
import type { RecordingDto } from "@/server/dto";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";

interface EditRecordingFormProps {
  recording: RecordingDto;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function EditRecordingForm({
  recording,
  onSuccess,
  onCancel,
}: EditRecordingFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState(recording.title);
  const [description, setDescription] = useState(recording.description ?? "");
  const [recordingDate, setRecordingDate] = useState(
    recording.recordingDate.toISOString().split("T")[0]
  );
  const [error, setError] = useState<string | null>(null);

  const { execute, isExecuting } = useAction(updateRecordingMetadataAction, {
    onSuccess: ({ data }) => {
      if (data) {
        toast.success("Recording updated successfully!");
        if (onSuccess) {
          onSuccess();
        } else {
          router.refresh();
        }
      }
    },
    onError: ({ error }) => {
      const errorMessage = error.serverError ?? "Failed to update recording";
      setError(errorMessage);
      toast.error(errorMessage);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError("Please enter a title for the recording");
      return;
    }

    setError(null);

    execute({
      id: recording.id,
      title: title.trim(),
      description: description.trim() || undefined,
      recordingDate: new Date(recordingDate),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title Field */}
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter recording title"
          required
          maxLength={200}
          disabled={isExecuting}
        />
      </div>

      {/* Description Field */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter recording description (optional)"
          maxLength={1000}
          disabled={isExecuting}
          rows={4}
          className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      {/* Recording Date */}
      <div className="space-y-2">
        <Label htmlFor="recordingDate">Recording Date *</Label>
        <Input
          id="recordingDate"
          type="date"
          value={recordingDate}
          onChange={(e) => setRecordingDate(e.target.value)}
          required
          disabled={isExecuting}
          max={new Date().toISOString().split("T")[0]}
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
          {error}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isExecuting}
          >
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={!title || isExecuting}>
          {isExecuting ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}

