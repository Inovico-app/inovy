"use client";

import { useAction } from "next-safe-action/hooks";
import { setActiveTeamAction } from "@/features/teams/actions/set-active-team";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function useTeamSwitcher() {
  const router = useRouter();

  const { execute, isExecuting } = useAction(setActiveTeamAction, {
    onSuccess: () => {
      router.refresh();
    },
    onError: ({ error }) => {
      toast.error(error.serverError || "Failed to switch team");
    },
  });

  const switchTeam = (teamId: string | null) => {
    execute({ teamId });
  };

  return {
    switchTeam,
    isSwitching: isExecuting,
  };
}
