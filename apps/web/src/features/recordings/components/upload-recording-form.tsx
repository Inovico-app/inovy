"use client";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { FieldInput, FieldTextarea } from "@/components/ui/form-fields";
import { uploadRecordingToBlob } from "@/lib/vercel-blob";
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
} from "@/server/validation/recordings/upload-recording";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useRef, type ChangeEvent, type DragEvent } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useUploadState } from "../hooks/use-upload-state";
import {
  uploadRecordingFormSchema,
  type UploadRecordingFormValues,
} from "../validation/upload-recording-form.schema";
import { FileDropZone } from "./upload-file-drop-zone";
import { UploadProgressBar } from "./upload-progress-bar";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("recordings");
  const tc = useTranslations("common");
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

  const {
    state,
    setFile,
    removeFile,
    setDragging,
    startUpload,
    updateProgress,
    setUploadError,
    cancelUpload,
  } = useUploadState();

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
    setDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);

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
    // Clear any previous upload state so a new upload starts fresh
    cancelUpload();

    // Validate file type
    if (
      !ALLOWED_MIME_TYPES.includes(
        selectedFile.type as (typeof ALLOWED_MIME_TYPES)[number],
      )
    ) {
      setUploadError(t("upload.unsupportedFileType"));
      return;
    }

    // Validate file size
    if (selectedFile.size > MAX_FILE_SIZE) {
      setUploadError(
        t("upload.fileSizeExceeded", { size: MAX_FILE_SIZE / 1024 / 1024 }),
      );
      return;
    }

    setFile(selectedFile);

    // Auto-populate title from filename if empty
    if (!form.getValues("title")) {
      const fileNameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, "");
      form.setValue("title", fileNameWithoutExt, { shouldValidate: true });
    }
  };

  const handleRemoveFile = () => {
    removeFile();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCancelUpload = () => {
    if (abortControllerRef.current && state.isUploading) {
      abortControllerRef.current.abort();
      toast.info(t("upload.uploadCancelled"));
      cancelUpload();
    }

    if (onCancel) {
      onCancel();
    }
  };

  const onSubmit = async (data: UploadRecordingFormValues) => {
    if (!state.file) {
      setUploadError(t("upload.selectFileError"));
      return;
    }

    startUpload();

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
        fileName: state.file.name,
        fileSize: state.file.size,
        fileMimeType: state.file.type,
      });

      // Upload file directly to Vercel Blob with real progress tracking
      const blob = await uploadRecordingToBlob(state.file, {
        clientPayload,
        onUploadProgress: (progress) => {
          updateProgress(Math.round(progress.percentage));
        },
        signal: abortControllerRef.current.signal,
      });

      // Clear upload state so progress bar disappears and form is ready for next upload
      cancelUpload();

      // Refresh the router cache to get updated data
      router.refresh();

      if (onSuccess) {
        // Note: We don't have the recordingId from the client upload
        // The onUploadCompleted runs server-side, so we just refresh
        onSuccess(blob.pathname); // Pass pathname as identifier
      } else {
        // Navigate to project page
        router.push(`/projects/${projectId}` as Route);
      }
    } catch (err) {
      // Handle abort error differently from other errors
      if (err instanceof Error && err.name === "AbortError") {
        setUploadError(t("upload.uploadCancelled"));
        return; // Don't show error toast for intentional cancellation
      }

      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      setUploadError(errorMessage);
      toast.error(
        err instanceof Error ? err.message : t("upload.errorOccurred"),
      );
    } finally {
      abortControllerRef.current = null;
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="min-w-0 overflow-hidden"
      >
        <FieldGroup>
          {/* File Upload Area */}
          <Field>
            <FieldLabel htmlFor="file">{t("upload.recordingFile")}</FieldLabel>
            <div className="min-w-0 overflow-hidden">
              <FileDropZone
                file={state.file}
                isDragging={state.isDragging}
                isUploading={state.isUploading}
                fileInputRef={fileInputRef}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onFileInputChange={handleFileInputChange}
                onRemoveFile={handleRemoveFile}
              />
            </div>
          </Field>

          {/* Upload Progress */}
          {state.isUploading && (
            <UploadProgressBar progress={state.uploadProgress} />
          )}

          {/* Title Field */}
          <Controller
            control={form.control}
            name="title"
            render={({ field, fieldState }) => (
              <FieldInput
                label={t("upload.titleField")}
                field={field}
                fieldState={fieldState}
                placeholder={t("upload.titlePlaceholder")}
                maxLength={200}
                disabled={state.isUploading}
              />
            )}
          />

          {/* Description Field */}
          <Controller
            control={form.control}
            name="description"
            render={({ field, fieldState }) => (
              <FieldTextarea
                label={t("upload.descriptionField")}
                field={field}
                fieldState={fieldState}
                placeholder={t("upload.descriptionPlaceholder")}
                maxLength={1000}
                disabled={state.isUploading}
                rows={4}
              />
            )}
          />

          {/* Recording Date */}
          <Controller
            control={form.control}
            name="recordingDate"
            render={({ field, fieldState }) => (
              <FieldInput
                label={t("upload.recordingDateField")}
                field={field}
                fieldState={fieldState}
                type="date"
                disabled={state.isUploading}
                max={new Date().toISOString().split("T")[0]}
              />
            )}
          />

          {/* Error Message */}
          {state.error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
              {state.error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelUpload}
              >
                {state.isUploading ? t("upload.cancelUpload") : tc("cancel")}
              </Button>
            )}
            <Button
              type="submit"
              disabled={
                !state.file || !form.formState.isValid || state.isUploading
              }
            >
              {state.isUploading
                ? t("upload.uploading")
                : t("upload.uploadButton")}
            </Button>
          </div>
        </FieldGroup>
      </form>
    </Form>
  );
}
