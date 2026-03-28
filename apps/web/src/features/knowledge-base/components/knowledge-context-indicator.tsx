"use client";

import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { DocumentProcessingStatus } from "@/server/db/schema/knowledge-base-documents";
import {
  ChevronDownIcon,
  FileTextIcon,
  CheckCircle2Icon,
  Loader2Icon,
  ClockIcon,
  AlertCircleIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { UploadDocumentButton } from "./upload-document-button";

/** Narrow projection — avoids serializing extractedText across the RSC boundary */
export interface KnowledgeDocumentSummary {
  id: string;
  title: string;
  processingStatus: DocumentProcessingStatus;
}

interface KnowledgeContextIndicatorProps {
  projectDocuments: KnowledgeDocumentSummary[];
  orgDocuments: KnowledgeDocumentSummary[];
  projectId: string;
}

const MAX_VISIBLE_DOCS = 3;

const STATUS_TRANSLATION_KEY: Record<DocumentProcessingStatus, string> = {
  completed: "knowledgeContextProcessed",
  processing: "knowledgeContextProcessing",
  pending: "knowledgeContextPending",
  failed: "knowledgeContextFailed",
};

function ProcessingStatusIcon({
  status,
}: {
  status: DocumentProcessingStatus;
}) {
  switch (status) {
    case "completed":
      return (
        <CheckCircle2Icon className="h-3 w-3 text-green-600 dark:text-green-400" />
      );
    case "processing":
      return (
        <Loader2Icon className="h-3 w-3 animate-spin text-blue-600 dark:text-blue-400" />
      );
    case "pending":
      return <ClockIcon className="h-3 w-3 text-muted-foreground" />;
    case "failed":
      return <AlertCircleIcon className="h-3 w-3 text-destructive" />;
    default:
      return <ClockIcon className="h-3 w-3 text-muted-foreground" />;
  }
}

function DocumentGroup({
  label,
  documents,
}: {
  label: string;
  documents: KnowledgeDocumentSummary[];
}) {
  const t = useTranslations("projects");
  const visible = documents.slice(0, MAX_VISIBLE_DOCS);
  const remaining = documents.length - MAX_VISIBLE_DOCS;

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">
        {label} ({documents.length})
      </p>
      {visible.map((doc) => {
        const statusKey = STATUS_TRANSLATION_KEY[doc.processingStatus];
        return (
          <div key={doc.id} className="flex items-center gap-2 text-sm">
            <FileTextIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="truncate flex-1">{doc.title}</span>
            <div className="flex items-center gap-1 shrink-0">
              <ProcessingStatusIcon status={doc.processingStatus} />
              <span className="text-xs text-muted-foreground">
                {t(statusKey as Parameters<typeof t>[0])}
              </span>
            </div>
          </div>
        );
      })}
      {remaining > 0 && (
        <p className="text-xs text-muted-foreground pl-6">
          {t("knowledgeContextMore", { count: remaining })}
        </p>
      )}
    </div>
  );
}

export function KnowledgeContextIndicator({
  projectDocuments,
  orgDocuments,
  projectId,
}: KnowledgeContextIndicatorProps) {
  const t = useTranslations("projects");
  const [isOpen, setIsOpen] = useState(false);
  const totalCount = projectDocuments.length + orgDocuments.length;

  if (totalCount === 0) {
    return (
      <div className="rounded-lg border border-dashed p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileTextIcon className="h-4 w-4" />
            <span>{t("knowledgeContextNoDocuments")}</span>
          </div>
          <UploadDocumentButton scope="project" scopeId={projectId} />
        </div>
      </div>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-lg border bg-card">
        <CollapsibleTrigger className="flex w-full items-center justify-between p-4 hover:bg-accent/50 transition-colors rounded-lg">
          <div className="flex items-center gap-3">
            <FileTextIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {t("knowledgeContextDocuments", { count: totalCount })}
            </span>
            <div className="flex items-center gap-1.5">
              {projectDocuments.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {t("knowledgeContextProject")} ({projectDocuments.length})
                </Badge>
              )}
              {orgDocuments.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {t("knowledgeContextOrg")} ({orgDocuments.length})
                </Badge>
              )}
            </div>
          </div>
          <ChevronDownIcon
            className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          />
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4">
            <div className="border-t pt-3 space-y-3">
              {projectDocuments.length > 0 && (
                <DocumentGroup
                  label={t("knowledgeContextProject")}
                  documents={projectDocuments}
                />
              )}
              {orgDocuments.length > 0 && (
                <DocumentGroup
                  label={t("knowledgeContextOrg")}
                  documents={orgDocuments}
                />
              )}
            </div>
            <div className="border-t pt-3 flex items-center gap-3">
              <UploadDocumentButton scope="project" scopeId={projectId} />
              <Link
                href={`/projects/${projectId}/settings`}
                className="text-sm text-primary hover:underline"
              >
                {t("knowledgeContextManage")} →
              </Link>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
