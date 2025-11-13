"use client";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { BookOpenIcon, InfoIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { getKnowledgeEntriesByIdsAction } from "../actions/get-entries-by-ids";
import type { KnowledgeEntryDto } from "@/server/dto/knowledge-base.dto";

interface KnowledgeUsageIndicatorProps {
  knowledgeEntryIds: string[] | undefined | null;
  variant?: "default" | "compact" | "badge-only";
  className?: string;
}

/**
 * Component that displays knowledge base entries that were used in AI-generated content
 */
export function KnowledgeUsageIndicator({
  knowledgeEntryIds,
  variant = "default",
  className,
}: KnowledgeUsageIndicatorProps) {
  const [entries, setEntries] = useState<KnowledgeEntryDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!knowledgeEntryIds || knowledgeEntryIds.length === 0) {
      setEntries([]);
      return;
    }

    const fetchEntries = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await getKnowledgeEntriesByIdsAction({
          ids: knowledgeEntryIds,
        });

        if (result?.serverError) {
          setError(result.serverError);
          return;
        }

        if (result?.validationErrors) {
          setError("Validation failed");
          return;
        }

        if (result?.data) {
          setEntries(result.data);
        }
      } catch (err) {
        console.error("Error fetching knowledge entries:", err);
        setError("Failed to load knowledge entries");
      } finally {
        setIsLoading(false);
      }
    };

    void fetchEntries();
  }, [knowledgeEntryIds]);

  if (!knowledgeEntryIds || knowledgeEntryIds.length === 0) {
    return null;
  }

  if (variant === "badge-only") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="gap-1">
              <BookOpenIcon className="h-3 w-3" />
              {knowledgeEntryIds.length} term{knowledgeEntryIds.length !== 1 ? "s" : ""}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {knowledgeEntryIds.length} knowledge base term
              {knowledgeEntryIds.length !== 1 ? "s" : ""} used in this content
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (variant === "compact") {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <BookOpenIcon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          {knowledgeEntryIds.length} knowledge term
          {knowledgeEntryIds.length !== 1 ? "s" : ""} used
        </span>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-2">
        <BookOpenIcon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Knowledge Base Terms Used</span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <InfoIcon className="h-3 w-3 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p>
                These terms from the knowledge base were used to improve the
                accuracy of this AI-generated content
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : error ? (
        <div className="text-sm text-destructive">{error}</div>
      ) : entries.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {entries.map((entry) => (
            <TooltipProvider key={entry.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="cursor-help">
                    {entry.term}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <div className="space-y-1">
                    <p className="font-semibold">{entry.term}</p>
                    <p className="text-sm">{entry.definition}</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      ) : (
        <Badge variant="outline">
          {knowledgeEntryIds.length} term{knowledgeEntryIds.length !== 1 ? "s" : ""} used
        </Badge>
      )}
    </div>
  );
}

