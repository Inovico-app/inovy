"use client";

import { Button } from "@/components/ui/button";
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
import { formatFileSizePrecise } from "@/lib/formatters/file-size-formatters";
import { uploadRecordingToBlob } from "@/lib/vercel-blob";
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
} from "@/server/validation/recordings/upload-recording";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { UploadIcon, XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  uploadRecordingFormSchema,
  type UploadRecordingFormValues,
} from "../validation/upload-recording-form.schema";

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
  const abortControllerRef = useRef<AbortController | null>(null);

  const form = useForm<UploadRecordingFormValues>({
    resolver: standardSchemaResolver(uploadRecordingFormSchema),
    defaultValues: {
      title: "",
      description: "",
      recordingDate: new Date().toISOString().split("T")[0],
    },
    mode: "onChange",
  });

  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Cleanup on unmount - abort any ongoing upload
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

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
        "Unsupported file type. Please upload mp3, mp4, wav, m4a, or webm files."
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
    if (!form.getValues("title")) {
      const fileNameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, "");
      form.setValue("title", fileNameWithoutExt, { shouldValidate: true });
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCancelUpload = () => {
    if (abortControllerRef.current && isUploading) {
      abortControllerRef.current.abort();
      toast.info("Upload cancelled");
      setIsUploading(false);
      setUploadProgress(0);
      setError(null);
    }

    if (onCancel) {
      onCancel();
    }
  };

  const onSubmit = async (data: UploadRecordingFormValues) => {
    if (!file) {
      setError("Please select a file to upload");
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    // Create a new abort controller for this upload
    abortControllerRef.current = new AbortController();

    try {
      // Prepare metadata to send with the upload
      const clientPayload = JSON.stringify({
        projectId,
        title: data.title.trim(),
        description: data.description?.trim() || undefined,
        recordingDate: data.recordingDate,
        recordingMode: "upload",
        fileName: file.name,
        fileSize: file.size,
        fileMimeType: file.type,
      });

      // Upload file directly to Vercel Blob with real progress tracking
      const blob = await uploadRecordingToBlob(file, {
        clientPayload,
        onUploadProgress: (progress) => {
          setUploadProgress(Math.round(progress.percentage));
        },
        signal: abortControllerRef.current.signal,
      });

      // Refresh the router cache to get updated data
      router.refresh();

      if (onSuccess) {
        // Note: We don't have the recordingId from the client upload
        // The onUploadCompleted runs server-side, so we just refresh
        onSuccess(blob.pathname); // Pass pathname as identifier
      } else {
        // Navigate to project page
        router.push(`/projects/${projectId}`);
      }
    } catch (err) {
      // Handle abort error differently from other errors
      if (err instanceof Error && err.name === "AbortError") {
        setError("Upload cancelled");
        return; // Don't show error toast for intentional cancellation
      }

      setError(err instanceof Error ? err.message : "An error occurred");
      toast.error(
        err instanceof Error ? err.message : "An error occurred during upload"
      );
    } finally {
      setIsUploading(false);
      abortControllerRef.current = null;
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* File Upload Area */}
        <div className="space-y-2">
          <FormLabel htmlFor="file">Recording File *</FormLabel>
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
            role="button"
            tabIndex={0}
            onClick={() => !file && !isUploading && fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                if (!file && !isUploading) fileInputRef.current?.click();
              }
            }}
            aria-label="Upload recording file"
          >
            <input
              ref={fileInputRef}
              type="file"
              id="file"
              className="hidden"
              accept=".mp3,.mp4,.wav,.m4a,.webm,audio/mpeg,audio/mp4,audio/wav,audio/webm,video/mp4,video/webm"
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
                    {formatFileSizePrecise(file.size)}
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
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title *</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Enter recording title"
                  maxLength={200}
                  disabled={isUploading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description Field */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Enter recording description (optional)"
                  maxLength={1000}
                  disabled={isUploading}
                  rows={4}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Recording Date */}
        <FormField
          control={form.control}
          name="recordingDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Recording Date *</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="date"
                  disabled={isUploading}
                  max={new Date().toISOString().split("T")[0]}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Error Message */}
        {error && (
          <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end">
          {onCancel && (
            <Button type="button" variant="outline" onClick={handleCancelUpload}>
              {isUploading ? "Cancel Upload" : "Cancel"}
            </Button>
          )}
          <Button
            type="submit"
            disabled={!file || !form.formState.isValid || isUploading}
          >
            {isUploading ? "Uploading..." : "Upload Recording"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
