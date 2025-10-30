/**
 * Data Transfer Objects for Project-related operations
 * organizationId and createdById are now Kinde IDs (strings)
 */

import type { AllowedStatus } from "../data-access/projects.queries";

export interface CreateProjectDto {
  name: string;
  description?: string;
  organizationId: string; // Kinde organization code
  createdById: string; // Kinde user ID
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
  organizationId: string; // Kinde organization code
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectWithCreatorDto extends ProjectDto {
  createdById: string; // Kinde user ID
}

export interface ProjectWithCreatorDetailsDto extends ProjectWithCreatorDto {
  createdBy: {
    id: string;
    givenName: string | null;
    familyName: string | null;
    email: string | null;
  };
}

export interface ProjectFiltersDto {
  organizationId: string;
  status?: AllowedStatus;
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

