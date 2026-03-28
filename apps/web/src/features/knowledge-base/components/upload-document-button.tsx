"use client";

import { Button, type buttonVariants } from "@/components/ui/button";
import type { KnowledgeBaseScope } from "@/server/db/schema/knowledge-base-entries";
import type { VariantProps } from "class-variance-authority";
import { UploadIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { UploadKnowledgeDocumentDialog } from "./upload-knowledge-document-dialog";

interface UploadDocumentButtonProps {
  scope: KnowledgeBaseScope;
  scopeId: string;
  variant?: VariantProps<typeof buttonVariants>["variant"];
  size?: VariantProps<typeof buttonVariants>["size"];
}

export function UploadDocumentButton({
  scope,
  scopeId,
  variant = "outline",
  size = "sm",
}: UploadDocumentButtonProps) {
  const t = useTranslations("projects");
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <Button variant={variant} size={size} onClick={() => setDialogOpen(true)}>
        <UploadIcon className="h-4 w-4 mr-1.5" />
        {t("knowledgeContextUpload")}
      </Button>
      <UploadKnowledgeDocumentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        scope={scope}
        scopeId={scopeId}
        onSuccess={() => router.refresh()}
      />
    </>
  );
}
