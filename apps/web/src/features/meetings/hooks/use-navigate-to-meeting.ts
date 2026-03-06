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

  const { execute, isExecuting } = useAction(getOrCreateMeeting, {
    onSuccess: ({ data }) => {
      if (!data?.meetingId) return;
      options?.onBeforeNavigate?.();
      router.push(`/meetings/${data.meetingId}/prep`);
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
