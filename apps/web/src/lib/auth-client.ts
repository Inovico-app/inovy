"use client";

import { passkeyClient } from "@better-auth/passkey/client";
import { stripeClient } from "@better-auth/stripe/client";
import { createAuthClient } from "better-auth/react";
import {
  magicLinkClient,
  organizationClient,
} from "better-auth/client/plugins";

/**
 * Better Auth client instance
 *
 * This client is used for all client-side authentication operations.
 * Plugins are configured to match the server-side configuration.
 * Uses 'better-auth/react' for React hooks support (useSession, etc.)
 */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  plugins: [
    magicLinkClient(),
    passkeyClient(),
    stripeClient({ subscription: true }),
    organizationClient(),
  ],
});

// Export commonly used hooks and methods for convenience
export const { useSession, signOut } = authClient;

