/**
 * Data Transfer Objects for Organization-related operations
 */

export interface CreateOrganizationDto {
  kindeId: string;
  name: string;
  slug: string;
}

export interface UpdateOrganizationDto {
  name?: string;
  slug?: string;
}

export interface OrganizationDto {
  id: string;
  kindeId: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationWithStatsDto extends OrganizationDto {
  memberCount: number;
  projectCount: number;
}

export interface OrganizationFiltersDto {
  kindeId?: string;
  slug?: string;
  name?: string;
  limit?: number;
  offset?: number;
}

// Type guards for runtime validation
export function isCreateOrganizationDto(
  data: any
): data is CreateOrganizationDto {
  return (
    typeof data === "object" &&
    data !== null &&
    typeof data.kindeId === "string" &&
    typeof data.name === "string" &&
    typeof data.slug === "string"
  );
}

export function isUpdateOrganizationDto(
  data: any
): data is UpdateOrganizationDto {
  return (
    typeof data === "object" &&
    data !== null &&
    (data.name === undefined || typeof data.name === "string") &&
    (data.slug === undefined || typeof data.slug === "string")
  );
}

