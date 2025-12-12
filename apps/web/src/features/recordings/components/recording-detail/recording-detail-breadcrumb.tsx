import { getCachedProjectById } from "@/server/cache/project.cache";
import { getCachedRecordingById } from "@/server/cache/recording.cache";
import type { Route } from "next";
import Link from "next/link";

interface RecordingDetailBreadcrumbProps {
  projectId: string;
  recordingId: string;
}

export async function RecordingDetailBreadcrumb({
  projectId,
  recordingId,
}: RecordingDetailBreadcrumbProps) {
  const [project, recording] = await Promise.all([
    getCachedProjectById(projectId),
    getCachedRecordingById(recordingId),
  ]);

  return (
    <nav className="flex items-center gap-2 text-sm text-muted-foreground">
      <Link
        href="/projects"
        className="hover:text-foreground transition-colors"
      >
        Projects
      </Link>
      <span>/</span>
      <Link
        href={`/projects/${projectId}` as Route}
        className="hover:text-foreground transition-colors"
      >
        {project?.name ?? "Project"}
      </Link>
      <span>/</span>
      <Link
        href={`/projects/${projectId}` as Route}
        className="hover:text-foreground transition-colors"
      >
        Recordings
      </Link>
      <span>/</span>
      <span className="text-foreground font-medium truncate">
        {recording?.title ?? "Recording"}
      </span>
    </nav>
  );
}

