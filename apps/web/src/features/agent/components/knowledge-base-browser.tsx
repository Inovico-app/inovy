"use client";

import { Loader } from "@/components/loader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UploadKnowledgeDocumentDialog } from "@/features/knowledge-base/components/upload-knowledge-document-dialog";
import { queryKeys } from "@/lib/query-keys";
import type { IndexedDocumentDto } from "@/server/dto/knowledge-base-browser.dto";
import { useQuery } from "@tanstack/react-query";
import { AlertCircleIcon, Upload } from "lucide-react";
import { parseAsString, useQueryStates } from "nuqs";
import { useEffect, useMemo, useRef, useState } from "react";
import { DocumentCard } from "./document-card";

interface KnowledgeBaseBrowserProps {
  organizationId: string;
  projects: Array<{ id: string; name: string }>;
}

const CONTENT_TYPES = [
  { value: "__all__", label: "All Types" },
  { value: "knowledge_document", label: "Knowledge Document" },
  { value: "recording", label: "Recording" },
  { value: "transcription", label: "Transcription" },
  { value: "summary", label: "Summary" },
  { value: "task", label: "Task" },
  { value: "project_template", label: "Project Template" },
  { value: "organization_instructions", label: "Organization Instructions" },
];

const ALL_PROJECTS_VALUE = "__all__";

export function KnowledgeBaseBrowser({
  organizationId,
  projects,
}: KnowledgeBaseBrowserProps) {
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);

  // URL state management with nuqs
  const [filters, setFilters] = useQueryStates({
    search: parseAsString.withDefault(""),
    projectId: parseAsString.withDefault(""),
    contentType: parseAsString.withDefault(""),
    offset: parseAsString.withDefault(""),
    limit: parseAsString.withDefault("100"),
  });

  // Build query params
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set("organizationId", organizationId);
    if (filters.projectId && filters.projectId !== ALL_PROJECTS_VALUE) {
      params.set("projectId", filters.projectId);
    }
    if (filters.contentType && filters.contentType !== "__all__") {
      params.set("contentType", filters.contentType);
    }
    if (filters.search) {
      params.set("search", filters.search);
    }
    if (filters.limit) {
      params.set("limit", filters.limit);
    }
    if (filters.offset) {
      params.set("offset", filters.offset);
    }
    return params.toString();
  }, [organizationId, filters]);

  // Track previous filter values to reset offset when filters change
  const prevFiltersRef = useRef({
    search: filters.search,
    projectId: filters.projectId,
    contentType: filters.contentType,
  });

  // Reset offset when filters change (except offset itself)
  useEffect(() => {
    const filtersChanged =
      prevFiltersRef.current.search !== filters.search ||
      prevFiltersRef.current.projectId !== filters.projectId ||
      prevFiltersRef.current.contentType !== filters.contentType;

    if (filtersChanged && filters.offset) {
      void setFilters({ offset: "" });
    }

    prevFiltersRef.current = {
      search: filters.search,
      projectId: filters.projectId,
      contentType: filters.contentType,
    };
  }, [
    filters.search,
    filters.projectId,
    filters.contentType,
    filters.offset,
    setFilters,
  ]);

  // Fetch documents
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.agentKnowledgeBase.documents({
      organizationId,
      projectId:
        filters.projectId && filters.projectId !== ALL_PROJECTS_VALUE
          ? filters.projectId
          : undefined,
      contentType:
        filters.contentType && filters.contentType !== "__all__"
          ? filters.contentType
          : undefined,
      search: filters.search || undefined,
      offset: filters.offset || undefined,
      limit: filters.limit || undefined,
    }),
    queryFn: async () => {
      const response = await fetch(`/api/agent/knowledge-base?${queryParams}`);
      if (!response.ok) {
        throw new Error("Failed to fetch documents");
      }
      return response.json() as Promise<{
        documents: IndexedDocumentDto[];
        total: number;
        hasMore: boolean;
        nextOffset: string | number | null;
      }>;
    },
  });

  const documents = data?.documents ?? [];

  const handleUploadSuccess = () => {
    void refetch();
  };

  return (
    <div className="space-y-6">
      {/* Header with Bulk Upload Button */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1" />
        <Button
          onClick={() => setIsUploadDialogOpen(true)}
          className="flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          Bulk Upload
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search documents by title or filename..."
            value={filters.search}
            onChange={(e) => {
              void setFilters({ search: e.target.value });
            }}
          />
        </div>
        <Select
          value={filters.projectId || ALL_PROJECTS_VALUE}
          onValueChange={(value) => {
            void setFilters({
              projectId: value === ALL_PROJECTS_VALUE ? "" : value,
            });
          }}
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="All Projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_PROJECTS_VALUE}>All Projects</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.contentType || "__all__"}
          onValueChange={(value) => {
            void setFilters({ contentType: value === "__all__" ? "" : value });
          }}
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            {CONTENT_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader />
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircleIcon className="h-4 w-4" />
          <AlertDescription>
            Failed to load documents:{" "}
            {error instanceof Error ? error.message : "Unknown error"}
          </AlertDescription>
        </Alert>
      )}

      {!isLoading && !error && (
        <>
          {documents.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No documents found. Try adjusting your filters.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Found {documents.length} document
                  {documents.length !== 1 ? "s" : ""}
                  {data?.hasMore && " (more available)"}
                </div>
                {data?.hasMore && data.nextOffset && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      void setFilters({ offset: String(data.nextOffset) });
                    }}
                  >
                    Load More
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {documents.map((document) => (
                  <DocumentCard
                    key={document.documentId}
                    document={document}
                    organizationId={organizationId}
                    onDeleted={() => {
                      void refetch();
                    }}
                    onReindexed={() => {
                      void refetch();
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Upload Dialog */}
      <UploadKnowledgeDocumentDialog
        open={isUploadDialogOpen}
        onOpenChange={setIsUploadDialogOpen}
        scope="organization"
        scopeId={organizationId}
        onSuccess={handleUploadSuccess}
      />
    </div>
  );
}

