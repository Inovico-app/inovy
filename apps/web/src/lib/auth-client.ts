"use client";

import { passkeyClient } from "@better-auth/passkey/client";
import {
  magicLinkClient,
  organizationClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { ac, roleMapping, roles } from "./auth/access-control";

/**
 * Better Auth client instance
 *
 * This client is used for all client-side authentication operations.
 * Plugins are configured to match the server-side configuration.
 * Uses 'better-auth/react' for React hooks support (useSession, etc.)
 */
export const authClient = createAuthClient({
  baseURL:
    process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : process.env.NEXT_PUBLIC_APP_URL,
  plugins: [
    magicLinkClient(),
    passkeyClient(),
    organizationClient({
      // Access control configuration - must match server configuration
      ac,
      roles: {
        // Map Better Auth organization roles to application roles
        owner: roleMapping.owner,
        admin: roleMapping.admin,
        // Also include application-specific roles
        superadmin: roles.superadmin,
        manager: roles.manager,
        user: roles.user,
        viewer: roles.viewer,
      },
    }),
  ],
});

// Export commonly used hooks and methods for convenience
export const { useSession, signOut } = authClient;

