import { getCachedProjectTemplate } from "@/server/cache/project-template.cache";
import { ProjectTemplateSectionClient } from "./project-template-section-client";

interface ProjectTemplateSectionProps {
  projectId: string;
}

/**
 * Server component for project template section
 * Fetches the cached template server-side and passes it to the client component
 */
export async function ProjectTemplateSection({
  projectId,
}: ProjectTemplateSectionProps) {
  const template = await getCachedProjectTemplate(projectId);

  return (
    <ProjectTemplateSectionClient
      projectId={projectId}
      initialTemplate={template}
    />
  );
}
