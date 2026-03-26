import { getCachedProjectByIdWithCreator } from "@/server/cache/project.cache";
import type { Route } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

interface RecordingDetailBreadcrumbProps {
  projectId: string;
  organizationId: string;
  recordingTitle: string;
}

export async function RecordingDetailBreadcrumb({
  projectId,
  organizationId,
  recordingTitle,
}: RecordingDetailBreadcrumbProps) {
  const t = await getTranslations("recordings");
  const project = await getCachedProjectByIdWithCreator(
    projectId,
    organizationId,
  );

  return (
    <nav className="flex items-center gap-2 text-sm text-muted-foreground">
      <Link
        href="/projects"
        className="hover:text-foreground transition-colors"
      >
        {t("detail.projects")}
      </Link>
      <span>/</span>
      <Link
        href={`/projects/${projectId}` as Route}
        className="hover:text-foreground transition-colors"
      >
        {project?.name ?? t("detail.project")}
      </Link>
      <span>/</span>
      <Link
        href={`/projects/${projectId}` as Route}
        className="hover:text-foreground transition-colors"
      >
        {t("detail.recordingsLink")}
      </Link>
      <span>/</span>
      <span className="text-foreground font-medium truncate">
        {recordingTitle}
      </span>
    </nav>
  );
}
