"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  HierarchicalKnowledgeEntryDto,
  KnowledgeDocumentDto,
  KnowledgeEntryDto,
} from "@/server/dto/knowledge-base.dto";
import {
  BookOpenIcon,
  FileTextIcon,
  LayersIcon,
  PlusIcon,
  UploadIcon,
} from "lucide-react";
import { useState } from "react";
import { CreateKnowledgeEntryDialog } from "./create-knowledge-entry-dialog";
import { HierarchicalKnowledgeEntryList } from "./hierarchical-knowledge-entry-list";
import { KnowledgeDocumentList } from "./knowledge-document-list";
import { KnowledgeEntryList } from "./knowledge-entry-list";
import { UploadKnowledgeDocumentDialog } from "./upload-knowledge-document-dialog";

interface ProjectKnowledgeBaseSectionProps {
  initialProjectEntries: KnowledgeEntryDto[];
  initialProjectDocuments: KnowledgeDocumentDto[];
  initialHierarchicalEntries: HierarchicalKnowledgeEntryDto[];
  projectId: string;
  organizationId: string;
  canEdit: boolean;
}

export function ProjectKnowledgeBaseSection({
  initialProjectEntries,
  initialProjectDocuments,
  initialHierarchicalEntries,
  projectId,
  organizationId,
  canEdit,
}: ProjectKnowledgeBaseSectionProps) {
  const [projectEntries, setProjectEntries] = useState(
    () => initialProjectEntries,
  );
  const [documents, setDocuments] = useState(() => initialProjectDocuments);
  const [hierarchicalEntries, setHierarchicalEntries] = useState(
    () => initialHierarchicalEntries,
  );
  const [showCreateEntryDialog, setShowCreateEntryDialog] = useState(false);
  const [showUploadDocumentDialog, setShowUploadDocumentDialog] =
    useState(false);

  const handleEntryCreated = (entry: KnowledgeEntryDto) => {
    setProjectEntries((prev) => [...prev, entry]);
    setHierarchicalEntries((prev) => {
      const updated = [...prev];
      updated.push({ ...entry, priority: 1 });
      return updated
        .filter((e, idx, arr) => {
          const firstIndex = arr.findIndex(
            (item) => item.term.toLowerCase() === e.term.toLowerCase(),
          );
          return idx === firstIndex;
        })
        .sort((a, b) => {
          if (a.priority !== b.priority) {
            return a.priority - b.priority;
          }
          return a.term.localeCompare(b.term);
        });
    });
  };

  const handleEntryUpdated = (updatedEntry: KnowledgeEntryDto) => {
    setProjectEntries((prev) =>
      prev.map((e) => (e.id === updatedEntry.id ? updatedEntry : e)),
    );
    setHierarchicalEntries((prev) =>
      prev.map((e) =>
        e.id === updatedEntry.id ? { ...updatedEntry, priority: 1 } : e,
      ),
    );
  };

  const handleEntryDeleted = (entryId: string) => {
    setProjectEntries((prev) => prev.filter((e) => e.id !== entryId));
    setHierarchicalEntries((prev) => prev.filter((e) => e.id !== entryId));
  };

  const handleDocumentUploaded = (document: KnowledgeDocumentDto) => {
    setDocuments((prev) => [...prev, document]);
  };

  const handleDocumentDeleted = (documentId: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== documentId));
  };

  const totalCount =
    hierarchicalEntries.length + projectEntries.length + documents.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpenIcon className="h-4.5 w-4.5 text-muted-foreground" />
              Knowledge Base
            </CardTitle>
            <CardDescription className="mt-1.5">
              Manage project-specific terms and definitions. Inherited entries
              from organization and global scopes are shown below.
            </CardDescription>
          </div>
          {canEdit && (
            <div className="flex shrink-0 gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowCreateEntryDialog(true)}
              >
                <PlusIcon className="h-3.5 w-3.5 mr-1.5" />
                Add Entry
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowUploadDocumentDialog(true)}
              >
                <UploadIcon className="h-3.5 w-3.5 mr-1.5" />
                Upload Docs
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="pt-6">
        {totalCount === 0 && !canEdit ? (
          <EmptyKnowledgeBase />
        ) : (
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="w-full grid grid-cols-3 mb-4">
              <TabsTrigger
                value="all"
                className="flex items-center gap-1.5 text-xs sm:text-sm"
              >
                <LayersIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">All Knowledge</span>
                <span className="sm:hidden">All</span>
                <Badge
                  variant="secondary"
                  className="ml-1 h-5 min-w-5 px-1.5 text-[10px] font-medium"
                >
                  {hierarchicalEntries.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="project"
                className="flex items-center gap-1.5 text-xs sm:text-sm"
              >
                <BookOpenIcon className="h-3.5 w-3.5" />
                Project
                <Badge
                  variant="secondary"
                  className="ml-1 h-5 min-w-5 px-1.5 text-[10px] font-medium"
                >
                  {projectEntries.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="documents"
                className="flex items-center gap-1.5 text-xs sm:text-sm"
              >
                <FileTextIcon className="h-3.5 w-3.5" />
                Documents
                <Badge
                  variant="secondary"
                  className="ml-1 h-5 min-w-5 px-1.5 text-[10px] font-medium"
                >
                  {documents.length}
                </Badge>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="all">
              <HierarchicalKnowledgeEntryList
                entries={hierarchicalEntries}
                projectId={projectId}
                organizationId={organizationId}
                canEdit={canEdit}
                onEntryUpdated={handleEntryUpdated}
                onEntryDeleted={handleEntryDeleted}
              />
            </TabsContent>
            <TabsContent value="project">
              <KnowledgeEntryList
                entries={projectEntries}
                scope="project"
                scopeId={projectId}
                canEdit={canEdit}
                onEntryUpdated={handleEntryUpdated}
                onEntryDeleted={handleEntryDeleted}
                onCreateClick={() => setShowCreateEntryDialog(true)}
              />
            </TabsContent>
            <TabsContent value="documents">
              <KnowledgeDocumentList
                documents={documents}
                scope="project"
                scopeId={projectId}
                canEdit={canEdit}
                onDocumentDeleted={handleDocumentDeleted}
                onUploadClick={() => setShowUploadDocumentDialog(true)}
              />
            </TabsContent>
          </Tabs>
        )}
      </CardContent>

      {canEdit && (
        <>
          <CreateKnowledgeEntryDialog
            open={showCreateEntryDialog}
            onOpenChange={setShowCreateEntryDialog}
            scope="project"
            scopeId={projectId}
            onSuccess={handleEntryCreated}
          />
          <UploadKnowledgeDocumentDialog
            open={showUploadDocumentDialog}
            onOpenChange={setShowUploadDocumentDialog}
            scope="project"
            scopeId={projectId}
            onSuccess={handleDocumentUploaded}
          />
        </>
      )}
    </Card>
  );
}

function EmptyKnowledgeBase() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
        <BookOpenIcon className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground">
        No knowledge entries available
      </p>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">
        Project entries override organization entries, which override global
        entries. Contact a project manager to add entries.
      </p>
    </div>
  );
}
