import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangleIcon } from "lucide-react";
import { useTranslations } from "next-intl";

interface AgentDisabledBannerProps {
  organizationName?: string;
  className?: string;
}

export function AgentDisabledBanner({
  organizationName: _organizationName,
  className,
}: AgentDisabledBannerProps) {
  const t = useTranslations("agentDisabled");

  return (
    <Alert variant="destructive" className={className}>
      <AlertTriangleIcon className="h-4 w-4" />
      <AlertTitle>{t("title")}</AlertTitle>
      <AlertDescription>
        {t("description")} {t("details")}
      </AlertDescription>
    </Alert>
  );
}
