"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { BookIcon, CalendarIcon, ClockIcon, FolderIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { forwardRef } from "react";
import { ConfidenceBadge } from "./confidence-indicator";

interface SourceReference {
  contentId: string;
  contentType:
    | "recording"
    | "transcription"
    | "summary"
    | "task"
    | "knowledge_document";
  title: string;
  excerpt: string;
  similarityScore: number;
  recordingId?: string;
  timestamp?: number;
  recordingDate?: string;
  projectName?: string;
  projectId?: string;
  documentTitle?: string;
}

interface EnhancedSourceCardProps {
  source: SourceReference;
  sourceIndex: number;
  className?: string;
}

export const EnhancedSourceCard = forwardRef<
  HTMLDivElement,
  EnhancedSourceCardProps
>(({ source, sourceIndex, className }, ref) => {
  // Build the URL with optional timestamp
  const getSourceUrl = () => {
    const projectId = source.projectId;
    const recordingId = source.recordingId;

    if (!projectId || !recordingId) {
      return "#";
    }

    const baseUrl = `/projects/${projectId}/recordings/${recordingId}`;
    if (source.timestamp !== undefined) {
      return `${baseUrl}?t=${Math.floor(source.timestamp)}`;
    }
    return baseUrl;
  };

  // Format timestamp as MM:SS
  const formatTimestamp = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Format date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const url = getSourceUrl();
  const isClickable = url !== "#";

  const content = (
    <div
      ref={ref}
      className={cn(
        "flex flex-col gap-2 p-3 rounded-lg border bg-card text-card-foreground",
        "scroll-mt-24", // For smooth scroll offset
        isClickable &&
          "hover:bg-accent/50 transition-colors duration-200 cursor-pointer",
        className
      )}
      id={`source-${sourceIndex}`}
    >
      {/* Header: Title, Type Badge, and Citation Number */}
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0 mt-0.5">
          <BookIcon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm truncate">{source.title}</span>
            <Badge variant="outline" className="text-xs flex-shrink-0">
              {source.contentType}
            </Badge>
            <span className="text-xs font-semibold text-primary flex-shrink-0">
              [{sourceIndex + 1}]
            </span>
          </div>
        </div>
      </div>

      {/* Excerpt */}
      <p className="text-xs text-muted-foreground leading-relaxed">
        {source.excerpt}
      </p>

      {/* Metadata Row */}
      <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
        {/* Confidence Score */}
        <ConfidenceBadge score={source.similarityScore} />

        {/* Recording Date */}
        {source.recordingDate && (
          <div className="flex items-center gap-1">
            <CalendarIcon className="h-3 w-3" />
            <span>{formatDate(source.recordingDate)}</span>
          </div>
        )}

        {/* Timestamp */}
        {source.timestamp !== undefined && (
          <div className="flex items-center gap-1">
            <ClockIcon className="h-3 w-3" />
            <span>{formatTimestamp(source.timestamp)}</span>
          </div>
        )}

        {/* Project Name (for organization context) */}
        {source.projectName && (
          <div className="flex items-center gap-1">
            <FolderIcon className="h-3 w-3" />
            <span className="truncate">{source.projectName}</span>
          </div>
        )}
      </div>
    </div>
  );

  if (!isClickable) {
    return content;
  }

  return (
    <Link href={url as Route} target="_blank" rel="noopener noreferrer">
      {content}
    </Link>
  );
});

EnhancedSourceCard.displayName = "EnhancedSourceCard";

