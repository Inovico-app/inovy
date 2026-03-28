"use client";

import type { KnowledgeBaseScope } from "@/server/db/schema/knowledge-base-entries";
import { useAction } from "next-safe-action/hooks";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { importKnowledgeEntriesAction } from "../actions/import-entries";
import {
  parseVocabularyFile,
  type ParseResult,
} from "../lib/parse-vocabulary-file";

interface UseImportVocabularyProps {
  scope: KnowledgeBaseScope;
  scopeId: string | null;
  onSuccess?: () => void;
}

export function useImportVocabulary({
  scope,
  scopeId,
  onSuccess,
}: UseImportVocabularyProps) {
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const reset = useCallback(() => {
    setParseResult(null);
    setFileName(null);
  }, []);

  const { execute, isExecuting } = useAction(importKnowledgeEntriesAction, {
    onSuccess: ({ data }) => {
      if (data) {
        const msg =
          data.skipped > 0
            ? `Imported ${data.imported} entries (${data.skipped} duplicates skipped)`
            : `Imported ${data.imported} entries`;
        toast.success(msg);
        onSuccess?.();
        reset();
      }
    },
    onError: ({ error }) => {
      toast.error(error.serverError || "Failed to import entries");
    },
  });

  const handleFile = useCallback((file: File) => {
    if (file.size > 1024 * 1024) {
      toast.error("File size must be less than 1MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const result = parseVocabularyFile(content, file.name);

      const validCount = result.entries.filter((e) => !e.error).length;
      if (validCount > 500) {
        toast.error("Maximum 500 entries per import");
        return;
      }

      setParseResult(result);
      setFileName(file.name);
    };
    reader.onerror = () => {
      toast.error("Failed to read file");
    };
    reader.readAsText(file);
  }, []);

  const validEntries = useMemo(
    () => parseResult?.entries.filter((e) => !e.error) ?? [],
    [parseResult],
  );

  const handleImport = useCallback(() => {
    if (validEntries.length === 0) {
      toast.error("No valid entries to import");
      return;
    }

    execute({
      scope,
      scopeId,
      entries: validEntries.map((e) => ({
        term: e.term,
        definition: e.definition,
        boost: e.boost,
        category: e.category,
        context: e.context,
      })),
    });
  }, [validEntries, scope, scopeId, execute]);

  const validCount = validEntries.length;
  const errorCount = (parseResult?.entries.length ?? 0) - validCount;

  return {
    parseResult,
    fileName,
    isImporting: isExecuting,
    validCount,
    errorCount,
    handleFile,
    handleImport,
    reset,
  };
}
