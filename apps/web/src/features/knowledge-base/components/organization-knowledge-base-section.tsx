"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  KnowledgeDocumentDto,
  KnowledgeEntryDto,
} from "@/server/dto/knowledge-base.dto";
import { BookOpenIcon, FileTextIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { CreateKnowledgeEntryDialog } from "./create-knowledge-entry-dialog";
import { KnowledgeDocumentList } from "./knowledge-document-list";
import { KnowledgeEntryList } from "./knowledge-entry-list";
import { UploadKnowledgeDocumentDialog } from "./upload-knowledge-document-dialog";

interface OrganizationKnowledgeBaseSectionProps {
  initialEntries: KnowledgeEntryDto[];
  initialDocuments: KnowledgeDocumentDto[];
  organizationId: string;
  canEdit: boolean;
}

/**
 * Client component for managing organization knowledge base
 */
export function OrganizationKnowledgeBaseSection({
  initialEntries,
  initialDocuments,
  organizationId,
  canEdit,
}: OrganizationKnowledgeBaseSectionProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [documents, setDocuments] = useState(initialDocuments);
  const [showCreateEntryDialog, setShowCreateEntryDialog] = useState(false);
  const [showUploadDocumentDialog, setShowUploadDocumentDialog] =
    useState(false);

  const handleEntryCreated = (entry: KnowledgeEntryDto) => {
    setEntries((prev) => [...prev, entry]);
  };

  const handleEntryUpdated = (updatedEntry: KnowledgeEntryDto) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === updatedEntry.id ? updatedEntry : e))
    );
  };

  const handleEntryDeleted = (entryId: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== entryId));
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
              Manage organization-wide terms, definitions, and documents
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
                Batch Upload Documents
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="entries" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="entries" className="flex items-center gap-2">
              <BookOpenIcon className="h-4 w-4" />
              Entries ({entries.length})
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileTextIcon className="h-4 w-4" />
              Documents ({documents.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="entries" className="mt-4">
            <KnowledgeEntryList
              entries={entries}
              scope="organization"
              scopeId={organizationId}
              canEdit={canEdit}
              onEntryUpdated={handleEntryUpdated}
              onEntryDeleted={handleEntryDeleted}
              onCreateClick={() => setShowCreateEntryDialog(true)}
            />
          </TabsContent>
          <TabsContent value="documents" className="mt-4">
            <KnowledgeDocumentList
              documents={documents}
              scope="organization"
              scopeId={organizationId}
              canEdit={canEdit}
              onDocumentDeleted={handleDocumentDeleted}
              onUploadClick={() => setShowUploadDocumentDialog(true)}
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
            scope="organization"
            scopeId={organizationId}
            onSuccess={handleEntryCreated}
          />
          <UploadKnowledgeDocumentDialog
            open={showUploadDocumentDialog}
            onOpenChange={setShowUploadDocumentDialog}
            scope="organization"
            scopeId={organizationId}
            onSuccess={handleDocumentUploaded}
          />
        </>
      )}
    </Card>
  );
}

