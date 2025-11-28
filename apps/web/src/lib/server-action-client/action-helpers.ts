import type { AuthUser } from "../auth/auth-helpers";
import { ActionErrors } from "./action-errors";

export function getUserOrganizationCode(user: NonNullable<AuthUser>) {
  if (!user?.organization_code) {
    throw ActionErrors.internal(
      "Failed to get user's organization code from context",
      { userId: user.id },
      "get-user-organization-code"
    );
  }
  return user.organization_code;
}

export function checkUserAuthentication(user: NonNullable<AuthUser>) {
  if (!user) {
    throw ActionErrors.unauthenticated(
      "User or organization code not found",
      "check-user-authentication"
    );
  }
}

