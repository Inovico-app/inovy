"use client";

import { useMemo } from "react";
import { useOrganizationMembers } from "./use-organization-members";

interface TaskAssigneeResult {
  assigneeDisplay: string | null;
  assigneeInitials: string | null;
  isLoading: boolean;
}

export function useTaskAssignee(
  assigneeId: string | null,
  assigneeName: string | null,
): TaskAssigneeResult {
  const { members, isLoading } = useOrganizationMembers();

  const result = useMemo(() => {
    const resolvedMember = assigneeId
      ? members.find((m) => m.id === assigneeId)
      : null;

    const display = resolvedMember ? resolvedMember.displayName : assigneeName;

    const initials = resolvedMember
      ? [resolvedMember.given_name?.[0], resolvedMember.family_name?.[0]]
          .filter(Boolean)
          .join("")
          .toUpperCase()
      : assigneeName
        ? assigneeName
            .split(/\s+/)
            .map((w) => w[0])
            .join("")
            .toUpperCase()
            .slice(0, 2)
        : null;

    return { assigneeDisplay: display, assigneeInitials: initials };
  }, [assigneeId, assigneeName, members]);

  return { ...result, isLoading };
}
