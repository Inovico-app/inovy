import { ProjectTemplateService } from "@/server/services/project-template.service";
import { ProjectTemplateSectionClient } from "./project-template-section-client";

interface ProjectTemplateSectionProps {
  projectId: string;
}

/**
 * Render the project template section by fetching the project's template on the server and supplying it to the client component.
 *
 * @param projectId - The project identifier used to fetch the template
 * @returns The React element for the project template section with `initialTemplate` set to the fetched template value when available, or `null` otherwise
 */
export async function ProjectTemplateSection({
  projectId,
}: ProjectTemplateSectionProps) {
  const template = await ProjectTemplateService.getProjectTemplateByProjectId(
    projectId
  );

  return (
    <ProjectTemplateSectionClient
      projectId={projectId}
      initialTemplate={template.isOk() ? template.value : null}
    />
  );
}
