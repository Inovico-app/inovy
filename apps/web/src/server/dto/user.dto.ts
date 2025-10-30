/**
 * Data Transfer Objects for User-related operations
 */

export interface CreateUserDto {
  kindeId: string;
  email: string;
  givenName?: string | null;
  familyName?: string | null;
  picture?: string | null;
  organizationId: string;
}

export interface UpdateUserDto {
  email?: string;
  givenName?: string | null;
  familyName?: string | null;
  picture?: string | null;
  organizationId?: string;
}

export interface UserDto {
  id: string;
  kindeId: string;
  email: string;
  givenName?: string | null;
  familyName?: string | null;
  picture?: string | null;
  organizationId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserWithOrganizationDto extends UserDto {
  organization: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface UserFiltersDto {
  kindeId?: string;
  email?: string;
  organizationId?: string;
  limit?: number;
  offset?: number;
}

// Type guards for runtime validation
export function isCreateUserDto(data: unknown): data is CreateUserDto {
  if (typeof data !== "object" || data === null) {
    return false;
  }
  const record = data as Record<string, unknown>;
  return (
    typeof record.kindeId === "string" &&
    typeof record.email === "string" &&
    typeof record.organizationId === "string" &&
    (record.givenName === undefined || typeof record.givenName === "string") &&
    (record.familyName === undefined || typeof record.familyName === "string") &&
    (record.picture === undefined || typeof record.picture === "string")
  );
}

export function isUpdateUserDto(data: unknown): data is UpdateUserDto {
  if (typeof data !== "object" || data === null) {
    return false;
  }
  const record = data as Record<string, unknown>;
  return (
    (record.email === undefined || typeof record.email === "string") &&
    (record.givenName === undefined || typeof record.givenName === "string") &&
    (record.familyName === undefined || typeof record.familyName === "string") &&
    (record.picture === undefined || typeof record.picture === "string") &&
    (record.organizationId === undefined ||
      typeof record.organizationId === "string")
  );
}

