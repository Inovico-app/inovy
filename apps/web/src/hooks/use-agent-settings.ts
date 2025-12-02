import { updateAgentSettings } from "@/features/admin/actions/update-agent-settings";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";

export function useAgentSettings() {
  const { execute, status } = useAction(updateAgentSettings, {
    onSuccess: ({ data }) => {
      if (
        data &&
        typeof data === "object" &&
        "success" in data &&
        data.success
      ) {
        toast.success("Agent settings updated successfully");
      }
    },
    onError: ({ error }) => {
      toast.error(error.serverError || "Failed to update agent settings");
    },
  });

  return {
    updateAgentSettings: execute,
    isPending: status === "executing",
  };
}

