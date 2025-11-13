"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PencilIcon, TrashIcon, MoreVerticalIcon, ArrowUpIcon } from "lucide-react";
import { useState } from "react";
import type { HierarchicalKnowledgeEntryDto } from "@/server/dto/knowledge-base.dto";
import { EditKnowledgeEntryDialog } from "./edit-knowledge-entry-dialog";
import { DeleteKnowledgeEntryDialog } from "./delete-knowledge-entry-dialog";

interface HierarchicalKnowledgeEntryListProps {
  entries: HierarchicalKnowledgeEntryDto[];
  projectId: string;
  organizationId: string;
  canEdit: boolean;
  onEntryUpdated: (entry: HierarchicalKnowledgeEntryDto) => void;
  onEntryDeleted: (entryId: string) => void;
}

const scopeLabels: Record<number, { label: string; variant: "default" | "secondary" | "outline" }> = {
  1: { label: "Project", variant: "default" },
  2: { label: "Organization", variant: "secondary" },
  3: { label: "Global", variant: "outline" },
};

export function HierarchicalKnowledgeEntryList({
  entries,
  projectId,
  organizationId,
  canEdit,
  onEntryUpdated,
  onEntryDeleted,
}: HierarchicalKnowledgeEntryListProps) {
  const [editingEntry, setEditingEntry] = useState<HierarchicalKnowledgeEntryDto | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<HierarchicalKnowledgeEntryDto | null>(null);

  if (entries.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No knowledge entries available</p>
        <p className="text-sm text-muted-foreground mt-2">
          Project entries override organization entries, which override global entries
        </p>
      </div>
    );
  }

  // Group entries by scope/priority
  const projectEntries = entries.filter((e) => e.priority === 1);
  const orgEntries = entries.filter((e) => e.priority === 2);
  const globalEntries = entries.filter((e) => e.priority === 3);

  return (
    <div className="space-y-6">
      {/* Project Entries */}
      {projectEntries.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Project Entries</h3>
          <div className="space-y-4">
            {projectEntries.map((entry) => (
              <Card key={entry.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-lg">{entry.term}</CardTitle>
                        <Badge variant={scopeLabels[entry.priority].variant}>
                          {scopeLabels[entry.priority].label}
                        </Badge>
                        {entry.isActive ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                      <CardDescription className="mt-2 whitespace-pre-wrap">
                        {entry.definition}
                      </CardDescription>
                      {entry.context && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          <strong>Context:</strong> {entry.context}
                        </div>
                      )}
                      {entry.examples && entry.examples.length > 0 && (
                        <div className="mt-2">
                          <strong className="text-sm">Examples:</strong>
                          <ul className="list-disc list-inside mt-1 text-sm text-muted-foreground">
                            {entry.examples.map((example, idx) => (
                              <li key={idx}>{example}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    {canEdit && entry.priority === 1 && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVerticalIcon className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingEntry(entry)}>
                            <PencilIcon className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeletingEntry(entry)}
                            className="text-destructive focus:text-destructive"
                          >
                            <TrashIcon className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Inherited Organization Entries */}
      {orgEntries.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            Inherited from Organization
            <Badge variant="secondary" className="text-xs">
              Read-only
            </Badge>
          </h3>
          <div className="space-y-4">
            {orgEntries.map((entry) => (
              <Card key={entry.id} className="opacity-90">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-lg">{entry.term}</CardTitle>
                        <Badge variant={scopeLabels[entry.priority].variant}>
                          {scopeLabels[entry.priority].label}
                        </Badge>
                        {entry.isActive ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                      <CardDescription className="mt-2 whitespace-pre-wrap">
                        {entry.definition}
                      </CardDescription>
                      {entry.context && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          <strong>Context:</strong> {entry.context}
                        </div>
                      )}
                      {entry.examples && entry.examples.length > 0 && (
                        <div className="mt-2">
                          <strong className="text-sm">Examples:</strong>
                          <ul className="list-disc list-inside mt-1 text-sm text-muted-foreground">
                            {entry.examples.map((example, idx) => (
                              <li key={idx}>{example}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Inherited Global Entries */}
      {globalEntries.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            Inherited from Global
            <Badge variant="outline" className="text-xs">
              Read-only
            </Badge>
          </h3>
          <div className="space-y-4">
            {globalEntries.map((entry) => (
              <Card key={entry.id} className="opacity-90">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-lg">{entry.term}</CardTitle>
                        <Badge variant={scopeLabels[entry.priority].variant}>
                          {scopeLabels[entry.priority].label}
                        </Badge>
                        {entry.isActive ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                      <CardDescription className="mt-2 whitespace-pre-wrap">
                        {entry.definition}
                      </CardDescription>
                      {entry.context && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          <strong>Context:</strong> {entry.context}
                        </div>
                      )}
                      {entry.examples && entry.examples.length > 0 && (
                        <div className="mt-2">
                          <strong className="text-sm">Examples:</strong>
                          <ul className="list-disc list-inside mt-1 text-sm text-muted-foreground">
                            {entry.examples.map((example, idx) => (
                              <li key={idx}>{example}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      {editingEntry && (
        <EditKnowledgeEntryDialog
          entry={editingEntry}
          open={!!editingEntry}
          onOpenChange={(open) => !open && setEditingEntry(null)}
          onSuccess={(updatedEntry) => {
            onEntryUpdated({ ...updatedEntry, priority: editingEntry.priority });
            setEditingEntry(null);
          }}
        />
      )}

      {/* Delete Dialog */}
      {deletingEntry && (
        <DeleteKnowledgeEntryDialog
          entry={deletingEntry}
          open={!!deletingEntry}
          onOpenChange={(open) => !open && setDeletingEntry(null)}
          onSuccess={() => {
            onEntryDeleted(deletingEntry.id);
            setDeletingEntry(null);
          }}
        />
      )}
    </div>
  );
}

