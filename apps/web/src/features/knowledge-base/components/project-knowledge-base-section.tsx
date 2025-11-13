"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { KnowledgeEntryList } from "./knowledge-entry-list";
import { KnowledgeDocumentList } from "./knowledge-document-list";
import { CreateKnowledgeEntryDialog } from "./create-knowledge-entry-dialog";
import { UploadKnowledgeDocumentDialog } from "./upload-knowledge-document-dialog";
import { Button } from "@/components/ui/button";
import { PlusIcon, BookOpenIcon, FileTextIcon } from "lucide-react";
import type {
  KnowledgeEntryDto,
  KnowledgeDocumentDto,
  HierarchicalKnowledgeEntryDto,
} from "@/server/dto/knowledge-base.dto";
import { HierarchicalKnowledgeEntryList } from "./hierarchical-knowledge-entry-list";

interface ProjectKnowledgeBaseSectionProps {
  initialProjectEntries: KnowledgeEntryDto[];
  initialProjectDocuments: KnowledgeDocumentDto[];
  initialHierarchicalEntries: HierarchicalKnowledgeEntryDto[];
  projectId: string;
  organizationId: string;
  canEdit: boolean;
}

/**
 * Client component for managing project knowledge base
 * Shows project entries and inherited entries from organization and global scopes
 */
export function ProjectKnowledgeBaseSection({
  initialProjectEntries,
  initialProjectDocuments,
  initialHierarchicalEntries,
  projectId,
  organizationId,
  canEdit,
}: ProjectKnowledgeBaseSectionProps) {
  const [projectEntries, setProjectEntries] = useState(initialProjectEntries);
  const [documents, setDocuments] = useState(initialProjectDocuments);
  const [hierarchicalEntries, setHierarchicalEntries] =
    useState(initialHierarchicalEntries);
  const [showCreateEntryDialog, setShowCreateEntryDialog] = useState(false);
  const [showUploadDocumentDialog, setShowUploadDocumentDialog] = useState(false);

  const handleEntryCreated = (entry: KnowledgeEntryDto) => {
    setProjectEntries((prev) => [...prev, entry]);
    // Update hierarchical entries to include new project entry
    setHierarchicalEntries((prev) => {
      const updated = [...prev];
      // Add new entry with priority 1 (project)
      updated.push({ ...entry, priority: 1 });
      // Remove any existing entry with same term (project overrides)
      return updated
        .filter((e, idx, arr) => {
          const firstIndex = arr.findIndex(
            (item) => item.term.toLowerCase() === e.term.toLowerCase()
          );
          return idx === firstIndex;
        })
        .sort((a, b) => {
          // Sort by priority first, then by term
          if (a.priority !== b.priority) {
            return a.priority - b.priority;
          }
          return a.term.localeCompare(b.term);
        });
    });
  };

  const handleEntryUpdated = (updatedEntry: KnowledgeEntryDto) => {
    setProjectEntries((prev) =>
      prev.map((e) => (e.id === updatedEntry.id ? updatedEntry : e))
    );
    // Update hierarchical entries
    setHierarchicalEntries((prev) =>
      prev.map((e) =>
        e.id === updatedEntry.id ? { ...updatedEntry, priority: 1 } : e
      )
    );
  };

  const handleEntryDeleted = (entryId: string) => {
    setProjectEntries((prev) => prev.filter((e) => e.id !== entryId));
    // Remove from hierarchical entries if it's a project entry
    setHierarchicalEntries((prev) => {
      const deleted = prev.find((e) => e.id === entryId);
      if (deleted && deleted.priority === 1) {
        // Find if there's an org/global entry with same term to restore
        const term = deleted.term.toLowerCase();
        const otherScopes = prev.filter(
          (e) =>
            e.term.toLowerCase() === term &&
            e.id !== entryId &&
            e.priority > 1
        );
        // Remove the deleted entry, keep others
        return prev.filter((e) => e.id !== entryId);
      }
      return prev.filter((e) => e.id !== entryId);
    });
  };

  const handleDocumentUploaded = (document: KnowledgeDocumentDto) => {
    setDocuments((prev) => [...prev, document]);
  };

  const handleDocumentDeleted = (documentId: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== documentId));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BookOpenIcon className="h-5 w-5" />
              Knowledge Base
            </CardTitle>
            <CardDescription>
              Manage project-specific terms and definitions. Inherited entries
              from organization and global scopes are shown below.
            </CardDescription>
          </div>
          {canEdit && (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => setShowCreateEntryDialog(true)}
                variant="outline"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Entry
              </Button>
              <Button
                size="sm"
                onClick={() => setShowUploadDocumentDialog(true)}
                variant="outline"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Upload Document
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all" className="flex items-center gap-2">
              <BookOpenIcon className="h-4 w-4" />
              All Knowledge ({hierarchicalEntries.length})
            </TabsTrigger>
            <TabsTrigger value="project" className="flex items-center gap-2">
              <BookOpenIcon className="h-4 w-4" />
              Project ({projectEntries.length})
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileTextIcon className="h-4 w-4" />
              Documents ({documents.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-4">
            <HierarchicalKnowledgeEntryList
              entries={hierarchicalEntries}
              projectId={projectId}
              organizationId={organizationId}
              canEdit={canEdit}
              onEntryUpdated={handleEntryUpdated}
              onEntryDeleted={handleEntryDeleted}
            />
          </TabsContent>
          <TabsContent value="project" className="mt-4">
            <KnowledgeEntryList
              entries={projectEntries}
              scope="project"
              scopeId={projectId}
              canEdit={canEdit}
              onEntryUpdated={handleEntryUpdated}
              onEntryDeleted={handleEntryDeleted}
            />
          </TabsContent>
          <TabsContent value="documents" className="mt-4">
            <KnowledgeDocumentList
              documents={documents}
              scope="project"
              scopeId={projectId}
              canEdit={canEdit}
              onDocumentDeleted={handleDocumentDeleted}
            />
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Dialogs */}
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

