/**
 * Data Transfer Objects for Organization Settings operations
 */

export interface OrganizationInstructionsDto {
  id: string;
  organizationId: string;
  instructions: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOrganizationInstructionsDto {
  instructions: string;
  organizationId: string;
  createdById: string;
}

export interface UpdateOrganizationInstructionsDto {
  instructions: string;
  updatedAt?: Date;
}

