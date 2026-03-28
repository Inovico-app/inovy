import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileTextIcon, BuildingIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { UploadDocumentButton } from "./upload-document-button";

interface ProjectKnowledgeContextCardProps {
  projectDocumentCount: number;
  orgDocumentCount: number;
  projectId: string;
}

export async function ProjectKnowledgeContextCard({
  projectDocumentCount,
  orgDocumentCount,
  projectId,
}: ProjectKnowledgeContextCardProps) {
  const t = await getTranslations("projects");
  const totalCount = projectDocumentCount + orgDocumentCount;

  if (totalCount === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("knowledgeContext")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {t("knowledgeContextNoDocuments")}
            </p>
            <UploadDocumentButton scope="project" scopeId={projectId} />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("knowledgeContext")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <FileTextIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{projectDocumentCount}</p>
              <p className="text-xs text-muted-foreground">
                {t("knowledgeContextProject")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <BuildingIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{orgDocumentCount}</p>
              <p className="text-xs text-muted-foreground">
                {t("knowledgeContextOrg")}
              </p>
            </div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("knowledgeContextDescription")}
        </p>
        <div className="flex items-center gap-3">
          <UploadDocumentButton scope="project" scopeId={projectId} />
          <Link
            href={`/projects/${projectId}/settings`}
            className="text-sm text-primary hover:underline"
          >
            {t("knowledgeContextManage")} →
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
