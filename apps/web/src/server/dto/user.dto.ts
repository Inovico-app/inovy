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
export function isCreateUserDto(data: any): data is CreateUserDto {
  return (
    typeof data === "object" &&
    data !== null &&
    typeof data.kindeId === "string" &&
    typeof data.email === "string" &&
    typeof data.organizationId === "string" &&
    (data.givenName === undefined || typeof data.givenName === "string") &&
    (data.familyName === undefined || typeof data.familyName === "string") &&
    (data.picture === undefined || typeof data.picture === "string")
  );
}

export function isUpdateUserDto(data: any): data is UpdateUserDto {
  return (
    typeof data === "object" &&
    data !== null &&
    (data.email === undefined || typeof data.email === "string") &&
    (data.givenName === undefined || typeof data.givenName === "string") &&
    (data.familyName === undefined || typeof data.familyName === "string") &&
    (data.picture === undefined || typeof data.picture === "string") &&
    (data.organizationId === undefined ||
      typeof data.organizationId === "string")
  );
}

