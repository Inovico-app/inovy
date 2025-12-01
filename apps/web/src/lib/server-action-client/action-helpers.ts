import type { BetterAuthUser } from "../better-auth-session";
import { ActionErrors } from "./action-errors";

export function getUserOrganizationId(user: NonNullable<BetterAuthUser>, organizationId?: string) {
  if (!organizationId) {
    throw ActionErrors.internal(
      "Failed to get user's organization ID from context",
      { userId: user.id },
      "get-user-organization-id"
    );
  }
  return organizationId;
}

export function checkUserAuthentication(user: NonNullable<BetterAuthUser>) {
  if (!user) {
    throw ActionErrors.unauthenticated(
      "User not authenticated",
      "check-user-authentication"
    );
  }
}

