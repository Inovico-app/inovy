import { redirect } from "next/navigation";
import { getBetterAuthSession } from "@/lib/better-auth-session";
import type { BetterAuthMember } from "@/lib/better-auth-session";
import type { BetterAuthUser } from "@/lib/auth";
import type { PermissionPredicate } from "./predicates";
import type { Role, PermissionSubject, PermissionContext } from "./types";

export interface GuardedSession {
  subject: PermissionSubject;
  user: BetterAuthUser;
  member: BetterAuthMember;
  organizationId: string;
  userTeamIds: string[];
}

export async function requirePermission(
  predicate: PermissionPredicate,
  context?: PermissionContext,
): Promise<GuardedSession> {
  const sessionResult = await getBetterAuthSession();

  if (sessionResult.isErr() || !sessionResult.value.isAuthenticated) {
    redirect("/sign-in");
  }

  const { user, member, organization, userTeamIds } = sessionResult.value;

  if (!user || !member || !organization) {
    redirect("/sign-in");
  }

  const subject: PermissionSubject = {
    role: member.role as Role,
    userId: user.id,
  };

  const allowed = await predicate.resolve(subject, {
    organizationId: organization.id,
    ...context,
  });

  if (!allowed) {
    redirect("/");
  }

  return {
    subject,
    user,
    member,
    organizationId: organization.id,
    userTeamIds,
  };
}
