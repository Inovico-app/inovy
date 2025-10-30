/**
 * Data Transfer Objects for Kinde Management API
 * These types match the structure returned by Kinde's API
 */

/**
 * Kinde User DTO
 */
export interface KindeUserDto {
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
 * Kinde Organization DTO
 */
export interface KindeOrganizationDto {
  code: string; // The organization's unique code/ID
  name: string;
  is_default?: boolean;
  created_on?: string;
}

/**
 * Kinde Organization User DTO (user within an organization context)
 */
export interface KindeOrganizationUserDto {
  id: string;
  email: string | null;
  given_name: string | null;
  family_name: string | null;
  roles?: string[];
}

/**
 * Create User Request
 */
export interface CreateKindeUserDto {
  profile: {
    given_name?: string;
    family_name?: string;
  };
  identities: Array<{
    type: "email";
    details: {
      email: string;
    };
  }>;
  organization_codes?: string[];
}

/**
 * Update User Request
 */
export interface UpdateKindeUserDto {
  given_name?: string;
  family_name?: string;
  is_suspended?: boolean;
}

/**
 * Create Organization Request
 */
export interface CreateKindeOrganizationDto {
  name: string;
  external_id?: string;
  background_color?: string;
  button_color?: string;
  button_text_color?: string;
  link_color?: string;
}

/**
 * Update Organization Request
 */
export interface UpdateKindeOrganizationDto {
  name?: string;
  external_id?: string;
  background_color?: string;
  button_color?: string;
  button_text_color?: string;
  link_color?: string;
}

