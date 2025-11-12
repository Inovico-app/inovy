/**
 * Organization Settings DTO
 * Data transfer object for organization-wide settings and instructions
 */

export interface OrganizationSettingsDto {
  id: string;
  organizationId: string;
  instructions: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOrganizationSettingsDto {
  organizationId: string;
  instructions: string;
  createdById: string;
}

export interface UpdateOrganizationSettingsDto {
  instructions: string;
}

