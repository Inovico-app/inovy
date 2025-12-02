"use client";

import { useState } from "react";
import type { FileWithMetadata } from "../components/document-file-list";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_BATCH_SIZE = 20;
const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
] as const;

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function useFileSelection() {
  const [selectedFiles, setSelectedFiles] = useState<FileWithMetadata[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) {
      return;
    }

    setFileError(null);

    // Check batch size limit
    setSelectedFiles((prev) => {
      if (prev.length + files.length > MAX_BATCH_SIZE) {
        setFileError(
          `Maximum ${MAX_BATCH_SIZE} files allowed. Please select fewer files.`
        );
        return prev;
      }

      const newFiles: FileWithMetadata[] = [];
      const errors: string[] = [];

      for (const file of files) {
        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
          errors.push(
            `${file.name}: File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`
          );
          continue;
        }

        // Validate file type
        if (
          !ALLOWED_FILE_TYPES.includes(
            file.type as (typeof ALLOWED_FILE_TYPES)[number]
          )
        ) {
          errors.push(
            `${file.name}: File type not supported. Please upload PDF, Word, or text files.`
          );
          continue;
        }

        // Check for duplicate filenames
        if (
          prev.some((f) => f.file.name === file.name) ||
          newFiles.some((f) => f.file.name === file.name)
        ) {
          errors.push(`${file.name}: File already selected`);
          continue;
        }

        newFiles.push({
          file,
          title: file.name.replace(/\.[^/.]+$/, ""),
          id: generateId(),
        });
      }

      if (errors.length > 0) {
        setFileError(errors.join("\n"));
      }

      return newFiles.length > 0 ? [...prev, ...newFiles] : prev;
    });

    // Reset input to allow re-selecting same files
    e.target.value = "";
  };

  const removeFile = (id: string) => {
    setSelectedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const updateFileMetadata = (
    id: string,
    updates: { title?: string; description?: string }
  ) => {
    setSelectedFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  const clearFiles = () => {
    setSelectedFiles([]);
    setFileError(null);
  };

  const validateFiles = (): boolean => {
    if (selectedFiles.length === 0) {
      setFileError("Please select at least one file");
      return false;
    }

    const filesWithoutTitles = selectedFiles.filter(
      (f) => !f.title || f.title.trim() === ""
    );
    if (filesWithoutTitles.length > 0) {
      setFileError("Please provide a title for all files");
      return false;
    }

    return true;
  };

  return {
    selectedFiles,
    fileError,
    handleFileChange,
    removeFile,
    updateFileMetadata,
    clearFiles,
    validateFiles,
    maxBatchSize: MAX_BATCH_SIZE,
    maxFileSize: MAX_FILE_SIZE,
    allowedFileTypes: ALLOWED_FILE_TYPES,
  };
}

