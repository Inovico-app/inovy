export interface ProjectTemplateDto {
  id: string;
  projectId: string;
  instructions: string;
  organizationId: string;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProjectTemplateDto {
  projectId: string;
  instructions: string;
  organizationId: string;
  createdById: string;
}

export interface UpdateProjectTemplateDto {
  instructions: string;
}

