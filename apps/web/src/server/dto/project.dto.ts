/**
 * Data Transfer Objects for Project-related operations
 */

export interface CreateProjectDto {
  name: string;
  description?: string;
  organizationId: string;
  createdById: string;
}

export interface UpdateProjectDto {
  name?: string;
  description?: string;
  status?: string;
}

export interface ProjectDto {
  id: string;
  name: string;
  description: string | null;
  status: string;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectWithCreatorDto extends ProjectDto {
  createdBy: {
    id: string;
    givenName: string | null;
    familyName: string | null;
    email: string;
  };
}

export interface ProjectFiltersDto {
  organizationId: string;
  status?: string;
  createdById?: string;
  limit?: number;
  offset?: number;
}

// Type guards for runtime validation
export function isCreateProjectDto(data: any): data is CreateProjectDto {
  return (
    typeof data === "object" &&
    data !== null &&
    typeof data.name === "string" &&
    typeof data.organizationId === "string" &&
    typeof data.createdById === "string" &&
    (data.description === undefined || typeof data.description === "string")
  );
}

export function isUpdateProjectDto(data: any): data is UpdateProjectDto {
  return (
    typeof data === "object" &&
    data !== null &&
    (data.name === undefined || typeof data.name === "string") &&
    (data.description === undefined || typeof data.description === "string") &&
    (data.status === undefined || typeof data.status === "string")
  );
}

