"use client";

import {
  listUserTeamsAction,
  type UserTeam,
} from "@/features/teams/actions/list-user-teams";
import { queryKeys } from "@/lib/query-keys";
import { useQuery } from "@tanstack/react-query";

interface UserTeamsQueryData {
  teams: UserTeam[];
  activeTeamId: string | null;
}

export async function fetchUserTeams(): Promise<UserTeamsQueryData> {
  const result = await listUserTeamsAction({});
  const data = result?.data;
  if (data && "teams" in data && "activeTeamId" in data) {
    return data as UserTeamsQueryData;
  }
  return { teams: [], activeTeamId: null };
}

/**
 * Hook that fetches the current user's teams and active team context for use in
 * forms that support team scoping.
 */
export function useTeamPicker() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.auth.userTeams(),
    queryFn: fetchUserTeams,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const teams = data?.teams ?? [];
  const activeTeamId = data?.activeTeamId ?? null;

  return { teams, activeTeamId, isLoading };
}
