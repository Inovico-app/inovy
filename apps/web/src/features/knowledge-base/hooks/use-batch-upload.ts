"use client";

import type { KnowledgeBaseScope } from "@/server/db/schema/knowledge-base-entries";
import type { KnowledgeDocumentDto } from "@/server/dto/knowledge-base.dto";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  uploadKnowledgeDocumentAction,
  uploadKnowledgeDocumentsBatchAction,
} from "../actions/upload-document";
import type {
  FileUploadState,
  FileWithMetadata,
} from "../components/document-file-list";

interface UseBatchUploadOptions {
  scope: KnowledgeBaseScope;
  scopeId: string | null;
  sharedDescription?: string;
  onSuccess?: (document: KnowledgeDocumentDto) => void;
}

export function useBatchUpload({
  scope,
  scopeId,
  sharedDescription = "",
  onSuccess,
}: UseBatchUploadOptions) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [uploadStates, setUploadStates] = useState<
    Map<string, FileUploadState>
  >(new Map());

  const uploadSingleFile = async (
    fileItem: FileWithMetadata,
    description: string
  ) => {
    const result = await uploadKnowledgeDocumentAction({
      scope,
      scopeId,
      title: fileItem.title,
      description: fileItem.description || description || null,
      file: fileItem.file,
    });

    if (result?.serverError) {
      setUploadStates((prev) => {
        const next = new Map(prev);
        next.set(fileItem.id, {
          status: "error",
          error: result.serverError,
        });
        return next;
      });
      toast.error(result.serverError);
      return { success: false };
    }

    if (result?.validationErrors) {
      const firstFieldErrors = Object.values(result.validationErrors)[0];
      let firstError: string | undefined;

      if (Array.isArray(firstFieldErrors)) {
        const firstItem = firstFieldErrors[0];
        if (typeof firstItem === "string") {
          firstError = firstItem;
        } else if (
          typeof firstItem === "object" &&
          firstItem !== null &&
          "_errors" in firstItem
        ) {
          const errorObj = firstItem as { _errors?: string[] };
          if (Array.isArray(errorObj._errors) && errorObj._errors[0]) {
            firstError = errorObj._errors[0];
          }
        }
      } else if (
        typeof firstFieldErrors === "object" &&
        firstFieldErrors !== null &&
        "_errors" in firstFieldErrors
      ) {
        const errorObj = firstFieldErrors as { _errors?: string[] };
        if (Array.isArray(errorObj._errors) && errorObj._errors[0]) {
          firstError = errorObj._errors[0];
        }
      }

      const errorMsg = firstError ?? "Validation failed";
      setUploadStates((prev) => {
        const next = new Map(prev);
        next.set(fileItem.id, {
          status: "error",
          error: errorMsg,
        });
        return next;
      });
      toast.error(errorMsg);
      return { success: false };
    }

    if (result?.data) {
      setUploadStates((prev) => {
        const next = new Map(prev);
        next.set(fileItem.id, {
          status: "success",
          documentId: result.data!.id,
        });
        return next;
      });
      toast.success("Document uploaded successfully");
      onSuccess?.(result.data);
      router.refresh();
      return { success: true };
    }

    return { success: false };
  };

  const uploadBatchFiles = async (
    files: FileWithMetadata[],
    description: string
  ) => {
    const result = await uploadKnowledgeDocumentsBatchAction({
      scope,
      scopeId,
      fileArray: files.map((f) => f.file),
      metadataArray: files.map((f) => ({
        title: f.title,
        description: f.description || description || null,
      })),
      sharedDescription: description || null,
    });

    if (result?.serverError) {
      files.forEach((f) => {
        setUploadStates((prev) => {
          const next = new Map(prev);
          next.set(f.id, {
            status: "error",
            error: result.serverError,
          });
          return next;
        });
      });
      toast.error(result.serverError);
      return { success: false };
    }

    if (result?.validationErrors) {
      const firstFieldErrors = Object.values(result.validationErrors)[0];
      let firstError: string | undefined;

      if (Array.isArray(firstFieldErrors)) {
        const firstItem = firstFieldErrors[0];
        if (typeof firstItem === "string") {
          firstError = firstItem;
        } else if (
          typeof firstItem === "object" &&
          firstItem !== null &&
          "_errors" in firstItem
        ) {
          const errorObj = firstItem as { _errors?: string[] };
          if (Array.isArray(errorObj._errors) && errorObj._errors[0]) {
            firstError = errorObj._errors[0];
          }
        }
      } else if (
        typeof firstFieldErrors === "object" &&
        firstFieldErrors !== null &&
        "_errors" in firstFieldErrors
      ) {
        const errorObj = firstFieldErrors as { _errors?: string[] };
        if (Array.isArray(errorObj._errors) && errorObj._errors[0]) {
          firstError = errorObj._errors[0];
        }
      }

      const errorMsg = firstError ?? "Validation failed";
      files.forEach((f) => {
        setUploadStates((prev) => {
          const next = new Map(prev);
          next.set(f.id, { status: "error", error: errorMsg });
          return next;
        });
      });
      toast.error(errorMsg);
      return { success: false };
    }

    if (result?.data) {
      const results = result.data;
      let successCount = 0;
      let failureCount = 0;

      results.forEach((fileResult, index) => {
        const fileItem = files[index];
        if (!fileItem) return;

        if (fileResult.success && fileResult.document) {
          setUploadStates((prev) => {
            const next = new Map(prev);
            next.set(fileItem.id, {
              status: "success",
              documentId: fileResult.document!.id,
            });
            return next;
          });
          successCount++;
          onSuccess?.(fileResult.document);
        } else {
          setUploadStates((prev) => {
            const next = new Map(prev);
            next.set(fileItem.id, {
              status: "error",
              error: fileResult.error ?? "Upload failed",
            });
            return next;
          });
          failureCount++;
        }
      });

      if (successCount > 0 && failureCount === 0) {
        toast.success(
          `Successfully uploaded ${successCount} document${
            successCount > 1 ? "s" : ""
          }`
        );
      } else if (successCount > 0) {
        toast.warning(
          `Uploaded ${successCount} document${
            successCount > 1 ? "s" : ""
          }, ${failureCount} failed`
        );
      } else {
        toast.error("Failed to upload documents");
      }

      if (successCount > 0) {
        router.refresh();
      }

      return { success: successCount > 0 };
    }

    return { success: false };
  };

  const uploadFiles = async (
    files: FileWithMetadata[],
    description?: string
  ) => {
    setIsLoading(true);
    setUploadStates(new Map(files.map((f) => [f.id, { status: "uploading" }])));

    try {
      // Use batch upload if multiple files, single upload if one file
      if (files.length === 1) {
        return await uploadSingleFile(
          files[0]!,
          description ?? sharedDescription
        );
      } else {
        return await uploadBatchFiles(files, description ?? sharedDescription);
      }
    } catch (error) {
      console.error("Error uploading documents:", error);
      files.forEach((f) => {
        setUploadStates((prev) => {
          const next = new Map(prev);
          next.set(f.id, {
            status: "error",
            error:
              error instanceof Error
                ? error.message
                : "Failed to upload document",
          });
          return next;
        });
      });
      toast.error("Failed to upload documents");
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  };

  const clearUploadStates = () => {
    setUploadStates(new Map());
  };

  const hasSuccessfulUploads = Array.from(uploadStates.values()).some(
    (state) => state.status === "success"
  );
  const hasErrors = Array.from(uploadStates.values()).some(
    (state) => state.status === "error"
  );
  const isUploading = Array.from(uploadStates.values()).some(
    (state) => state.status === "uploading"
  );

  return {
    isLoading,
    uploadStates,
    uploadFiles,
    clearUploadStates,
    hasSuccessfulUploads,
    hasErrors,
    isUploading,
  };
}

