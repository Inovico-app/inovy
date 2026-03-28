"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { CATEGORY_CONFIG } from "../lib/vocabulary-category";
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
    null,
  );
  const [deletingEntry, setDeletingEntry] = useState<KnowledgeEntryDto | null>(
    null,
  );

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
          <BookOpenIcon className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">
          No project entries yet
        </p>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          Create entries to define terms and their meanings for this project
        </p>
        {canEdit && onCreateClick && (
          <Button onClick={onCreateClick} size="sm" className="mt-4">
            <PlusIcon className="h-3.5 w-3.5 mr-1.5" />
            Add Entry
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="group flex items-start gap-3 rounded-lg border border-border/60 bg-card p-3.5 transition-colors hover:border-border"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <BookOpenIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">
                {entry.term}
              </span>
              <Badge
                variant={entry.isActive ? "default" : "secondary"}
                className="text-[10px] py-0"
              >
                {entry.isActive ? "Active" : "Inactive"}
              </Badge>
              {entry.boost != null && (
                <Badge variant="outline" className="text-[10px] py-0 font-mono">
                  {entry.boost}x
                </Badge>
              )}
              {entry.category && entry.category !== "custom" && (
                <Badge
                  variant="outline"
                  className={`text-[10px] py-0 border ${CATEGORY_CONFIG[entry.category].color}`}
                >
                  {CATEGORY_CONFIG[entry.category].label}
                </Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
              {entry.definition}
            </p>
            {entry.context && (
              <p className="mt-1 text-xs text-muted-foreground/80">
                <span className="font-medium">Context:</span> {entry.context}
              </p>
            )}
            {entry.examples && entry.examples.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {entry.examples.map((example, idx) => (
                  <span
                    key={`example-${idx}-${example.slice(0, 20)}`}
                    className="inline-block rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                  >
                    {example}
                  </span>
                ))}
              </div>
            )}
          </div>
          {canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label={`Actions for ${entry.term}`}
                  />
                }
              >
                <MoreVerticalIcon className="h-4 w-4" />
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
      ))}

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
