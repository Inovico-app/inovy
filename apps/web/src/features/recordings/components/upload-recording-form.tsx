"use client";

import { uploadRecordingFormAction } from "@/features/recordings/actions/upload-recording";
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
} from "@/server/validation/recordings/upload-recording";
import { UploadIcon, XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { toast } from "sonner";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";

interface UploadRecordingFormProps {
  projectId: string;
  onSuccess?: (recordingId: string) => void;
  onCancel?: () => void;
}

export function UploadRecordingForm({
  projectId,
  onSuccess,
  onCancel,
}: UploadRecordingFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [recordingDate, setRecordingDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      handleFileSelect(droppedFiles[0]);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      handleFileSelect(selectedFiles[0]);
    }
  };

  const handleFileSelect = (selectedFile: File) => {
    // Validate file type
    if (
      !ALLOWED_MIME_TYPES.includes(
        selectedFile.type as (typeof ALLOWED_MIME_TYPES)[number]
      )
    ) {
      setError(
        "Unsupported file type. Please upload mp3, mp4, wav, or m4a files."
      );
      return;
    }

    // Validate file size
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError(
        `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB.`
      );
      return;
    }

    setFile(selectedFile);
    setError(null);

    // Auto-populate title from filename if empty
    if (!title) {
      const fileNameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, "");
      setTitle(fileNameWithoutExt);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      setError("Please select a file to upload");
      return;
    }

    if (!title.trim()) {
      setError("Please enter a title for the recording");
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // Simulate progress (since we can't track actual upload progress easily)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);

      // Create FormData
      const formData = new FormData();
      formData.append("file", file);
      formData.append("projectId", projectId);
      formData.append("title", title.trim());
      formData.append("description", description.trim());
      formData.append("recordingDate", recordingDate);

      // Upload recording
      const result = await uploadRecordingFormAction(formData);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (result.success && result.recordingId) {
        toast.success("Recording uploaded successfully!");

        if (onSuccess) {
          onSuccess(result.recordingId);
        } else {
          // Navigate to project page
          router.push(`/projects/${projectId}`);
        }
      } else {
        setError(result.error ?? "Failed to upload recording");
        toast.error(result.error ?? "Failed to upload recording");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      toast.error("An error occurred during upload");
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* File Upload Area */}
      <div className="space-y-2">
        <Label htmlFor="file">Recording File *</Label>
        <div
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-colors
            ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25"
            }
            ${file ? "bg-muted/50" : "bg-background"}
            ${isUploading ? "pointer-events-none opacity-50" : "cursor-pointer"}
          `}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !file && !isUploading && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            id="file"
            className="hidden"
            accept=".mp3,.mp4,.wav,.m4a,audio/mpeg,audio/mp4,audio/wav,video/mp4"
            onChange={handleFileInputChange}
            disabled={isUploading}
          />

          {!file ? (
            <div className="space-y-2">
              <UploadIcon className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  Drop your recording here or click to browse
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supports MP3, MP4, WAV, M4A (max {MAX_FILE_SIZE / 1024 / 1024}
                  MB)
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 text-left">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)}
                </p>
              </div>
              {!isUploading && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFile();
                  }}
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Upload Progress */}
      {isUploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Uploading...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

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
          disabled={isUploading}
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
          disabled={isUploading}
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
          disabled={isUploading}
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
            disabled={isUploading}
          >
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={!file || !title || isUploading}>
          {isUploading ? "Uploading..." : "Upload Recording"}
        </Button>
      </div>
    </form>
  );
}

