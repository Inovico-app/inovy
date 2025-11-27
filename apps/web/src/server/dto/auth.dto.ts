/**
 * Data Transfer Objects for Better Auth
 * These types match the structure used throughout the application
 */

/**
 * Auth User DTO
 */
export interface AuthUserDto {
  id: string;
  email: string | null;
  given_name: string | null;
  family_name: string | null;
  picture: string | null;
  is_suspended?: boolean;
  created_on?: string;
  last_signed_in?: string;
}

/**
 * Auth Organization DTO
 */
export interface AuthOrganizationDto {
  id: string; // The organization's unique ID
  name: string;
  is_default?: boolean;
  created_on?: string;
}

/**
 * Auth Organization User DTO (user within an organization context)
 */
export interface AuthOrganizationUserDto {
  id: string;
  email: string | null;
  given_name: string | null;
  family_name: string | null;
  roles?: string[];
}

