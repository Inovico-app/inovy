"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { KnowledgeBaseScope } from "@/server/db/schema/knowledge-base-entries";
import {
  AlertCircleIcon,
  CheckCircleIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  UploadIcon,
} from "lucide-react";
import { useCallback, useRef } from "react";
import { useImportVocabulary } from "../hooks/use-import-vocabulary";
import { CATEGORY_CONFIG } from "../lib/vocabulary-category";

interface ImportVocabularyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scope: KnowledgeBaseScope;
  scopeId: string | null;
  onSuccess?: () => void;
}

export function ImportVocabularyDialog({
  open,
  onOpenChange,
  scope,
  scopeId,
  onSuccess,
}: ImportVocabularyDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    parseResult,
    fileName,
    isImporting,
    validCount,
    errorCount,
    handleFile,
    handleImport,
    reset,
  } = useImportVocabulary({
    scope,
    scopeId,
    onSuccess: () => {
      onOpenChange(false);
      onSuccess?.();
    },
  });

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        reset();
      }
      onOpenChange(isOpen);
    },
    [onOpenChange, reset],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Vocabulary</DialogTitle>
          <DialogDescription>
            Import terms from a CSV or TXT file into the knowledge base
          </DialogDescription>
        </DialogHeader>

        {!parseResult ? (
          <div className="space-y-4">
            {/* Drop zone */}
            <div
              className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 transition-colors hover:border-muted-foreground/50 cursor-pointer"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  fileInputRef.current?.click();
                }
              }}
            >
              <UploadIcon className="h-8 w-8 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium">
                  Drop a file here or click to browse
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Accepts .csv and .txt files (max 1MB, 500 entries)
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            {/* Format guide */}
            <FormatGuide />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary bar */}
            <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheetIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{fileName}</span>
              </div>
              <div className="flex items-center gap-3">
                {validCount > 0 && (
                  <div className="flex items-center gap-1 text-sm">
                    <CheckCircleIcon className="h-3.5 w-3.5 text-emerald-500" />
                    <span>{validCount} valid</span>
                  </div>
                )}
                {errorCount > 0 && (
                  <div className="flex items-center gap-1 text-sm">
                    <AlertCircleIcon className="h-3.5 w-3.5 text-destructive" />
                    <span>{errorCount} errors</span>
                  </div>
                )}
              </div>
            </div>

            {/* Preview table */}
            <div className="max-h-[300px] overflow-y-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Term</th>
                    <th className="px-3 py-2 text-left font-medium">
                      Definition
                    </th>
                    <th className="px-3 py-2 text-left font-medium w-16">
                      Boost
                    </th>
                    <th className="px-3 py-2 text-left font-medium w-24">
                      Category
                    </th>
                    <th className="px-3 py-2 text-left font-medium w-16">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {parseResult.entries.slice(0, 10).map((entry, idx) => (
                    <tr
                      key={`preview-${idx}-${entry.term.slice(0, 20)}`}
                      className={entry.error ? "bg-destructive/5" : ""}
                    >
                      <td className="px-3 py-2 font-medium max-w-[150px] truncate">
                        {entry.term}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground max-w-[200px] truncate">
                        {entry.definition}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {entry.boost != null ? `${entry.boost}x` : "---"}
                      </td>
                      <td className="px-3 py-2">
                        <Badge
                          variant="outline"
                          className={`text-[10px] py-0 border ${CATEGORY_CONFIG[entry.category].color}`}
                        >
                          {CATEGORY_CONFIG[entry.category].label}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        {entry.error ? (
                          <span
                            className="text-destructive text-xs"
                            title={entry.error}
                          >
                            Error
                          </span>
                        ) : (
                          <CheckCircleIcon className="h-3.5 w-3.5 text-emerald-500" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parseResult.entries.length > 10 && (
                <div className="px-3 py-2 text-xs text-muted-foreground bg-muted/30">
                  Showing 10 of {parseResult.entries.length} entries
                </div>
              )}
            </div>

            {/* Change file button */}
            <Button variant="ghost" size="sm" onClick={reset}>
              Choose a different file
            </Button>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isImporting}
          >
            Cancel
          </Button>
          {parseResult && (
            <Button
              onClick={handleImport}
              disabled={isImporting || validCount === 0}
            >
              {isImporting
                ? "Importing..."
                : `Import ${validCount} ${validCount === 1 ? "entry" : "entries"}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FormatGuide() {
  return (
    <Tabs defaultValue="csv" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="csv" className="flex items-center gap-1.5 text-xs">
          <FileSpreadsheetIcon className="h-3.5 w-3.5" />
          CSV Format
        </TabsTrigger>
        <TabsTrigger value="txt" className="flex items-center gap-1.5 text-xs">
          <FileTextIcon className="h-3.5 w-3.5" />
          TXT Format
        </TabsTrigger>
      </TabsList>
      <TabsContent value="csv" className="mt-3">
        <div className="rounded-lg bg-muted/50 p-4 space-y-2">
          <p className="text-xs font-medium">
            Required columns: <code className="text-xs">term</code>,{" "}
            <code className="text-xs">definition</code>
          </p>
          <p className="text-xs text-muted-foreground">
            Optional columns: <code className="text-xs">boost</code> (0-2),{" "}
            <code className="text-xs">category</code> (medical, legal,
            technical, custom), <code className="text-xs">context</code>
          </p>
          <pre className="text-xs bg-background rounded p-3 overflow-x-auto mt-2">
            {`term,definition,boost,category,context
myocardial infarction,Heart attack - death of heart muscle tissue,1.5,medical,Cardiology
ICD-10,International Classification of Diseases 10th Revision,1.2,medical,
SOW,Statement of Work - document defining project scope,,legal,Contracts`}
          </pre>
        </div>
      </TabsContent>
      <TabsContent value="txt" className="mt-3">
        <div className="rounded-lg bg-muted/50 p-4 space-y-2">
          <p className="text-xs font-medium">
            One entry per line:{" "}
            <code className="text-xs">term | definition</code>
          </p>
          <p className="text-xs text-muted-foreground">
            All entries default to no boost and &quot;custom&quot; category
          </p>
          <pre className="text-xs bg-background rounded p-3 overflow-x-auto mt-2">
            {`myocardial infarction | Heart attack - death of heart muscle tissue
ICD-10 | International Classification of Diseases 10th Revision
SOW | Statement of Work - document defining project scope`}
          </pre>
        </div>
      </TabsContent>
    </Tabs>
  );
}
