import type { AuthUser } from "./auth";

/**
 * SSO/SAML utilities
 * 
 * NOTE: SSO/SAML requires Kinde Enterprise Connections to be configured in the Kinde dashboard.
 * This code provides utilities to detect and handle SSO users once SSO is configured.
 * 
 * To enable SSO:
 * 1. Configure Enterprise Connection in Kinde dashboard (Settings > Authentication > Enterprise Connections)
 * 2. Set up SAML/OIDC connection with your IdP (Okta, Azure AD, Google Workspace, etc.)
 * 3. Enable SSO for your organization in Kinde
 * 
 * Once configured, Kinde will handle SSO authentication flow automatically.
 */

/**
 * Check if a user logged in via SSO/SAML
 * 
 * NOTE: This will only return true after SSO is configured in Kinde dashboard.
 * SSO users will have specific attributes set by Kinde when authenticated via Enterprise Connection.
 */
export function isSSOUser(user: AuthUser): boolean {
  // Check for SSO indicators in user attributes
  // Kinde sets these when user authenticates via SSO/SAML Enterprise Connection
  // These attributes may not be available until SSO is configured in Kinde dashboard
  const userWithSSO = user as AuthUser & {
    sso_provider?: string;
    saml_session_index?: string;
    connection_id?: string; // Kinde Enterprise Connection ID
  };
  
  return !!(
    userWithSSO.sso_provider ||
    userWithSSO.saml_session_index ||
    userWithSSO.connection_id
  );
}

/**
 * Get SSO provider name if user logged in via SSO
 * 
 * NOTE: Returns null until SSO is configured in Kinde dashboard.
 */
export function getSSOProvider(
  user: AuthUser
): string | null {
  const userWithSSO = user as AuthUser & {
    sso_provider?: string;
    connection_id?: string;
  };
  
  // Return SSO provider name or connection ID if available
  return userWithSSO.sso_provider || userWithSSO.connection_id || null;
}

/**
 * Get SAML attributes from user object
 * These are typically set by the IdP during SSO authentication
 */
export function getSAMLAttributes(user: AuthUser): Record<string, unknown> {
  const samlAttributes: Record<string, unknown> = {};

  // Extract common SAML attributes if present
  const userWithSAML = user as AuthUser & {
    saml_session_index?: string;
    saml_name_id?: string;
    saml_name_id_format?: string;
    saml_attributes?: Record<string, unknown>;
  };

  if (userWithSAML.saml_session_index) {
    samlAttributes.session_index = userWithSAML.saml_session_index;
  }
  if (userWithSAML.saml_name_id) {
    samlAttributes.name_id = userWithSAML.saml_name_id;
  }
  if (userWithSAML.saml_name_id_format) {
    samlAttributes.name_id_format = userWithSAML.saml_name_id_format;
  }
  if (userWithSAML.saml_attributes) {
    Object.assign(samlAttributes, userWithSAML.saml_attributes);
  }

  return samlAttributes;
}

/**
 * Check if SSO is enabled for the organization
 * This checks environment configuration
 */
export function isSSOEnabled(): boolean {
  return process.env.ENABLE_SSO === "true";
}

/**
 * Get SSO configuration from environment
 */
export function getSSOConfig(): {
  enabled: boolean;
  samlEnabled: boolean;
  oidcEnabled: boolean;
} {
  return {
    enabled: isSSOEnabled(),
    samlEnabled: process.env.ENABLE_SAML === "true",
    oidcEnabled: process.env.ENABLE_OIDC === "true",
  };
}

