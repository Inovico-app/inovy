import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getOrCreateMeeting } from "../actions/meeting-actions";

interface UseNavigateToMeetingOptions {
  onBeforeNavigate?: () => void;
}

export function useNavigateToMeeting(
  options?: UseNavigateToMeetingOptions
) {
  const router = useRouter();

  const { execute, isExecuting, reset } = useAction(getOrCreateMeeting, {
    onSuccess: ({ data }) => {
      if (!data?.meetingId) return;
      options?.onBeforeNavigate?.();
      // Use replace so navigating back doesn't restore stale action state
      router.replace(`/meetings/${data.meetingId}/prep`);
      // Reset action state to prevent re-triggering on component remount
      reset();
    },
    onError: ({ error }) => {
      toast.error(error.serverError || "Failed to open meeting");
    },
  });

  return {
    navigateToMeeting: execute,
    isNavigating: isExecuting,
  };
}
