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
export function isCreateProjectDto(data: unknown): data is CreateProjectDto {
  if (typeof data !== "object" || data === null) {
    return false;
  }
  const record = data as Record<string, unknown>;
  return (
    typeof record.name === "string" &&
    typeof record.organizationId === "string" &&
    typeof record.createdById === "string" &&
    (record.description === undefined || typeof record.description === "string")
  );
}

export function isUpdateProjectDto(data: unknown): data is UpdateProjectDto {
  if (typeof data !== "object" || data === null) {
    return false;
  }
  const record = data as Record<string, unknown>;
  return (
    (record.name === undefined || typeof record.name === "string") &&
    (record.description === undefined || typeof record.description === "string") &&
    (record.status === undefined || typeof record.status === "string")
  );
}

