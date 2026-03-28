import { useAction } from "next-safe-action/hooks";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cancelOrganizationDeletion } from "../actions/cancel-organization-deletion";

export function useCancelOrganizationDeletion() {
  const t = useTranslations("settings");
  const router = useRouter();

  return useAction(cancelOrganizationDeletion, {
    onSuccess: () => {
      toast.success(t("deleteOrg.cancelledSuccess"));
      router.refresh();
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? t("deleteOrg.cancelFailed"));
    },
  });
}
