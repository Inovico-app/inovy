import { registerWorksCouncilApproval } from "@/features/admin/actions/works-council-actions";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function useRegisterWorksCouncilApproval(onReset?: () => void) {
  const router = useRouter();

  const { execute, isExecuting } = useAction(registerWorksCouncilApproval, {
    onSuccess: () => {
      toast.success("OR-goedkeuring geregistreerd");
      onReset?.();
      router.refresh();
    },
    onError: ({ error }) => {
      toast.error(
        error.serverError || "Registratie van OR-goedkeuring mislukt",
      );
    },
  });

  return {
    registerApproval: execute,
    isRegistering: isExecuting,
  };
}
