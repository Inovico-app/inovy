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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { KnowledgeBaseScope } from "@/server/db/schema/knowledge-base-entries";
import type { KnowledgeEntryDto } from "@/server/dto/knowledge-base.dto";
import {
  BookOpenIcon,
  MoreVerticalIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "lucide-react";
import { useState } from "react";
import { DeleteKnowledgeEntryDialog } from "./delete-knowledge-entry-dialog";
import { EditKnowledgeEntryDialog } from "./edit-knowledge-entry-dialog";

interface KnowledgeEntryListProps {
  entries: KnowledgeEntryDto[];
  scope: KnowledgeBaseScope;
  scopeId: string | null;
  canEdit: boolean;
  onEntryUpdated: (entry: KnowledgeEntryDto) => void;
  onEntryDeleted: (entryId: string) => void;
  onCreateClick?: () => void;
}

export function KnowledgeEntryList({
  entries,
  scope: _scope,
  scopeId: _scopeId,
  canEdit,
  onEntryUpdated,
  onEntryDeleted,
  onCreateClick,
}: KnowledgeEntryListProps) {
  const [editingEntry, setEditingEntry] = useState<KnowledgeEntryDto | null>(
    null
  );
  const [deletingEntry, setDeletingEntry] = useState<KnowledgeEntryDto | null>(
    null
  );

  if (entries.length === 0) {
    return (
      <div className="text-center py-8">
        <BookOpenIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground font-medium">
          No knowledge entries yet
        </p>
        <p className="text-sm text-muted-foreground mt-2 mb-4">
          Create entries to define terms and their meanings for your
          organization
        </p>
        {canEdit && onCreateClick && (
          <Button onClick={onCreateClick} variant="default" size="sm">
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Entry
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {entries.map((entry) => (
        <Card key={entry.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg">{entry.term}</CardTitle>
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
              {canEdit && (
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
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant={entry.isActive ? "default" : "secondary"}>
                {entry.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Edit Dialog */}
      {editingEntry && (
        <EditKnowledgeEntryDialog
          entry={editingEntry}
          open={!!editingEntry}
          onOpenChange={(open) => !open && setEditingEntry(null)}
          onSuccess={(updatedEntry) => {
            onEntryUpdated(updatedEntry);
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

