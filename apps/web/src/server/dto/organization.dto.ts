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
  data: unknown
): data is CreateOrganizationDto {
  return (
    typeof data === "object" &&
    data !== null &&
    "kindeId" in data &&
    "name" in data &&
    "slug" in data &&
    typeof (data as Record<string, unknown>).kindeId === "string" &&
    typeof (data as Record<string, unknown>).name === "string" &&
    typeof (data as Record<string, unknown>).slug === "string"
  );
}

export function isUpdateOrganizationDto(
  data: unknown
): data is UpdateOrganizationDto {
  if (typeof data !== "object" || data === null) {
    return false;
  }
  const record = data as Record<string, unknown>;
  return (
    (record.name === undefined || typeof record.name === "string") &&
    (record.slug === undefined || typeof record.slug === "string")
  );
}

